"""Codebase Explainer — given a path to a local code repository, maps its
structure, selects and reads the most important files, traces dependencies,
and produces a deep architectural technical brief.

Workflow
--------
  1. Structure Mapper  (TOOL) — reads full directory tree
  2. File Selector     (LLM)  — picks the most important files to read
  3. File Reader       (TOOL) — reads each selected file
  4. Dependency Tracer (LLM)  — maps how modules connect and data flows
  5. Report Writer     (LLM)  — produces the final architectural brief
"""

from __future__ import annotations

import json
import re
import time
from typing import Any, Optional

from app.agents.registry import AgentDefinition, register
from app.llm import LiteLLMChat
from app.tools.directory_tree import DirectoryTreeTool
from app.tools.file_reader import FileReaderTool
from app.tracing.tracer import Tracer

_tree_tool = DirectoryTreeTool()
_file_tool = FileReaderTool()

_MAX_FILES_TO_READ = 10
_FILE_CONTENT_TRUNCATE = 3000

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

_FILE_SELECTOR_PROMPT = """\
You are a software architect. You have been given the directory structure of a \
code repository. Your job is to select the most important files to read in order \
to understand the codebase's architecture, entry points, and core logic.

Repository path: {path}
Task / what to explain: {task}

Directory tree:
{tree}

Select up to {max_files} files that would give the deepest understanding:
- Entry points (main.py, index.ts, App.java, etc.)
- Core service / business logic files
- Configuration files (docker-compose, pom.xml, package.json, etc.)
- Key data model or schema definitions
- Important README or documentation files

Respond ONLY with valid JSON (no markdown):
{{"reasoning": "<why these files reveal the architecture>", "files": ["<absolute or repo-relative path>", ...]}}
"""

_DEPENDENCY_TRACER_PROMPT = """\
You are a software architect. You have read the following files from a codebase.

Repository path: {path}
Task / what to explain: {task}

--- FILE CONTENTS ---
{file_contents}
--- END FILE CONTENTS ---

Analyse the code carefully. Map out:

1. ENTRY POINTS — where execution starts, API endpoints, main handlers
2. MODULE DEPENDENCIES — which files import which, how data flows between them
3. CORE ABSTRACTIONS — key classes, interfaces, functions, data structures
4. EXTERNAL DEPENDENCIES — third-party libraries, databases, APIs used
5. ARCHITECTURAL PATTERNS — MVC, microservices, event-driven, layered, etc.
6. CONFIGURATION — how the project is configured (env vars, config files)
7. KEY DATA FLOWS — describe 2-3 important request/execution paths end-to-end

Be specific and reference actual file names, class names, and function names.
"""

