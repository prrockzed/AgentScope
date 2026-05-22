"""Research Analyst — given a research topic or question, systematically
fetches multiple authoritative sources, cross-references them for consensus
and conflicts, and produces a structured cited research report.

Workflow
--------
  1. URL Planner      (LLM)  — identifies 4-6 specific URLs to investigate
  2. Content Fetcher  (TOOL) — fetches each URL in sequence
  3. Synthesizer      (LLM)  — cross-references all content; flags consensus vs conflicts
  4. Report Writer    (LLM)  — produces a full structured report with citations
"""

from __future__ import annotations

import json
import re
import time
from typing import Any, Optional

from app.agents.registry import AgentDefinition, register
from app.llm import LiteLLMChat
from app.tools.fetch_website import FetchWebsiteTool
from app.tracing.tracer import Tracer

_fetcher = FetchWebsiteTool()
_MAX_URLS = 6
_CONTENT_TRUNCATE = 4000

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

_URL_PLANNER_PROMPT = """\
You are a senior research analyst. Your task is to identify the best online \
sources to research the topic below thoroughly.

Select 4-6 specific, authoritative URLs — prioritise official documentation, \
reputable encyclopaedias, well-known news outlets, academic sources, or \
official organisational pages. Avoid generic search engine URLs.

Research topic / question:
{task}

Respond ONLY with valid JSON (no markdown, no extra text):
{{"reasoning": "<why these sources answer the question>", "urls": ["<url1>", "<url2>", ...]}}
"""

_SYNTHESIZER_PROMPT = """\
You are a senior research analyst. You have retrieved content from {n} sources \
on the following research topic.

Research topic / question:
{task}

--- FETCHED SOURCES ---
{sources}
--- END SOURCES ---

Carefully analyse all content above. Produce a detailed synthesis covering:
1. CONSENSUS — facts/claims that appear consistently across sources
2. CONFLICTS — contradictions or disagreements between sources
3. KEY DATA POINTS — specific numbers, dates, names, statistics
4. GAPS — important aspects of the topic not covered by any source
5. SOURCE QUALITY — note if any source seemed unreliable or thin

Be specific. Quote or paraphrase directly from sources when relevant.
"""

