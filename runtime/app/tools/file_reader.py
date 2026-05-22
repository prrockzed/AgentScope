import os
from typing import Any

from app.tools.base import BaseTool

_BINARY_EXTENSIONS = {
    ".pyc", ".class", ".o", ".so", ".dll", ".pyo", ".exe", ".bin",
    ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".ico", ".svg",
    ".zip", ".tar", ".gz", ".bz2", ".xz", ".7z",
    ".mp3", ".mp4", ".wav", ".avi", ".mov",
    ".woff", ".woff2", ".ttf", ".eot",
}
_MAX_CHARS = 10000


class FileReaderTool(BaseTool):
    @property
    def name(self) -> str:
        return "file_reader"

    @property
    def description(self) -> str:
        return (
            "Reads the text content of a local file (source code, configs, docs, etc.). "
            "Input: path (required) — absolute or relative path to the file."
        )

    def run(self, path: str = "", **kwargs: Any) -> str:
        # Accept both 'path' and legacy 'file_path' kwarg
        file_path: str = path or kwargs.get("file_path", "")
        if not file_path or not file_path.strip():
            raise ValueError("file_path must not be empty")

        file_path = file_path.strip()

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        _, ext = os.path.splitext(file_path)
        ext = ext.lower()

        if ext == ".pdf":
            return self._read_pdf(file_path)

        if ext in _BINARY_EXTENSIONS:
            raise ValueError(f"Binary file type '{ext}' cannot be read as text")

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
        except UnicodeDecodeError:
            with open(file_path, "r", encoding="latin-1") as f:
                content = f.read()

        return content[:_MAX_CHARS]

    def _read_pdf(self, file_path: str) -> str:
        import pymupdf  # fitz

        doc = pymupdf.open(file_path)
        pages_text = []
        for page in doc:
            pages_text.append(page.get_text())
        doc.close()

        return "".join(pages_text)[:_MAX_CHARS]
