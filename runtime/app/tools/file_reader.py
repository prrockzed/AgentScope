import os
from typing import Any

from app.tools.base import BaseTool

_SUPPORTED_EXTENSIONS = {".txt", ".md", ".pdf"}
_MAX_CHARS = 10000


class FileReaderTool(BaseTool):
    @property
    def name(self) -> str:
        return "file_reader"

    @property
    def description(self) -> str:
        return (
            "Reads the text content of a local file. "
            "Supports .txt, .md, and .pdf files. "
            "Input: {'file_path': '<absolute or relative path to file>'}"
        )

    def run(self, **kwargs: Any) -> str:
        file_path: str = kwargs.get("file_path", "")
        if not file_path or not file_path.strip():
            raise ValueError("file_path must not be empty")

        file_path = file_path.strip()

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        _, ext = os.path.splitext(file_path)
        ext = ext.lower()

        if ext not in _SUPPORTED_EXTENSIONS:
            raise ValueError(
                f"Unsupported file type '{ext}'. Supported: {', '.join(sorted(_SUPPORTED_EXTENSIONS))}"
            )

        if ext == ".pdf":
            return self._read_pdf(file_path)

        with open(file_path, "r", encoding="utf-8") as f:
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
