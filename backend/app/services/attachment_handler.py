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
    ".csv", ".zip", ".jpg", ".jpeg", ".png",
    ".gif", ".bmp", ".tif", ".tiff", ".webp",
    ".xml", ".txt",
}

# Assinaturas (magic bytes) esperadas por extensão. Arquivo cujo conteúdo não
# bate com a extensão declarada é bloqueado (ex.: executável renomeado .pdf).
MAGIC_SIGNATURES = {
    ".pdf": (b"%PDF",),
    ".zip": (b"PK\x03\x04", b"PK\x05\x06"),
    ".xlsx": (b"PK\x03\x04",),
    ".docx": (b"PK\x03\x04",),
    ".xls": (b"\xd0\xcf\x11\xe0",),
    ".doc": (b"\xd0\xcf\x11\xe0",),
    ".png": (b"\x89PNG",),
    ".jpg": (b"\xff\xd8\xff",),
    ".jpeg": (b"\xff\xd8\xff",),
    ".gif": (b"GIF87a", b"GIF89a"),
    ".bmp": (b"BM",),
    ".tif": (b"II*\x00", b"MM\x00*"),
    ".tiff": (b"II*\x00", b"MM\x00*"),
}

# Cabeçalhos de executáveis: bloqueados qualquer que seja a extensão
EXECUTABLE_SIGNATURES = (b"MZ", b"\x7fELF", b"#!")

DANGEROUS_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".sh", ".ps1", ".vbs",
    ".js", ".jar", ".msi", ".scr", ".pif", ".com",
}


class AttachmentHandler:
    """Gerencia o salvamento e processamento de anexos de e-mail."""

    def __init__(self, base_path: Optional[str] = None) -> None:
        self._base = Path(base_path or settings.ATTACHMENTS_BASE_PATH)
        self._base.mkdir(parents=True, exist_ok=True)
        self._max_size_bytes = settings.MAX_ATTACHMENT_SIZE_MB * 1024 * 1024

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
        safe = re.sub(r"\s+", "_", safe.strip(". "))  # "Fornecedor X" -> "Fornecedor_X"
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
        """Verifica se a extensão é permitida e não é perigosa (inclui dupla extensão)."""
        suffixes = [s.lower() for s in Path(filename).suffixes]
        if any(s in DANGEROUS_EXTENSIONS for s in suffixes):
            return False, f"Extensão perigosa: {''.join(suffixes)}"
        ext = Path(filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            return False, f"Tipo não permitido: {ext or '(sem extensão)'}"
        return True, ""

    @staticmethod
    def _content_matches(filename: str, content: bytes) -> Tuple[bool, str]:
        """Confere magic bytes contra a extensão declarada."""
        head = content[:16]
        if head.startswith(EXECUTABLE_SIGNATURES):
            return False, "Conteúdo executável disfarçado"
        expected = MAGIC_SIGNATURES.get(Path(filename).suffix.lower())
        if expected and not head.startswith(expected):
            return False, "Conteúdo não corresponde à extensão"
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
            # Item anexado (e-mail encaminhado) ou link de nuvem não trazem bytes
            odata_type = att.get("@odata.type", "#microsoft.graph.fileAttachment")
            if odata_type != "#microsoft.graph.fileAttachment":
                logger.info("attachment_skipped_type", type=odata_type)
                continue
            # Imagens embutidas na assinatura (logos) não são anexos reais
            if att.get("isInline") and str(att.get("contentType", "")).startswith("image/"):
                continue

            original_name = att.get("name") or "arquivo_sem_nome"
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

            ok, reason = self._content_matches(original_name, content)
            if not ok:
                logger.warning("attachment_blocked", filename=original_name, reason=reason)
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
            elif ext in {".jpg", ".jpeg", ".png", ".gif"}:
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
