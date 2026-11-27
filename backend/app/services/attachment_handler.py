"""
Salvamento automático de anexos de e-mail com organização por data/remetente.
Suporte a OCR, extração de PDF e detecção básica de conteúdo malicioso.
"""
import base64
import hashlib
import mimetypes
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import aiofiles
import structlog

from app.config import settings

logger = structlog.get_logger(__name__)

ROOT_FOLDER = "Emails_Importantes"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tif", ".tiff", ".webp"}

ALLOWED_EXTENSIONS = {
    ".pdf", ".xlsx", ".xls", ".docx", ".doc",
    ".csv", ".zip", ".xml", ".txt",
} | IMAGE_EXTENSIONS

DANGEROUS_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".sh", ".ps1", ".vbs", ".vbe", ".wsf", ".hta",
    ".js", ".jse", ".jar", ".msi", ".scr", ".pif", ".com", ".dll", ".lnk",
    ".iso", ".img", ".docm", ".xlsm", ".pptm",
}

# Assinaturas de executáveis (PE/Windows, ELF/Linux, Mach-O)
EXECUTABLE_MAGIC = (b"MZ", b"\x7fELF", b"\xcf\xfa\xed\xfe", b"\xfe\xed\xfa\xce")


class AttachmentHandler:
    """Gerencia o salvamento e processamento de anexos de e-mail."""

    def __init__(self, base_path: Optional[str] = None) -> None:
        self._base = Path(base_path or settings.ATTACHMENTS_BASE_PATH)
        self._base.mkdir(parents=True, exist_ok=True)
        self._max_size_bytes = settings.MAX_ATTACHMENT_SIZE_MB * 1024 * 1024

    def _build_path(self, email_data: Dict[str, Any]) -> Path:
        """Constrói o caminho de destino: /base/YYYY/MM/DD/Remetente/"""
        received_at: datetime = email_data.get("received_at") or datetime.now(timezone.utc)
        sender_email: str = email_data.get("sender_email", "desconhecido")
        sender_name: str = email_data.get("sender_name", "")

        sender_label = sender_name if sender_name else sender_email.split("@")[0]
        sender_safe = self._sanitize_dirname(sender_label)

        path = (
            self._base
            / ROOT_FOLDER
            / str(received_at.year)
            / f"{received_at.month:02d}"
            / f"{received_at.day:02d}"
            / sender_safe
        )
        path.mkdir(parents=True, exist_ok=True)
        return path

    @staticmethod
    def _sanitize_dirname(name: str) -> str:
        """Remove caracteres inválidos de nomes de diretório."""
        safe = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name)
        safe = safe.strip(". ")
        return safe[:80] or "desconhecido"

    @staticmethod
    def _sanitize_filename(name: str) -> str:
        """Sanitiza nome de arquivo removendo caracteres problemáticos."""
        safe = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name)
        safe = safe.strip(". ")
        return safe[:200] or "arquivo"

    def _unique_filename(self, directory: Path, filename: str) -> str:
        """Garante unicidade adicionando hash ao nome se necessário."""
        target = directory / filename
        if not target.exists():
            return filename

        stem = Path(filename).stem
        suffix = Path(filename).suffix
        short_hash = hashlib.sha256(filename.encode()).hexdigest()[:6]
        new_name = f"{stem}_{short_hash}{suffix}"
        counter = 1
        while (directory / new_name).exists():
            new_name = f"{stem}_{short_hash}_{counter}{suffix}"
            counter += 1
        return new_name

    def _is_extension_allowed(self, filename: str) -> Tuple[bool, str]:
        """Verifica se a extensão é permitida (allowlist) e não é perigosa."""
        name = filename.lower()
        ext = Path(name).suffix
        # Dupla extensão disfarçada: "fatura.pdf.exe" ou "nota.exe.pdf"
        for part in Path(name).suffixes:
            if part in DANGEROUS_EXTENSIONS:
                return False, f"Extensão perigosa: {part}"
        if ext not in ALLOWED_EXTENSIONS:
            return False, f"Tipo não permitido: {ext or '(sem extensão)'}"
        return True, ""

    @staticmethod
    def _scan_content(filename: str, content: bytes) -> Tuple[bool, str]:
        """Inspeção leve de conteúdo malicioso (não substitui um antivírus)."""
        if content[:4].startswith(EXECUTABLE_MAGIC):
            return False, "Conteúdo executável disfarçado"
        if Path(filename).suffix.lower() == ".zip":
            import io
            import zipfile

            try:
                with zipfile.ZipFile(io.BytesIO(content)) as zf:
                    total = 0
                    for info in zf.infolist():
                        inner = info.filename.lower()
                        if any(sfx in DANGEROUS_EXTENSIONS for sfx in Path(inner).suffixes):
                            return False, f"ZIP contém arquivo perigoso: {info.filename}"
                        if inner.startswith("/") or ".." in Path(inner).parts:
                            return False, "ZIP com caminho inválido (path traversal)"
                        total += info.file_size
                    # Proteção contra zip bomb (> 100x o tamanho máximo permitido)
                    if total > settings.MAX_ATTACHMENT_SIZE_MB * 1024 * 1024 * 100:
                        return False, "ZIP com descompactação excessiva (zip bomb)"
            except zipfile.BadZipFile:
                return False, "ZIP corrompido"
        return True, ""

    def _get_content_bytes(self, attachment: Dict[str, Any]) -> Optional[bytes]:
        """Extrai o conteúdo binário de um anexo da Graph API."""
        content_bytes = attachment.get("contentBytes")
        if content_bytes:
            try:
                return base64.b64decode(content_bytes)
            except Exception:
                return None
        return None

    async def save_attachments(
        self, email_data: Dict[str, Any], attachments: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Salva todos os anexos e retorna metadados de cada um.

        Returns:
            Lista de dicts com filename, file_path, file_size, file_type, ocr_text, pdf_text
        """
        saved = []
        dest_dir = self._build_path(email_data)

        for att in attachments:
            original_name = att.get("name", "arquivo_sem_nome")
            mime_type = att.get("contentType", "") or mimetypes.guess_type(original_name)[0] or ""
            content = self._get_content_bytes(att)

            if content is None:
                logger.warning("attachment_no_content", filename=original_name)
                continue

            if len(content) > self._max_size_bytes:
                logger.warning(
                    "attachment_too_large",
                    filename=original_name,
                    size_mb=len(content) / 1024 / 1024,
                )
                continue

            allowed, reason = self._is_extension_allowed(original_name)
            if not allowed:
                logger.warning("attachment_blocked", filename=original_name, reason=reason)
                continue

            clean, scan_reason = self._scan_content(original_name, content)
            if not clean:
                logger.warning("attachment_malicious", filename=original_name, reason=scan_reason)
                continue

            safe_name = self._sanitize_filename(original_name)
            unique_name = self._unique_filename(dest_dir, safe_name)
            file_path = dest_dir / unique_name

            async with aiofiles.open(file_path, "wb") as f:
                await f.write(content)

            ext = Path(original_name).suffix.lower()
            ocr_text = ""
            pdf_text = ""
            invoice_data: Dict = {}

            if ext == ".pdf":
                pdf_text = self._extract_pdf_text(file_path)
            elif ext == ".xml":
                # NF-e e afins: texto bruto para extração de dados financeiros
                pdf_text = content.decode("utf-8", errors="ignore")[:8000]
            elif ext in IMAGE_EXTENSIONS:
                ocr_text = self._ocr_image(file_path)

            logger.info(
                "attachment_saved",
                filename=unique_name,
                path=str(file_path),
                size_bytes=len(content),
            )

            saved.append({
                "filename": unique_name,
                "original_filename": original_name,
                "file_path": str(file_path),
                "file_size": len(content),
                "file_type": mime_type,
                "ocr_text": ocr_text,
                "pdf_text": pdf_text,
                "invoice_data": invoice_data,
                "is_malicious": False,
            })

        return saved

    @staticmethod
    def _extract_pdf_text(file_path: Path) -> str:
        """Extrai texto de PDF usando PyPDF2."""
        try:
            import PyPDF2  # type: ignore

            text_parts = []
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages[:20]:
                    text_parts.append(page.extract_text() or "")
            return "\n".join(text_parts)[:8000]
        except Exception as e:
            logger.warning("pdf_extraction_failed", path=str(file_path), error=str(e))
            return ""

    @staticmethod
    def _ocr_image(file_path: Path) -> str:
        """Executa OCR em imagem usando pytesseract."""
        try:
            import pytesseract  # type: ignore
            from PIL import Image  # type: ignore

            img = Image.open(file_path)
            text = pytesseract.image_to_string(img, lang="por+eng")
            return text[:4000]
        except Exception as e:
            logger.warning("ocr_failed", path=str(file_path), error=str(e))
            return ""
