"""Competitive Intelligence — given a company or product name, identifies
key competitors, fetches their web pages, extracts pricing/features/positioning,
builds a comparison, and produces a strategic competitive landscape report.

Workflow
--------
  1. Competitor Identifier (LLM)  — identifies 4-5 competitors + their URLs
  2. Page Collector        (TOOL) — fetches main and pricing pages for each
  3. Feature Extractor     (LLM)  — extracts structured data per competitor
  4. Comparison Builder    (LLM)  — builds a side-by-side comparison table
  5. Report Writer         (LLM)  — produces the full competitive landscape report
"""

from __future__ import annotations

import json
import re
import time
from typing import Any

from app.agents.registry import AgentDefinition, register
from app.llm import LiteLLMChat
from app.tools.fetch_website import FetchWebsiteTool
from app.tracing.tracer import Tracer

_fetcher = FetchWebsiteTool()
_MAX_COMPETITORS = 5
_CONTENT_TRUNCATE = 3000

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

_COMPETITOR_PROMPT = """\
You are a competitive intelligence analyst. Your task is to identify the main \
competitors of the company or product below, and provide their key web page URLs.

Target company / product: {task}

Identify 4-5 direct competitors. For each competitor provide:
- Their main website URL
- Their pricing page URL (if known; use null if unsure)

Respond ONLY with valid JSON (no markdown):
{{
  "target": "<company/product name>",
  "competitors": [
    {{"name": "<competitor name>", "main_url": "<url>", "pricing_url": "<url or null>"}},
    ...
  ]
}}
"""

_FEATURE_EXTRACTOR_PROMPT = """\
You are a competitive intelligence analyst. You have fetched web content for \
competitor "{competitor_name}".

Target company / product: {target}

Fetched content:
{content}

Extract structured competitive intelligence for {competitor_name}:

1. PRODUCT/SERVICE — what exactly do they offer?
2. TARGET MARKET — who is their primary customer segment?
3. PRICING — specific pricing tiers, prices, and model (per seat, usage-based, etc.). \
   Write "Not found" if pricing page wasn't available.
4. KEY FEATURES — bullet list of their main features/capabilities
5. UNIQUE DIFFERENTIATORS — what makes them distinct from alternatives?
6. POSITIONING — how do they describe themselves? Premium, budget, enterprise, SMB?
7. WEAKNESSES — based on the content, what limitations or gaps are apparent?

Be specific. Extract actual numbers and feature names from the content.
"""

_COMPARISON_BUILDER_PROMPT = """\
You are a competitive intelligence analyst. You have extracted data for \
{n} competitors of {target}.

Target: {target}
Competitor profiles:
{profiles}

Build a comprehensive comparison. Cover:

1. FEATURE MATRIX — for the top 8-10 features, indicate which competitors \
   offer them (Yes / No / Partial)
2. PRICING COMPARISON — side-by-side pricing if available; note which is \
   cheapest/most expensive and value positioning
3. MARKET POSITIONING MAP — categorise each competitor on: \
   Enterprise vs SMB, Broad vs Niche, Premium vs Budget
4. STRENGTHS & WEAKNESSES TABLE — one row per competitor
5. COMPETITIVE GAPS — features or market segments none of the competitors \
   adequately address (opportunity areas for {target})
"""

