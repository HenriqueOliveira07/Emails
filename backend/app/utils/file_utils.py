"""
Utilitários para manipulação de arquivos e diretórios.
"""
import os
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List


def ensure_dir(path: str | Path) -> Path:
    """Cria diretório se não existir e retorna Path."""
    p = Path(path)
    p.mkdir(parents=True, exist_ok=True)
    return p


def get_dir_size_mb(path: str | Path) -> float:
    """Retorna tamanho total de um diretório em MB."""
    total = 0
    for dirpath, _, filenames in os.walk(path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            if os.path.isfile(fp):
                total += os.path.getsize(fp)
    return total / (1024 * 1024)


def list_recent_files(base_path: str | Path, days: int = 7) -> List[Path]:
    """Lista arquivos modificados nos últimos N dias."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    files = []
    for dirpath, _, filenames in os.walk(base_path):
        for f in filenames:
            fp = Path(dirpath) / f
            mtime = datetime.fromtimestamp(fp.stat().st_mtime, tz=timezone.utc)
            if mtime >= cutoff:
                files.append(fp)
    return files


def cleanup_empty_dirs(base_path: str | Path) -> int:
    """Remove diretórios vazios recursivamente. Retorna quantos foram removidos."""
    removed = 0
    for dirpath, dirnames, filenames in os.walk(str(base_path), topdown=False):
        if dirpath == str(base_path):
            continue
        if not os.listdir(dirpath):
            try:
                os.rmdir(dirpath)
                removed += 1
            except OSError:
                pass
    return removed


def human_readable_size(size_bytes: int) -> str:
    """Converte bytes para string legível."""
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} PB"
