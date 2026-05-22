"""DataAnalyzerTool — reads a CSV or JSON file and computes comprehensive statistics."""

import csv
import json
import os
from collections import Counter
from typing import Any

from app.tools.base import BaseTool

_MAX_ROWS = 10_000


class DataAnalyzerTool(BaseTool):

    @property
    def name(self) -> str:
        return "data_analyzer"

    @property
    def description(self) -> str:
        return (
            "Read a CSV or JSON file and compute comprehensive statistics: "
            "row count, column names, data types, null counts, "
            "min/max/mean/median for numeric columns, top value counts "
            "for categorical columns, and sample rows. "
            "Input: path (required) — absolute or relative path to the .csv or .json file."
        )

    def run(self, path: str, **kwargs: Any) -> str:
        if not os.path.exists(path):
            return f"File not found: {path}"

        ext = os.path.splitext(path)[1].lower()
        if ext == ".csv":
            return self._analyze_csv(path)
        elif ext == ".json":
            return self._analyze_json(path)
        else:
            return f"Unsupported file type '{ext}'. Supported: .csv, .json"

    # ── Loaders ──────────────────────────────────────────────────────────────

    def _analyze_csv(self, path: str) -> str:
        rows: list[dict] = []
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            columns: list[str] = list(reader.fieldnames or [])
            for row in reader:
                rows.append(dict(row))
                if len(rows) >= _MAX_ROWS:
                    break
        return self._format(rows, columns, path, truncated=len(rows) >= _MAX_ROWS)

    def _analyze_json(self, path: str) -> str:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            data = json.load(f)

        if isinstance(data, list):
            rows = [r for r in data if isinstance(r, dict)][:_MAX_ROWS]
            columns = list(rows[0].keys()) if rows else []
        elif isinstance(data, dict):
            # Treat each top-level key as a column in a single-row dataset
            rows = [data]
            columns = list(data.keys())
        else:
            return f"Cannot analyse JSON of type {type(data).__name__} — expected list or object."

        return self._format(rows, columns, path, truncated=False)

    # ── Core stats formatter ─────────────────────────────────────────────────

    def _format(self, rows: list[dict], columns: list[str], path: str, truncated: bool) -> str:
        n = len(rows)
        lines: list[str] = [
            f"File      : {path}",
            f"Rows      : {n}" + (" (first 10 000 only)" if truncated else ""),
            f"Columns   : {len(columns)}",
            "",
        ]

        for col in columns:
            values = [row.get(col) for row in rows]
            str_vals = [str(v) for v in values if v is not None and str(v).strip() != ""]
            null_count = n - len(str_vals)

            lines.append(f"┌─ {col}")
            lines.append(f"│  nulls/empty : {null_count} / {n}")

            # Attempt numeric cast
            nums: list[float] = []
            for v in str_vals:
                try:
                    nums.append(float(v))
                except (ValueError, TypeError):
                    pass

            if len(nums) >= len(str_vals) * 0.75 and nums:
                sorted_n = sorted(nums)
                mid = len(sorted_n) // 2
                median = (
                    sorted_n[mid]
                    if len(sorted_n) % 2
                    else (sorted_n[mid - 1] + sorted_n[mid]) / 2
                )
                mean = sum(nums) / len(nums)
                lines.append(f"│  type        : numeric")
                lines.append(f"│  min         : {min(nums):.6g}")
                lines.append(f"│  max         : {max(nums):.6g}")
                lines.append(f"│  mean        : {mean:.6g}")
                lines.append(f"│  median      : {median:.6g}")
                # Rough std dev
                variance = sum((x - mean) ** 2 for x in nums) / len(nums)
                lines.append(f"│  std_dev     : {variance ** 0.5:.6g}")
            else:
                counter = Counter(str_vals)
                unique = len(counter)
                top5 = counter.most_common(5)
                lines.append(f"│  type        : categorical")
                lines.append(f"│  unique vals : {unique}")
                top_str = ", ".join(f"{v!r} ({c})" for v, c in top5)
                lines.append(f"│  top values  : {top_str}")

            lines.append("│")

        lines.append("Sample rows (first 5):")
        for row in rows[:5]:
            # Truncate very long values
            display = {k: (str(v)[:80] + "…" if len(str(v)) > 80 else v) for k, v in list(row.items())[:8]}
            lines.append(f"  {display}")

        return "\n".join(lines)
