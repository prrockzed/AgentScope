"""Tests for all tool implementations."""

import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest

from app.tools.calculator import CalculatorTool
from app.tools.fetch_website import FetchWebsiteTool
from app.tools.file_reader import FileReaderTool


# ---------------------------------------------------------------------------
# CalculatorTool
# ---------------------------------------------------------------------------

class TestCalculatorTool:
    def setup_method(self):
        self.calc = CalculatorTool()

    def test_addition(self):
        assert self.calc.run(expression="3 + 4") == "7"

    def test_multiplication(self):
        assert self.calc.run(expression="6 * 7") == "42"

    def test_division(self):
        result = self.calc.run(expression="10 / 4")
        assert float(result) == pytest.approx(2.5)

    def test_power(self):
        assert self.calc.run(expression="2 ** 10") == "1024"

    def test_complex_expression(self):
        result = self.calc.run(expression="(3 + 5) * 2 - 4 / 2")
        assert float(result) == pytest.approx(14.0)

    def test_modulo(self):
        assert self.calc.run(expression="17 % 5") == "2"

    def test_division_by_zero(self):
        with pytest.raises(ValueError, match="Division by zero"):
            self.calc.run(expression="5 / 0")

    def test_invalid_input_empty(self):
        with pytest.raises(ValueError, match="expression must not be empty"):
            self.calc.run(expression="")

    def test_invalid_syntax(self):
        with pytest.raises(ValueError, match="Invalid expression syntax"):
            self.calc.run(expression="3 +* 4")

    def test_disallowed_construct(self):
        with pytest.raises(ValueError, match="disallowed construct"):
            self.calc.run(expression="__import__('os')")

    def test_name_property(self):
        assert self.calc.name == "calculator"


# ---------------------------------------------------------------------------
# FileReaderTool
# ---------------------------------------------------------------------------

class TestFileReaderTool:
    def setup_method(self):
        self.reader = FileReaderTool()

    def test_missing_file(self):
        with pytest.raises(FileNotFoundError, match="File not found"):
            self.reader.run(file_path="/nonexistent/path/file.txt")

    def test_unsupported_type(self):
        with tempfile.NamedTemporaryFile(suffix=".xyz", delete=False) as f:
            f.write(b"content")
            path = f.name
        try:
            with pytest.raises(ValueError, match="Unsupported file type"):
                self.reader.run(file_path=path)
        finally:
            os.unlink(path)

    def test_read_txt(self):
        content = "Hello from text file"
        with tempfile.NamedTemporaryFile(
            suffix=".txt", mode="w", delete=False, encoding="utf-8"
        ) as f:
            f.write(content)
            path = f.name
        try:
            result = self.reader.run(file_path=path)
            assert result == content
        finally:
            os.unlink(path)

    def test_read_md(self):
        content = "# Heading\n\nSome markdown content."
        with tempfile.NamedTemporaryFile(
            suffix=".md", mode="w", delete=False, encoding="utf-8"
        ) as f:
            f.write(content)
            path = f.name
        try:
            result = self.reader.run(file_path=path)
            assert "Heading" in result
            assert "markdown content" in result
        finally:
            os.unlink(path)

    def test_empty_file_path(self):
        with pytest.raises(ValueError, match="file_path must not be empty"):
            self.reader.run(file_path="")

    def test_name_property(self):
        assert self.reader.name == "file_reader"


# ---------------------------------------------------------------------------
# FetchWebsiteTool
# ---------------------------------------------------------------------------

class TestFetchWebsiteTool:
    def setup_method(self):
        self.fetcher = FetchWebsiteTool()

    def test_returns_page_text(self):
        mock_response = MagicMock()
        mock_response.text = (
            "<html><body><p>Hello world</p></body></html>"
        )
        mock_response.raise_for_status = MagicMock()

        with patch("app.tools.fetch_website.requests.get", return_value=mock_response):
            result = self.fetcher.run(url="http://example.com")

        assert "Hello world" in result

    def test_strips_script_tags(self):
        mock_response = MagicMock()
        mock_response.text = (
            "<html><body>"
            "<script>alert('xss')</script>"
            "<p>Safe content</p>"
            "</body></html>"
        )
        mock_response.raise_for_status = MagicMock()

        with patch("app.tools.fetch_website.requests.get", return_value=mock_response):
            result = self.fetcher.run(url="http://example.com")

        assert "alert" not in result
        assert "Safe content" in result

    def test_strips_style_tags(self):
        mock_response = MagicMock()
        mock_response.text = (
            "<html><head><style>body { color: red; }</style></head>"
            "<body><p>Visible text</p></body></html>"
        )
        mock_response.raise_for_status = MagicMock()

        with patch("app.tools.fetch_website.requests.get", return_value=mock_response):
            result = self.fetcher.run(url="http://example.com")

        assert "color" not in result
        assert "Visible text" in result

    def test_empty_url(self):
        with pytest.raises(ValueError, match="url must not be empty"):
            self.fetcher.run(url="")

    def test_name_property(self):
        assert self.fetcher.name == "fetch_website"
