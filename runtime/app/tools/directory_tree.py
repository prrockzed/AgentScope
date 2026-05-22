"""DirectoryTreeTool — recursively lists files in a directory as a tree."""

import os
from typing import Any

from app.tools.base import BaseTool

_IGNORE_DIRS = {
    '.git', 'node_modules', '__pycache__', '.next', 'target', 'build',
    'dist', '.gradle', '.idea', 'venv', '.venv', 'env', '.env',
    '.pytest_cache', '.mypy_cache', 'coverage', '.coverage',
}
_IGNORE_EXTS = {'.pyc', '.class', '.o', '.so', '.dll', '.pyo'}


class DirectoryTreeTool(BaseTool):

    @property
    def name(self) -> str:
        return "directory_tree"

    @property
    def description(self) -> str:
        return (
            "List all files and folders inside a directory recursively, "
            "shown as an indented tree. "
            "Input: path (required) — the directory to inspect; "
            "max_depth (optional, default 5) — how deep to recurse."
        )

    def run(self, path: str, max_depth: int = 5, **kwargs: Any) -> str:
        if not os.path.exists(path):
            return f"Path not found: {path}"
        if not os.path.isdir(path):
            return f"Not a directory: {path}"

        lines: list[str] = [f"{os.path.abspath(path)}/"]
        file_count = 0
        MAX_ENTRIES = 300

        def _walk(current: str, prefix: str, depth: int) -> None:
            nonlocal file_count
            if depth > max_depth or file_count >= MAX_ENTRIES:
                return
            try:
                raw = sorted(os.listdir(current))
            except PermissionError:
                return

            dirs = [
                e for e in raw
                if os.path.isdir(os.path.join(current, e)) and e not in _IGNORE_DIRS
            ]
            files = [
                e for e in raw
                if os.path.isfile(os.path.join(current, e))
                and not any(e.endswith(x) for x in _IGNORE_EXTS)
            ]
            entries = dirs + files

            for i, entry in enumerate(entries):
                if file_count >= MAX_ENTRIES:
                    lines.append(f"{prefix}... (limit reached)")
                    return
                is_last = i == len(entries) - 1
                connector = "└── " if is_last else "├── "
                lines.append(f"{prefix}{connector}{entry}")
                file_count += 1
                if entry in dirs:
                    ext = "    " if is_last else "│   "
                    _walk(os.path.join(current, entry), prefix + ext, depth + 1)

        _walk(path, "", 1)
        lines.append(f"\n({file_count} entries listed)")
        return "\n".join(lines)