_REPORT_WRITER_PROMPT = """\
You are a senior research analyst writing a final report.

Research topic / question:
{task}

Synthesis of sources:
{synthesis}

Write a complete, professional research report using EXACTLY these sections:

## Executive Summary
Two to three sentences summarising the core answer to the research question.

## Background
Relevant context, definitions, and history needed to understand the topic.

## Key Findings
Detailed bullet-point findings, each with a source citation as [Source: URL].

## Analysis
Deeper interpretation: trends, implications, cause-and-effect relationships, \
significance of the findings.

## Conflicting or Uncertain Areas
Where sources disagreed, where data was limited, or where more research is needed.

## Conclusion
A concise, direct answer to the research question based on the evidence gathered.

## Sources
Numbered list of all URLs that were successfully fetched.

Be factual, specific, and thorough. Do not fabricate citations.
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

    # ── Step 1: URL Planner ──────────────────────────────────────────────────
    planner_prompt = _URL_PLANNER_PROMPT.format(task=task)
    t0 = time.time()
    plan_resp = llm.invoke([{"role": "user", "content": planner_prompt}])
    latency = int((time.time() - t0) * 1000)

    plan_content = plan_resp.content
    token_count = plan_resp.usage_metadata.get("total_tokens", 0)
    total_tokens += token_count

    tracer.emit(
        event_type="LLM_RESPONSE",
        status="SUCCESS",
        latency=latency,
        token_usage=token_count,
        prompt=planner_prompt,
        response=plan_content,
    )

    # Parse URLs from planner response
    urls: list[str] = []
    json_match = re.search(r"\{.*\}", plan_content, re.DOTALL)
    if json_match:
        try:
            parsed = json.loads(json_match.group())
            urls = [u.strip().rstrip("\"',") for u in parsed.get("urls", [])]
        except json.JSONDecodeError:
            pass
    if not urls:
        urls = re.findall(r"https?://[^\s\"',\]]+", plan_content)
    urls = urls[:_MAX_URLS]

    # ── Step 2: Content Fetcher ──────────────────────────────────────────────
    fetched: list[dict[str, str]] = []

    for url in urls:
        t0 = time.time()
        try:
            content = _fetcher.run(url=url)
            fetch_latency = int((time.time() - t0) * 1000)
            if len(content) > _CONTENT_TRUNCATE:
                content = content[:_CONTENT_TRUNCATE] + "\n… [truncated]"
            fetched.append({"url": url, "content": content, "ok": "true"})
            tracer.emit(
                event_type="TOOL_CALL",
                status="SUCCESS",
                latency=fetch_latency,
                tool_name="fetch_website",
                prompt=url,
                response=content[:300] + "…" if len(content) > 300 else content,
            )
        except Exception as exc:
            fetch_latency = int((time.time() - t0) * 1000)
            fetched.append({"url": url, "content": "", "ok": "false"})
            tracer.emit(
                event_type="TOOL_CALL",
                status="FAILED",
                latency=fetch_latency,
                tool_name="fetch_website",
                prompt=url,
                response=str(exc),
            )

    successful = [f for f in fetched if f["ok"] == "true"]

    if not successful:
        tracer.emit(event_type="RUN_COMPLETED", status="FAILED",
                    token_usage=total_tokens, response="No sources could be fetched.")
        return {
            "status": "FAILED",
            "final_output": "No sources could be fetched for the given topic.",
            "total_tokens": total_tokens,
            "error": "ALL_FETCHES_FAILED",
        }

    # ── Step 3: Synthesizer ──────────────────────────────────────────────────
    sources_block = "\n\n".join(
        f"[Source {i+1}: {s['url']}]\n{s['content']}" for i, s in enumerate(successful)
    )
    synth_prompt = _SYNTHESIZER_PROMPT.format(
        n=len(successful), task=task, sources=sources_block
    )
    t0 = time.time()
    synth_resp = llm.invoke([{"role": "user", "content": synth_prompt}])
    latency = int((time.time() - t0) * 1000)

    synthesis = synth_resp.content
    token_count = synth_resp.usage_metadata.get("total_tokens", 0)
    total_tokens += token_count

    tracer.emit(
        event_type="LLM_RESPONSE",
        status="SUCCESS",
        latency=latency,
        token_usage=token_count,
        prompt=synth_prompt[:400] + "…",
        response=synthesis,
    )

    # ── Step 4: Report Writer ────────────────────────────────────────────────
    report_prompt = _REPORT_WRITER_PROMPT.format(task=task, synthesis=synthesis)
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
            "name": "URL Planner",
            "eventType": "LLM_RESPONSE",
            "description": "Identifies 4-6 authoritative URLs to investigate based on the research topic.",
            "prompt": _URL_PLANNER_PROMPT,
            "promptLabel": "Prompt Template",
            "tools": [],
            "conditional": False,
        },
        {
            "name": "Content Fetcher",
            "eventType": "TOOL_CALL",
            "description": "Fetches each planned URL and collects page content. Failed fetches are skipped.",
            "prompt": None,
            "promptLabel": None,
            "tools": ["fetch_website"],
            "conditional": False,
        },
        {
            "name": "Synthesizer",
            "eventType": "LLM_RESPONSE",
            "description": "Cross-references all fetched content — identifies consensus facts, contradictions, key data points, and gaps.",
            "prompt": _SYNTHESIZER_PROMPT,
            "promptLabel": "Prompt Template",
            "tools": [],
            "conditional": False,
        },
        {
            "name": "Report Writer",
            "eventType": "LLM_RESPONSE",
            "description": "Produces a full structured report: Executive Summary, Background, Key Findings, Analysis, Conflicts, Conclusion, Sources.",
            "prompt": _REPORT_WRITER_PROMPT,
            "promptLabel": "Prompt Template",
            "tools": [],
            "conditional": False,
        },
        {
            "name": "Run Complete",
            "eventType": "RUN_COMPLETED",
            "description": "Returns the final cited research report.",
            "prompt": None,
            "promptLabel": None,
            "tools": [],
            "conditional": False,
        },
    ],
    "toolsAvailable": ["fetch_website"],
    "maxRetries": None,
    "retryNote": None,
    "workflowType": "sequential",
}

register(AgentDefinition(
    id="research_analyst",
    name="Research Analyst",
    description=(
        "Fetches 4-6 authoritative web sources on a topic, cross-references them for "
        "consensus and conflicts, and produces a full structured research report with citations."
    ),
    run_fn=_run,
    details=_DETAILS,
))
