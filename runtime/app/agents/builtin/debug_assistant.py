"""Debug Assistant — given an error message, stack trace, or log file path,
diagnoses the root cause with structured reasoning, searches for relevant
documentation or known issues, and proposes concrete ranked fixes with code.

Workflow
--------
  1. Error Parser       (LLM)  — extracts structured error info (type, language, framework)
  2. Context Reader     (TOOL) — reads log/source files if a path is found in the input
  3. Root Cause Analyst (LLM)  — diagnoses root cause with step-by-step reasoning
  4. Doc Researcher     (TOOL) — fetches 1-2 relevant documentation or issue pages
  5. Fix Proposer       (LLM)  — proposes 2-3 concrete ranked fixes with code patches
"""

from __future__ import annotations

import re
import time
from typing import Any, Optional

from app.agents.registry import AgentDefinition, register
from app.llm import LiteLLMChat
from app.tools.fetch_website import FetchWebsiteTool
from app.tools.file_reader import FileReaderTool
from app.tracing.tracer import Tracer

_file_tool = FileReaderTool()
_fetcher = FetchWebsiteTool()

_FILE_CONTENT_TRUNCATE = 4000
_DOC_CONTENT_TRUNCATE = 3000

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

_ERROR_PARSER_PROMPT = """\
You are a senior software debugger. Parse the error report below and extract \
structured information.

Error report:
{task}

Extract:
1. ERROR TYPE — the specific error class or exception name (e.g. NullPointerException, \
   TypeError, SegFault, 404 Not Found)
2. ERROR MESSAGE — the exact error message text
3. LANGUAGE & RUNTIME — programming language, runtime version if visible \
   (e.g. Python 3.11, Java 17, Node 20)
4. FRAMEWORK/LIBRARY — the framework or library involved if clear \
   (e.g. Spring Boot, React, FastAPI, LangChain)
5. STACK TRACE SUMMARY — the top 3-5 most relevant frames from the stack trace, \
   in order (file, line, function name)
6. LIKELY COMPONENT — which part of the system is this error originating from?
7. CONTEXT CLUES — any other relevant context (environment, recent changes, \
   configuration values mentioned)
8. FILE PATHS MENTIONED — list any file paths or module names explicitly referenced \
   in the error (these may be readable)

Also state: what additional information would be most helpful to diagnose this?
"""

_ROOT_CAUSE_PROMPT = """\
You are a senior software debugger performing root cause analysis.

Original error report:
{task}

Parsed error information:
{parsed_error}

{file_context_section}

Diagnose the root cause using step-by-step reasoning:

STEP 1 — IMMEDIATE CAUSE
What specific line or operation triggered this error?

STEP 2 — UNDERLYING CAUSE
Why did that operation fail? What precondition was violated?

STEP 3 — ROOT CAUSE
What is the fundamental reason this happened? (misconfiguration, race condition, \
null reference, API contract violation, version mismatch, etc.)

STEP 4 — CONTRIBUTING FACTORS
What other factors made this error likely or harder to catch?

STEP 5 — SCOPE ASSESSMENT
Is this error isolated (one code path) or systemic (affects many paths)?

STEP 6 — DOCUMENTATION TARGETS
List 1-2 specific URLs that would be most useful to check:
- Official documentation for the error/API involved
- Known GitHub issues or Stack Overflow discussions

Provide these as: DOC_URL_1: <url>  DOC_URL_2: <url>  (on separate lines)
"""

