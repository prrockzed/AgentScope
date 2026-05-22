"""Data Analyst — given a path to a CSV or JSON file, performs full
exploratory data analysis: computes comprehensive statistics, detects
outliers and anomalies, identifies correlations and patterns, and produces
a written EDA report with actionable insights.

Workflow
--------
  1. Data Loader       (TOOL) — reads file and computes raw statistics
  2. Stats Interpreter (LLM)  — interprets patterns in the raw stats
  3. Deep Analysis     (LLM)  — detects outliers, correlations, anomalies
  4. Report Writer     (LLM)  — produces the full EDA narrative report
"""

from __future__ import annotations

import re
import time
from typing import Any

from app.agents.registry import AgentDefinition, register
from app.llm import LiteLLMChat
from app.tools.data_analyzer import DataAnalyzerTool
from app.tracing.tracer import Tracer

_analyzer = DataAnalyzerTool()

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

_INTERPRETER_PROMPT = """\
You are a data analyst. You have computed the following raw statistics for a dataset.

Analysis goal: {task}

--- RAW STATISTICS ---
{raw_stats}
--- END STATISTICS ---

Interpret what these statistics reveal. Cover:

1. SHAPE & COMPLETENESS — how large is the dataset, which columns have missing data \
and how serious is that?
2. NUMERIC DISTRIBUTIONS — for each numeric column, what does the range/mean/median \
tell us? Are any distributions skewed or unusual?
3. CATEGORICAL PATTERNS — for categorical columns, is the data balanced or heavily \
skewed towards certain values?
4. INITIAL OBSERVATIONS — what stands out immediately as interesting or concerning?
5. DATA QUALITY ISSUES — duplicates likely? Inconsistent values? Columns that may \
need cleaning?

Be specific and reference the actual column names and values from the stats.
"""

_DEEP_ANALYSIS_PROMPT = """\
You are a data analyst performing deep exploratory analysis.

Analysis goal: {task}

Raw statistics:
{raw_stats}

Initial interpretation:
{interpretation}

Now go deeper. Analyse:

1. OUTLIERS & ANOMALIES — which columns likely have outliers based on the min/max \
vs mean/median spread? What might cause them?
2. CORRELATIONS & RELATIONSHIPS — which columns are likely correlated? What \
business or causal relationships might exist between variables?
3. SEGMENTATION OPPORTUNITIES — are there natural groupings in the data based on \
categorical columns or value clusters?
4. TIME SERIES (if applicable) — if any column looks like a date or timestamp, \
what temporal patterns might exist?
5. BUSINESS IMPLICATIONS — what do these patterns mean in real-world terms?
6. HYPOTHESES — propose 3 specific testable hypotheses suggested by the data.

Ground all observations in the actual statistics. Be specific.
"""

_REPORT_WRITER_PROMPT = """\
You are a senior data analyst writing an EDA report to be shared with stakeholders.

Analysis goal: {task}

Statistical summary:
{raw_stats}

Analytical findings:
{deep_analysis}

Write a complete EDA report using EXACTLY these sections:

## Executive Summary
2-3 sentences: what dataset is this, what is its size, and what is the single \
most important finding?

## Dataset Overview
- Source and format
- Dimensions (rows × columns)
- Column inventory with data types and completeness %

## Data Quality Assessment
Specific issues found: missing values, suspected outliers, inconsistencies, \
columns needing transformation.

## Univariate Analysis
Key findings for each important column — distributions, central tendency, spread.

## Multivariate Analysis
Relationships between columns — correlations, group differences, cross-tab insights.

## Outliers & Anomalies
Specific anomalous values or patterns identified, and likely explanations.

## Key Insights
Bullet points of the 5 most actionable insights from the data.

## Recommended Next Steps
What analyses, visualisations, or data cleaning steps should follow this EDA?

Use actual column names, numbers, and statistics throughout. Do not generalise.
"""

# ---------------------------------------------------------------------------
# Agent implementation
# ---------------------------------------------------------------------------


