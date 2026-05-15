from typing import Any

import requests
from bs4 import BeautifulSoup

from app.tools.base import BaseTool

_TIMEOUT = 15
_MAX_CHARS = 8000


class FetchWebsiteTool(BaseTool):
    @property
    def name(self) -> str:
        return "fetch_website"

    @property
    def description(self) -> str:
        return (
            "Fetches the text content of a web page. "
            "Strips scripts, styles, and HTML tags. "
            "Input: {'url': '<full URL>'}"
        )

    def run(self, **kwargs: Any) -> str:
        url: str = kwargs.get("url", "")
        if not url or not url.strip():
            raise ValueError("url must not be empty")

        response = requests.get(url.strip(), timeout=_TIMEOUT)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()

        text = soup.get_text(separator="\n", strip=True)
        lines = [line for line in text.splitlines() if line.strip()]
        cleaned = "\n".join(lines)

        return cleaned[:_MAX_CHARS]
