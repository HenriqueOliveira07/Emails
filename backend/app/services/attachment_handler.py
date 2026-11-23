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
from app.utils.timeutils import to_local

logger = structlog.get_logger(__name__)

ALLOWED_EXTENSIONS = {
    ".pdf", ".xlsx", ".xls", ".docx", ".doc",
    ".csv", ".zip", ".xml", ".txt",
    ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tif", ".tiff", ".webp", ".heic",
}

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tif", ".tiff", ".webp"}

DANGEROUS_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".sh", ".ps1", ".vbs", ".vbe", ".wsf", ".wsh",
    ".js", ".jse", ".jar", ".msi", ".msp", ".scr", ".pif", ".com", ".cpl",
    ".hta", ".lnk", ".iso", ".img", ".dll", ".reg", ".appx", ".msix",
    ".docm", ".xlsm", ".pptm", ".dotm", ".xltm",
}

# Assinaturas de executáveis: um "fatura.pdf" que começa com MZ é um .exe disfarçado
EXECUTABLE_MAGIC = (b"MZ", b"\x7fELF", b"#!", b"\xca\xfe\xba\xbe")

# Assinaturas esperadas por extensão (verificação de conteúdo x extensão)
EXPECTED_MAGIC = {
    ".pdf": (b"%PDF",),
    ".png": (b"\x89PNG",),
    ".jpg": (b"\xff\xd8\xff",),
    ".jpeg": (b"\xff\xd8\xff",),
    ".gif": (b"GIF8",),
    ".zip": (b"PK",),
    ".xlsx": (b"PK",),
    ".docx": (b"PK",),
}


class AttachmentHandler:
    """Gerencia o salvamento e processamento de anexos de e-mail."""

    def __init__(self, base_path: Optional[str] = None) -> None:
        self._base = Path(base_path or settings.ATTACHMENTS_BASE_PATH)
        self._base.mkdir(parents=True, exist_ok=True)
        self._max_size_bytes = settings.MAX_ATTACHMENT_SIZE_MB * 1024 * 1024
        self.blocked: List[Dict[str, str]] = []

    def _build_path(self, email_data: Dict[str, Any]) -> Path:
        """Constrói o caminho de destino: /base/YYYY/MM/DD/Remetente/"""
        received_at: datetime = to_local(email_data.get("received_at"))
        sender_email: str = email_data.get("sender_email", "desconhecido")
        sender_name: str = email_data.get("sender_name", "")

        sender_label = sender_name if sender_name else sender_email.split("@")[0]
        sender_safe = self._sanitize_dirname(sender_label)

        path = (
            self._base
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
        short_hash = hashlib.md5(filename.encode()).hexdigest()[:6]
        new_name = f"{stem}_{short_hash}{suffix}"
        counter = 1
        while (directory / new_name).exists():
            new_name = f"{stem}_{short_hash}_{counter}{suffix}"
            counter += 1
        return new_name

    def _is_extension_allowed(self, filename: str) -> Tuple[bool, str]:
        """Verifica se a extensão é permitida (whitelist) e não é perigosa."""
        ext = Path(filename).suffix.lower()
        if ext in DANGEROUS_EXTENSIONS:
            return False, f"Extensão perigosa: {ext}"
        if ext not in ALLOWED_EXTENSIONS:
            return False, f"Extensão não permitida: {ext or '(sem extensão)'}"
        return True, ""

    @staticmethod
    def _inspect_content(filename: str, content: bytes) -> Tuple[bool, str]:
        """
        Controle de anexos maliciosos baseado no conteúdo:
        - executável disfarçado (assinatura MZ/ELF com extensão inocente)
        - extensão que não corresponde ao conteúdo (ex.: .pdf que não é PDF)
        - ZIP contendo executáveis ou arquivos com macro
        """
        ext = Path(filename).suffix.lower()
        head = content[:8]
        if any(head.startswith(sig) for sig in EXECUTABLE_MAGIC):
            return False, "Conteúdo executável disfarçado"
        expected = EXPECTED_MAGIC.get(ext)
        if expected and not any(head.startswith(sig) for sig in expected):
            return False, f"Conteúdo não corresponde à extensão {ext}"
        if ext == ".zip":
            import io
            import zipfile

            try:
                with zipfile.ZipFile(io.BytesIO(content)) as zf:
                    for name in zf.namelist():
                        inner_ext = Path(name).suffix.lower()
                        if inner_ext in DANGEROUS_EXTENSIONS:
                            return False, f"ZIP contém arquivo perigoso: {name}"
            except zipfile.BadZipFile:
                return False, "ZIP corrompido"
            except RuntimeError:
                # ZIP com senha: não dá para inspecionar, técnica comum de malware
                return False, "ZIP protegido por senha"
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
        dest_dir: Optional[Path] = None

        for att in attachments:
            # Itens de calendário/e-mails anexados (itemAttachment) não têm contentBytes
            if att.get("@odata.type", "").endswith("itemAttachment") or att.get("isInline"):
                continue
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
            if allowed:
                allowed, reason = self._inspect_content(original_name, content)
            if not allowed:
                logger.warning("attachment_blocked", filename=original_name, reason=reason)
                self.blocked.append({"filename": original_name, "reason": reason})
                continue

            if dest_dir is None:
                dest_dir = self._build_path(email_data)
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