def _run(
    task: str,
    run_id: str,
    tracer: Tracer,
    llm: LiteLLMChat,
) -> dict[str, Any]:
    total_tokens = 0

    # Extract file path from the original task text only (strip knowledge context if present)
    _task_text = task.split("\n[Task]\n", 1)[-1] if "\n[Task]\n" in task else task
    path_match = re.search(r'(/[\w./\-_ ]+\.(?:csv|json)|[\w./\-_]+\.(?:csv|json))', _task_text, re.IGNORECASE)
    file_path = path_match.group().strip() if path_match else _task_text.strip()

    # ── Step 1: Data Loader ──────────────────────────────────────────────────
    t0 = time.time()
    raw_stats = _analyzer.run(path=file_path)
    load_latency = int((time.time() - t0) * 1000)

    failed = any(kw in raw_stats.lower() for kw in ("not found", "unsupported", "cannot"))
    tracer.emit(
        event_type="TOOL_CALL",
        status="FAILED" if failed else "SUCCESS",
        latency=load_latency,
        tool_name="data_analyzer",
        prompt=file_path,
        response=raw_stats[:500] + "…" if len(raw_stats) > 500 else raw_stats,
    )

    if failed:
        tracer.emit(event_type="RUN_COMPLETED", status="FAILED",
                    token_usage=total_tokens, response=raw_stats)
        return {"status": "FAILED", "final_output": raw_stats, "total_tokens": total_tokens, "error": "LOAD_FAILED"}

    # ── Step 2: Stats Interpreter ────────────────────────────────────────────
    interp_prompt = _INTERPRETER_PROMPT.format(task=task, raw_stats=raw_stats)
    t0 = time.time()
    interp_resp = llm.invoke([{"role": "user", "content": interp_prompt}])
    latency = int((time.time() - t0) * 1000)

    interpretation = interp_resp.content
    token_count = interp_resp.usage_metadata.get("total_tokens", 0)
    total_tokens += token_count

    tracer.emit(
        event_type="LLM_RESPONSE",
        status="SUCCESS",
        latency=latency,
        token_usage=token_count,
        prompt=interp_prompt[:400] + "…",
        response=interpretation,
    )

    # ── Step 3: Deep Analysis ────────────────────────────────────────────────
    deep_prompt = _DEEP_ANALYSIS_PROMPT.format(
        task=task, raw_stats=raw_stats, interpretation=interpretation
    )
    t0 = time.time()
    deep_resp = llm.invoke([{"role": "user", "content": deep_prompt}])
    latency = int((time.time() - t0) * 1000)

    deep_analysis = deep_resp.content
    token_count = deep_resp.usage_metadata.get("total_tokens", 0)
    total_tokens += token_count

    tracer.emit(
        event_type="LLM_RESPONSE",
        status="SUCCESS",
        latency=latency,
        token_usage=token_count,
        prompt=deep_prompt[:400] + "…",
        response=deep_analysis,
    )

    # ── Step 4: Report Writer ────────────────────────────────────────────────
    report_prompt = _REPORT_WRITER_PROMPT.format(
        task=task, raw_stats=raw_stats, deep_analysis=deep_analysis
    )
    t0 = time.time()
    report_resp = llm.invoke([{"role": "user", "content": report_prompt}])
    latency = int((time.time() - t0) * 1000)

    report = report_resp.content
    token_count = report_resp.usage_metadata.get("total_tokens", 0)
    total_tokens += token_count

    tracer.emit(
        event_type="LLM_RESPONSE",
        status="SUCCESS",
        latency=latency,
        token_usage=token_count,
        prompt=report_prompt[:400] + "…",
        response=report,
    )

    tracer.emit(
        event_type="RUN_COMPLETED",
        status="SUCCESS",
        token_usage=total_tokens,
        response=report,
    )

    return {"status": "SUCCESS", "final_output": report, "total_tokens": total_tokens, "error": None}


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

_DETAILS = {
    "steps": [
        {
            "name": "Data Loader",
            "eventType": "TOOL_CALL",
            "description": "Reads the CSV or JSON file and computes raw statistics: shape, null counts, numeric distributions, categorical top values, sample rows.",
            "prompt": None,
            "promptLabel": None,
            "tools": ["data_analyzer"],
            "conditional": False,
        },
        {
            "name": "Stats Interpreter",
            "eventType": "LLM_RESPONSE",
            "description": "Interprets the raw statistics — data completeness, distribution shapes, categorical balance, initial data quality issues.",
            "prompt": _INTERPRETER_PROMPT,
            "promptLabel": "Prompt Template",
            "tools": [],
            "conditional": False,
        },
        {
            "name": "Deep Analysis",
            "eventType": "LLM_RESPONSE",
            "description": "Goes deeper — detects outliers, correlations, segmentation opportunities, temporal patterns, business implications, and proposes hypotheses.",
            "prompt": _DEEP_ANALYSIS_PROMPT,
            "promptLabel": "Prompt Template",
            "tools": [],
            "conditional": False,
        },
        {
            "name": "Report Writer",
            "eventType": "LLM_RESPONSE",
            "description": "Produces the full EDA report: Dataset Overview, Data Quality, Univariate & Multivariate Analysis, Outliers, Key Insights, Recommended Next Steps.",
            "prompt": _REPORT_WRITER_PROMPT,
            "promptLabel": "Prompt Template",
            "tools": [],
            "conditional": False,
        },
        {
            "name": "Run Complete",
            "eventType": "RUN_COMPLETED",
            "description": "Returns the complete EDA report.",
            "prompt": None,
            "promptLabel": None,
            "tools": [],
            "conditional": False,
        },
    ],
    "toolsAvailable": ["data_analyzer"],
    "maxRetries": None,
    "retryNote": None,
    "workflowType": "sequential",
}

register(AgentDefinition(
    id="data_analyst",
    name="Data Analyst",
    description=(
        "Reads a CSV or JSON file, computes comprehensive statistics, detects outliers and "
        "correlations, and produces a full EDA report with data quality assessment and insights."
    ),
    run_fn=_run,
    details=_DETAILS,
))