_FIX_PROPOSER_PROMPT = """\
You are a senior software engineer providing concrete fixes for a diagnosed bug.

Original error:
{task}

Root cause analysis:
{root_cause}

{doc_context_section}

Propose exactly 3 fixes, ranked from most likely to resolve the issue to least:

---
FIX 1 (Most likely — <short name>)
Confidence: High / Medium / Low
Root cause addressed: <which aspect of the root cause this fixes>

Explanation:
<Why this fix works, in 2-3 sentences>

Code change:
```<language>
<actual code patch or replacement — be specific, not pseudocode>
```

Caveats:
<Any side effects, prerequisites, or things to verify after applying>

---
FIX 2 (Alternative — <short name>)
[same structure]

---
FIX 3 (If above don't work — <short name>)
[same structure]

---
VERIFICATION STEPS
How to confirm the fix worked:
1. <step>
2. <step>

PREVENTION
How to prevent this class of error in future:
- <measure>
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

    # ── Step 1: Error Parser ─────────────────────────────────────────────────
    parse_prompt = _ERROR_PARSER_PROMPT.format(task=task)
    t0 = time.time()
    parse_resp = llm.invoke([{"role": "user", "content": parse_prompt}])
    latency = int((time.time() - t0) * 1000)

    parsed_error = parse_resp.content
    token_count = parse_resp.usage_metadata.get("total_tokens", 0)
    total_tokens += token_count

    tracer.emit(
        event_type="LLM_RESPONSE",
        status="SUCCESS",
        latency=latency,
        token_usage=token_count,
        prompt=parse_prompt,
        response=parsed_error,
    )

    # ── Step 2: Context Reader ───────────────────────────────────────────────
    # Find file paths in the original task or parsed error
    file_context: Optional[str] = None
    path_pattern = r'(/[\w./\-_]+\.\w+|[\w./\-_]+\.(?:py|java|ts|js|go|rb|rs|log|txt|yaml|yml|json|xml|properties))'
    _task_text = task.split("\n[Task]\n", 1)[-1] if "\n[Task]\n" in task else task
    paths_in_task = re.findall(path_pattern, _task_text)
    paths_in_parsed = re.findall(path_pattern, parsed_error)
    candidate_paths = list(dict.fromkeys(paths_in_task + paths_in_parsed))[:3]

    file_parts: list[str] = []
    for path in candidate_paths:
        t0 = time.time()
        try:
            content = _file_tool.run(path=path)
            read_latency = int((time.time() - t0) * 1000)
            if len(content) > _FILE_CONTENT_TRUNCATE:
                content = content[:_FILE_CONTENT_TRUNCATE] + "\n… [truncated]"
            file_parts.append(f"=== {path} ===\n{content}")
            tracer.emit(
                event_type="TOOL_CALL",
                status="SUCCESS",
                latency=read_latency,
                tool_name="file_reader",
                prompt=path,
                response=content[:300] + "…" if len(content) > 300 else content,
            )
        except Exception as exc:
            read_latency = int((time.time() - t0) * 1000)
            tracer.emit(
                event_type="TOOL_CALL",
                status="FAILED",
                latency=read_latency,
                tool_name="file_reader",
                prompt=path,
                response=str(exc),
            )

    if file_parts:
        file_context = "\n\n".join(file_parts)

    file_context_section = (
        f"File context (read from disk):\n{file_context}"
        if file_context
        else "No file context available (no readable file paths found in the error)."
    )

    # ── Step 3: Root Cause Analyst ───────────────────────────────────────────
    rca_prompt = _ROOT_CAUSE_PROMPT.format(
        task=task,
        parsed_error=parsed_error,
        file_context_section=file_context_section,
    )
    t0 = time.time()
    rca_resp = llm.invoke([{"role": "user", "content": rca_prompt}])
    latency = int((time.time() - t0) * 1000)

    root_cause = rca_resp.content
    token_count = rca_resp.usage_metadata.get("total_tokens", 0)
    total_tokens += token_count

    tracer.emit(
        event_type="LLM_RESPONSE",
        status="SUCCESS",
        latency=latency,
        token_usage=token_count,
        prompt=rca_prompt[:400] + "…",
        response=root_cause,
    )

    # ── Step 4: Doc Researcher ───────────────────────────────────────────────
    # Extract DOC_URLs suggested by the root cause analyst
    doc_urls = re.findall(r'DOC_URL_\d+:\s*(https?://[^\s]+)', root_cause)
    # Also grab any https:// URLs from root cause text
    if not doc_urls:
        doc_urls = re.findall(r'https?://[^\s"\'<>]+', root_cause)
    doc_urls = [u.rstrip(".,)") for u in doc_urls[:2]]

    doc_parts: list[str] = []
    for url in doc_urls:
        t0 = time.time()
        try:
            content = _fetcher.run(url=url)
            fetch_latency = int((time.time() - t0) * 1000)
            if len(content) > _DOC_CONTENT_TRUNCATE:
                content = content[:_DOC_CONTENT_TRUNCATE] + "\n… [truncated]"
            doc_parts.append(f"[Doc: {url}]\n{content}")
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

    doc_context_section = (
        f"Relevant documentation fetched:\n" + "\n\n".join(doc_parts)
        if doc_parts
        else "No documentation pages could be fetched."
    )

    # ── Step 5: Fix Proposer ─────────────────────────────────────────────────
    fix_prompt = _FIX_PROPOSER_PROMPT.format(
        task=task,
        root_cause=root_cause,
        doc_context_section=doc_context_section,
    )
    t0 = time.time()
    fix_resp = llm.invoke([{"role": "user", "content": fix_prompt}])
    latency = int((time.time() - t0) * 1000)

    fixes = fix_resp.content
    token_count = fix_resp.usage_metadata.get("total_tokens", 0)
    total_tokens += token_count

    tracer.emit(
        event_type="LLM_RESPONSE",
        status="SUCCESS",
        latency=latency,
        token_usage=token_count,
        prompt=fix_prompt[:400] + "…",
        response=fixes,
    )

    # Compose final output
    final_output = (
        f"## Root Cause Analysis\n\n{root_cause}\n\n"
        f"---\n\n"
        f"## Proposed Fixes\n\n{fixes}"
    )

    tracer.emit(
        event_type="RUN_COMPLETED",
        status="SUCCESS",
        token_usage=total_tokens,
        response=final_output,
    )

    return {"status": "SUCCESS", "final_output": final_output, "total_tokens": total_tokens, "error": None}


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

_DETAILS = {
    "steps": [
        {
            "name": "Error Parser",
            "eventType": "LLM_RESPONSE",
            "description": "Extracts structured information from the error: type, message, language, framework, stack trace frames, and file paths mentioned.",
            "prompt": _ERROR_PARSER_PROMPT,
            "promptLabel": "Prompt Template",
            "tools": [],
            "conditional": False,
        },
        {
            "name": "Context Reader",
            "eventType": "TOOL_CALL",
            "description": "Reads any source or log files referenced in the error report (up to 3 files, 4000 chars each).",
            "prompt": None,
            "promptLabel": None,
            "tools": ["file_reader"],
            "conditional": True,
        },
        {
            "name": "Root Cause Analyst",
            "eventType": "LLM_RESPONSE",
            "description": "Performs 6-step root cause analysis: immediate cause → underlying cause → root cause → contributing factors → scope → documentation targets.",
            "prompt": _ROOT_CAUSE_PROMPT,
            "promptLabel": "Prompt Template",
            "tools": [],
            "conditional": False,
        },
        {
            "name": "Doc Researcher",
            "eventType": "TOOL_CALL",
            "description": "Fetches 1-2 documentation or issue pages suggested by the root cause analyst.",
            "prompt": None,
            "promptLabel": None,
            "tools": ["fetch_website"],
            "conditional": True,
        },
        {
            "name": "Fix Proposer",
            "eventType": "LLM_RESPONSE",
            "description": "Proposes 3 concrete ranked fixes with actual code patches, confidence levels, caveats, verification steps, and prevention measures.",
            "prompt": _FIX_PROPOSER_PROMPT,
            "promptLabel": "Prompt Template",
            "tools": [],
            "conditional": False,
        },
        {
            "name": "Run Complete",
            "eventType": "RUN_COMPLETED",
            "description": "Returns the full diagnostic report: root cause analysis + ranked fixes with code.",
            "prompt": None,
            "promptLabel": None,
            "tools": [],
            "conditional": False,
        },
    ],
    "toolsAvailable": ["file_reader", "fetch_website"],
    "maxRetries": None,
    "retryNote": None,
    "workflowType": "sequential",
}

register(AgentDefinition(
    id="debug_assistant",
    name="Debug Assistant",
    description=(
        "Parses an error/stack trace, reads referenced source files, diagnoses the root cause "
        "with step-by-step reasoning, fetches relevant docs, and proposes 3 ranked concrete fixes."
    ),
    run_fn=_run,
    details=_DETAILS,
))