_REPORT_WRITER_PROMPT = """\
You are a competitive intelligence analyst writing a strategic report.

Target company / product: {target}
Original task: {task}

Competitor profiles:
{profiles}

Comparison analysis:
{comparison}

Write a complete competitive intelligence report using EXACTLY these sections:

## Executive Summary
Which competitors pose the biggest threat and why, in 3 sentences.

## Market Overview
Size, growth, and key dynamics of the market {target} operates in.

## Competitor Profiles
For each competitor: a short paragraph covering their offering, pricing, \
target market, and key differentiator.

## Feature Comparison Matrix
A markdown table: rows = features, columns = competitors + a "{target}" column \
(mark it as "You" if you know the target's capabilities, otherwise leave blank).

## Pricing Landscape
Summary of pricing structures across competitors. Who is cheapest? \
Who is most expensive? What does pricing correlate with?

## Competitive Positioning
A narrative description of where each player sits in the market.

## Strategic Gaps & Opportunities
Specific opportunities — underserved segments, missing features, pricing gaps — \
that represent strategic openings.

## Recommendations
3-5 concrete, actionable recommendations for {target} based on this analysis.

## Sources
List all URLs fetched.
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

    # ── Step 1: Competitor Identifier ────────────────────────────────────────
    comp_prompt = _COMPETITOR_PROMPT.format(task=task)
    t0 = time.time()
    comp_resp = llm.invoke([{"role": "user", "content": comp_prompt}])
    latency = int((time.time() - t0) * 1000)

    comp_content = comp_resp.content
    token_count = comp_resp.usage_metadata.get("total_tokens", 0)
    total_tokens += token_count

    tracer.emit(
        event_type="LLM_RESPONSE",
        status="SUCCESS",
        latency=latency,
        token_usage=token_count,
        prompt=comp_prompt,
        response=comp_content,
    )

    # Parse competitor list
    target = task
    competitors: list[dict] = []
    json_match = re.search(r"\{.*\}", comp_content, re.DOTALL)
    if json_match:
        try:
            parsed = json.loads(json_match.group())
            target = parsed.get("target", task)
            competitors = parsed.get("competitors", [])
        except json.JSONDecodeError:
            pass
    competitors = competitors[:_MAX_COMPETITORS]

    # ── Step 2: Page Collector ───────────────────────────────────────────────
    # Fetch main + pricing page for each competitor
    fetched_per_competitor: dict[str, str] = {}

    for comp in competitors:
        name = comp.get("name", "Unknown")
        urls_to_fetch = [
            u for u in [comp.get("main_url"), comp.get("pricing_url")]
            if u and u != "null"
        ]
        combined_content = ""

        for url in urls_to_fetch:
            url = str(url).strip().rstrip("\"',")
            t0 = time.time()
            try:
                content = _fetcher.run(url=url)
                fetch_latency = int((time.time() - t0) * 1000)
                if len(content) > _CONTENT_TRUNCATE:
                    content = content[:_CONTENT_TRUNCATE] + "\n… [truncated]"
                combined_content += f"\n\n[Page: {url}]\n{content}"
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
                tracer.emit(
                    event_type="TOOL_CALL",
                    status="FAILED",
                    latency=fetch_latency,
                    tool_name="fetch_website",
                    prompt=url,
                    response=str(exc),
                )

        fetched_per_competitor[name] = combined_content.strip()

    # ── Step 3: Feature Extractor ────────────────────────────────────────────
    profiles: list[str] = []

    for comp in competitors:
        name = comp.get("name", "Unknown")
        content = fetched_per_competitor.get(name, "No content fetched.")

        extract_prompt = _FEATURE_EXTRACTOR_PROMPT.format(
            competitor_name=name, target=target, content=content
        )
        t0 = time.time()
        extract_resp = llm.invoke([{"role": "user", "content": extract_prompt}])
        latency = int((time.time() - t0) * 1000)

        profile = extract_resp.content
        token_count = extract_resp.usage_metadata.get("total_tokens", 0)
        total_tokens += token_count

        tracer.emit(
            event_type="LLM_RESPONSE",
            status="SUCCESS",
            latency=latency,
            token_usage=token_count,
            prompt=extract_prompt[:400] + "…",
            response=profile,
        )
        profiles.append(f"=== {name} ===\n{profile}")

    profiles_block = "\n\n".join(profiles)

    # ── Step 4: Comparison Builder ───────────────────────────────────────────
    compare_prompt = _COMPARISON_BUILDER_PROMPT.format(
        n=len(competitors), target=target, profiles=profiles_block
    )
    t0 = time.time()
    compare_resp = llm.invoke([{"role": "user", "content": compare_prompt}])
    latency = int((time.time() - t0) * 1000)

    comparison = compare_resp.content
    token_count = compare_resp.usage_metadata.get("total_tokens", 0)
    total_tokens += token_count

    tracer.emit(
        event_type="LLM_RESPONSE",
        status="SUCCESS",
        latency=latency,
        token_usage=token_count,
        prompt=compare_prompt[:400] + "…",
        response=comparison,
    )

    # ── Step 5: Report Writer ────────────────────────────────────────────────
    all_urls = []
    for comp in competitors:
        for key in ("main_url", "pricing_url"):
            u = comp.get(key)
            if u and u != "null":
                all_urls.append(str(u))

    report_prompt = _REPORT_WRITER_PROMPT.format(
        target=target, task=task, profiles=profiles_block, comparison=comparison
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
            "name": "Competitor Identifier",
            "eventType": "LLM_RESPONSE",
            "description": "Identifies 4-5 direct competitors and their website/pricing URLs based on the target company or product.",
            "prompt": _COMPETITOR_PROMPT,
            "promptLabel": "Prompt Template",
            "tools": [],
            "conditional": False,
        },
        {
            "name": "Page Collector",
            "eventType": "TOOL_CALL",
            "description": "Fetches the main page and pricing page for each competitor (up to 2 pages per competitor).",
            "prompt": None,
            "promptLabel": None,
            "tools": ["fetch_website"],
            "conditional": False,
        },
        {
            "name": "Feature Extractor",
            "eventType": "LLM_RESPONSE",
            "description": "For each competitor, extracts: product offering, target market, pricing, key features, differentiators, positioning, and weaknesses.",
            "prompt": _FEATURE_EXTRACTOR_PROMPT,
            "promptLabel": "Prompt Template",
            "tools": [],
            "conditional": False,
        },
        {
            "name": "Comparison Builder",
            "eventType": "LLM_RESPONSE",
            "description": "Builds a feature matrix, pricing comparison, positioning map, and identifies competitive gaps.",
            "prompt": _COMPARISON_BUILDER_PROMPT,
            "promptLabel": "Prompt Template",
            "tools": [],
            "conditional": False,
        },
        {
            "name": "Report Writer",
            "eventType": "LLM_RESPONSE",
            "description": "Produces the full competitive landscape report: profiles, feature matrix, pricing landscape, positioning, gaps, and strategic recommendations.",
            "prompt": _REPORT_WRITER_PROMPT,
            "promptLabel": "Prompt Template",
            "tools": [],
            "conditional": False,
        },
        {
            "name": "Run Complete",
            "eventType": "RUN_COMPLETED",
            "description": "Returns the competitive intelligence report.",
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
    id="competitive_intel",
    name="Competitive Intelligence",
    description=(
        "Identifies 4-5 competitors for a company or product, fetches their pages, extracts "
        "pricing and features, builds a comparison matrix, and produces a strategic landscape report."
    ),
    run_fn=_run,
    details=_DETAILS,
))