_REPORT_WRITER_PROMPT = """\
You are a software architect writing a technical brief for a new team member.

Repository path: {path}
Task / what to explain: {task}

Architectural analysis:
{analysis}

Write a complete technical brief using EXACTLY these sections:

## Overview
What this codebase does in 2-3 sentences (the "elevator pitch").

## Technology Stack
Bullet list of languages, frameworks, databases, and key libraries.

## Repository Structure
Annotated directory tree of the most important folders and files.

## Architecture
How the system is structured (layers, services, modules). Include a \
description of the main components and how they connect.

## Key Data Flows
Step-by-step walkthrough of 2-3 core operations (e.g. "When a user submits a run: ...").

## Entry Points
Where to start reading the code. List specific files and functions.

## Configuration
How to configure the project (env vars, config files, important defaults).

## Notable Patterns & Design Decisions
Anything architecturally interesting — patterns used, non-obvious choices, \
things a new developer should be aware of.

Be precise. Reference actual file names and line-level details where possible.
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

    # Extract directory path from the original task text only (strip knowledge context if present)
    _task_text = task.split("\n[Task]\n", 1)[-1] if "\n[Task]\n" in task else task
    path_match = re.search(r"(/[\w./\-_]+|\./[\w./\-_]+|[\w\-_]+/[\w./\-_]+)", _task_text)
    repo_path = path_match.group() if path_match else _task_text.strip()

    # ── Step 1: Structure Mapper ─────────────────────────────────────────────
    t0 = time.time()
    tree = _tree_tool.run(path=repo_path)
    tree_latency = int((time.time() - t0) * 1000)

    tracer.emit(
        event_type="TOOL_CALL",
        status="SUCCESS" if "not found" not in tree.lower() else "FAILED",
        latency=tree_latency,
        tool_name="directory_tree",
        prompt=repo_path,
        response=tree[:500] + "…" if len(tree) > 500 else tree,
    )

    if "not found" in tree.lower() or "not a directory" in tree.lower():
        tracer.emit(event_type="RUN_COMPLETED", status="FAILED",
                    token_usage=total_tokens, response=tree)
        return {"status": "FAILED", "final_output": tree, "total_tokens": total_tokens, "error": "PATH_NOT_FOUND"}

    # ── Step 2: File Selector ────────────────────────────────────────────────
    selector_prompt = _FILE_SELECTOR_PROMPT.format(
        path=repo_path, task=task, tree=tree, max_files=_MAX_FILES_TO_READ
    )
    t0 = time.time()
    sel_resp = llm.invoke([{"role": "user", "content": selector_prompt}])
    latency = int((time.time() - t0) * 1000)

    sel_content = sel_resp.content
    token_count = sel_resp.usage_metadata.get("total_tokens", 0)
    total_tokens += token_count

    tracer.emit(
        event_type="LLM_RESPONSE",
        status="SUCCESS",
        latency=latency,
        token_usage=token_count,
        prompt=selector_prompt[:400] + "…",
        response=sel_content,
    )

    files_to_read: list[str] = []
    json_match = re.search(r"\{.*\}", sel_content, re.DOTALL)
    if json_match:
        try:
            parsed = json.loads(json_match.group())
            files_to_read = parsed.get("files", [])
        except json.JSONDecodeError:
            pass
    if not files_to_read:
        # Fallback: extract any path-like strings
        files_to_read = re.findall(r'["\']([\w./\-_]+\.\w+)["\']', sel_content)
    files_to_read = files_to_read[:_MAX_FILES_TO_READ]

    # ── Step 3: File Reader ──────────────────────────────────────────────────
    file_contents_parts: list[str] = []

    for file_path in files_to_read:
        # Make absolute if not already
        if not file_path.startswith("/"):
            file_path = f"{repo_path.rstrip('/')}/{file_path}"

        t0 = time.time()
        try:
            content = _file_tool.run(path=file_path)
            read_latency = int((time.time() - t0) * 1000)
            if len(content) > _FILE_CONTENT_TRUNCATE:
                content = content[:_FILE_CONTENT_TRUNCATE] + "\n… [truncated]"
            file_contents_parts.append(f"=== {file_path} ===\n{content}")
            tracer.emit(
                event_type="TOOL_CALL",
                status="SUCCESS",
                latency=read_latency,
                tool_name="file_reader",
                prompt=file_path,
                response=content[:300] + "…" if len(content) > 300 else content,
            )
        except Exception as exc:
            read_latency = int((time.time() - t0) * 1000)
            tracer.emit(
                event_type="TOOL_CALL",
                status="FAILED",
                latency=read_latency,
                tool_name="file_reader",
                prompt=file_path,
                response=str(exc),
            )

    file_contents_block = "\n\n".join(file_contents_parts) or "No files could be read."

    # ── Step 4: Dependency Tracer ────────────────────────────────────────────
    dep_prompt = _DEPENDENCY_TRACER_PROMPT.format(
        path=repo_path, task=task, file_contents=file_contents_block
    )
    t0 = time.time()
    dep_resp = llm.invoke([{"role": "user", "content": dep_prompt}])
    latency = int((time.time() - t0) * 1000)

    analysis = dep_resp.content
    token_count = dep_resp.usage_metadata.get("total_tokens", 0)
    total_tokens += token_count

    tracer.emit(
        event_type="LLM_RESPONSE",
        status="SUCCESS",
        latency=latency,
        token_usage=token_count,
        prompt=dep_prompt[:400] + "…",
        response=analysis,
    )

    # ── Step 5: Report Writer ────────────────────────────────────────────────
    report_prompt = _REPORT_WRITER_PROMPT.format(
        path=repo_path, task=task, analysis=analysis
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
            "name": "Structure Mapper",
            "eventType": "TOOL_CALL",
            "description": "Reads the full directory tree of the repository, filtering out build artifacts and dependencies.",
            "prompt": None,
            "promptLabel": None,
            "tools": ["directory_tree"],
            "conditional": False,
        },
        {
            "name": "File Selector",
            "eventType": "LLM_RESPONSE",
            "description": "Analyses the directory tree and selects up to 10 files most critical for understanding the architecture.",
            "prompt": _FILE_SELECTOR_PROMPT,
            "promptLabel": "Prompt Template",
            "tools": [],
            "conditional": False,
        },
        {
            "name": "File Reader",
            "eventType": "TOOL_CALL",
            "description": "Reads each selected file. Long files are truncated at 3000 characters.",
            "prompt": None,
            "promptLabel": None,
            "tools": ["file_reader"],
            "conditional": False,
        },
        {
            "name": "Dependency Tracer",
            "eventType": "LLM_RESPONSE",
            "description": "Maps entry points, module dependencies, core abstractions, architectural patterns, and key data flows.",
            "prompt": _DEPENDENCY_TRACER_PROMPT,
            "promptLabel": "Prompt Template",
            "tools": [],
            "conditional": False,
        },
        {
            "name": "Report Writer",
            "eventType": "LLM_RESPONSE",
            "description": "Produces the final technical brief: Overview, Stack, Architecture, Data Flows, Entry Points, Configuration, Patterns.",
            "prompt": _REPORT_WRITER_PROMPT,
            "promptLabel": "Prompt Template",
            "tools": [],
            "conditional": False,
        },
        {
            "name": "Run Complete",
            "eventType": "RUN_COMPLETED",
            "description": "Returns the architectural technical brief.",
            "prompt": None,
            "promptLabel": None,
            "tools": [],
            "conditional": False,
        },
    ],
    "toolsAvailable": ["directory_tree", "file_reader"],
    "maxRetries": None,
    "retryNote": None,
    "workflowType": "sequential",
}

register(AgentDefinition(
    id="codebase_explainer",
    name="Codebase Explainer",
    description=(
        "Maps a repository's structure, reads its most important files, traces dependencies, "
        "and produces a deep architectural technical brief with data flows and entry points."
    ),
    run_fn=_run,
    details=_DETAILS,
))
