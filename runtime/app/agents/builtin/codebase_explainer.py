"""Codebase Explainer — accepts a GitHub URL (any public repo) or a local path,
maps the repository structure, reads the README and the most important source
files, traces dependencies, and produces a deep architectural technical brief.

Workflow
--------
  1. Source Fetcher   (TOOL) — clones GitHub repo or validates local path
  2. Structure Mapper (TOOL) — reads full directory tree
  3. README Reader    (TOOL) — reads README so the LLM has project context first
  4. File Selector    (LLM)  — picks up to 8 important files (skips tests/locks)
  5. File Reader      (TOOL) — reads each selected file
  6. Dependency Tracer(LLM)  — maps how modules connect and data flows
  7. Report Writer    (LLM)  — produces the final architectural brief
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
import time
from typing import Any, Optional

from app.agents.registry import AgentDefinition, register
from app.llm import LiteLLMChat
from app.tools.directory_tree import DirectoryTreeTool
from app.tools.file_reader import FileReaderTool
from app.tracing.tracer import Tracer

_tree_tool = DirectoryTreeTool()
_file_tool = FileReaderTool()

_MAX_FILES_TO_READ = 8
_FILE_CONTENT_TRUNCATE = 3000
_README_TRUNCATE = 5000
_CLONE_TIMEOUT_SECONDS = 120

_GITHUB_URL_RE = re.compile(
    r"https?://github\.com/([\w.\-]+)/([\w.\-]+?)(?:\.git)?(?:[/#?\s]|$)"
)

_README_NAMES = [
    "README.md", "readme.md", "README.MD",
    "README.rst", "README.txt", "README",
]

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

_FILE_SELECTOR_PROMPT = """\
You are a software architect. You have the directory tree and README of a code \
repository. Select the most important files to read to understand the \
architecture, entry points, and core logic.

Source: {source}
Task / what to explain: {task}

README summary:
{readme}

Directory tree:
{tree}

Select up to {max_files} files. Prioritise:
- Entry points (main.py, index.ts, App.java, server.js, etc.)
- Core service / business logic files
- Configuration files (docker-compose, pom.xml, package.json, build.gradle, etc.)
- Key data model or schema definitions

Do NOT select:
- Test files or test directories (unless the task specifically asks about tests)
- Lock files (package-lock.json, yarn.lock, poetry.lock, etc.)
- Generated or compiled output files
- Files already fully explained by the README

Respond ONLY with valid JSON (no markdown fences):
{{"reasoning": "<why these files reveal the architecture>", "files": ["<path>", ...]}}
"""

_DEPENDENCY_TRACER_PROMPT = """\
You are a software architect. You have read the following files from a codebase.

Source: {source}
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

Source: {source}
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
# Helpers
# ---------------------------------------------------------------------------


def _parse_github_url(task_text: str) -> tuple[str, str] | None:
    """Return (owner, repo) if a GitHub URL is found in the task, else None."""
    m = _GITHUB_URL_RE.search(task_text)
    return (m.group(1), m.group(2)) if m else None


def _find_readme(repo_path: str) -> str | None:
    for name in _README_NAMES:
        candidate = os.path.join(repo_path, name)
        if os.path.isfile(candidate):
            return candidate
    return None


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
    temp_dir: str | None = None

    # Strip knowledge context prefix if present
    _task_text = task.split("\n[Task]\n", 1)[-1] if "\n[Task]\n" in task else task

    try:
        # ── Step 1: Source Fetcher ───────────────────────────────────────────
        t0 = time.time()
        github = _parse_github_url(_task_text)

        if github:
            owner, repo = github
            clone_url = f"https://github.com/{owner}/{repo}.git"
            source_label = f"github.com/{owner}/{repo}"
            temp_dir = tempfile.mkdtemp(prefix="agentscope_clone_")
            repo_path = os.path.join(temp_dir, repo)

            result = subprocess.run(
                ["git", "clone", "--depth", "1", "--single-branch", clone_url, repo_path],
                capture_output=True,
                text=True,
                timeout=_CLONE_TIMEOUT_SECONDS,
            )
            clone_latency = int((time.time() - t0) * 1000)

            if result.returncode != 0:
                err = result.stderr.strip()
                tracer.emit(
                    event_type="TOOL_CALL",
                    status="FAILED",
                    latency=clone_latency,
                    tool_name="git_clone",
                    prompt=clone_url,
                    response=err,
                )
                tracer.emit(event_type="RUN_COMPLETED", status="FAILED",
                            token_usage=0, response=err)
                return {"status": "FAILED", "final_output": err, "total_tokens": 0,
                        "error": "CLONE_FAILED"}

            tracer.emit(
                event_type="TOOL_CALL",
                status="SUCCESS",
                latency=clone_latency,
                tool_name="git_clone",
                prompt=clone_url,
                response=f"Cloned {source_label} → {repo_path}",
            )
        else:
            path_match = re.search(r"(/[\w./\-_]+|\./[\w./\-_]+|[\w\-_]+/[\w./\-_]+)", _task_text)
            repo_path = path_match.group() if path_match else _task_text.strip()
            source_label = repo_path
            fetch_latency = int((time.time() - t0) * 1000)
            tracer.emit(
                event_type="TOOL_CALL",
                status="SUCCESS",
                latency=fetch_latency,
                tool_name="git_clone",
                prompt=repo_path,
                response=f"Using local path: {repo_path}",
            )

        # ── Step 2: Structure Mapper ─────────────────────────────────────────
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
            return {"status": "FAILED", "final_output": tree, "total_tokens": total_tokens,
                    "error": "PATH_NOT_FOUND"}

        # ── Step 3: README Reader ────────────────────────────────────────────
        readme_path = _find_readme(repo_path)
        readme_content = ""
        if readme_path:
            t0 = time.time()
            try:
                raw = _file_tool.run(path=readme_path)
                if len(raw) > _README_TRUNCATE:
                    raw = raw[:_README_TRUNCATE] + "\n… [truncated]"
                readme_content = raw
                readme_latency = int((time.time() - t0) * 1000)
                tracer.emit(
                    event_type="TOOL_CALL",
                    status="SUCCESS",
                    latency=readme_latency,
                    tool_name="file_reader",
                    prompt=readme_path,
                    response=raw[:300] + "…" if len(raw) > 300 else raw,
                )
            except Exception as exc:
                readme_latency = int((time.time() - t0) * 1000)
                tracer.emit(
                    event_type="TOOL_CALL",
                    status="FAILED",
                    latency=readme_latency,
                    tool_name="file_reader",
                    prompt=readme_path,
                    response=str(exc),
                )
        else:
            tracer.emit(
                event_type="TOOL_CALL",
                status="SUCCESS",
                latency=0,
                tool_name="file_reader",
                prompt="README",
                response="No README found at repository root.",
            )

        # ── Step 4: File Selector ────────────────────────────────────────────
        selector_prompt = _FILE_SELECTOR_PROMPT.format(
            source=source_label,
            task=task,
            readme=readme_content or "No README found.",
            tree=tree,
            max_files=_MAX_FILES_TO_READ,
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
            files_to_read = re.findall(r'["\']([\w./\-_]+\.\w+)["\']', sel_content)
        files_to_read = files_to_read[:_MAX_FILES_TO_READ]

        # ── Step 5: File Reader ──────────────────────────────────────────────
        file_contents_parts: list[str] = []

        for file_path in files_to_read:
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

        # ── Step 6: Dependency Tracer ────────────────────────────────────────
        dep_prompt = _DEPENDENCY_TRACER_PROMPT.format(
            source=source_label, task=task, file_contents=file_contents_block
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

        # ── Step 7: Report Writer ────────────────────────────────────────────
        report_prompt = _REPORT_WRITER_PROMPT.format(
            source=source_label, task=task, analysis=analysis
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

        return {"status": "SUCCESS", "final_output": report, "total_tokens": total_tokens,
                "error": None}

    finally:
        if temp_dir:
            shutil.rmtree(temp_dir, ignore_errors=True)


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

_DETAILS = {
    "steps": [
        {
            "name": "Source Fetcher",
            "eventType": "TOOL_CALL",
            "description": "Detects whether the input is a GitHub URL or a local path. For GitHub URLs, clones the repository (shallow, depth=1) into a temporary directory. For local paths, validates the directory exists.",
            "prompt": None,
            "promptLabel": None,
            "tools": ["git_clone"],
            "conditional": False,
        },
        {
            "name": "Structure Mapper",
            "eventType": "TOOL_CALL",
            "description": "Reads the full directory tree of the repository, filtering out build artifacts, dependency folders, and generated files.",
            "prompt": None,
            "promptLabel": None,
            "tools": ["directory_tree"],
            "conditional": False,
        },
        {
            "name": "README Reader",
            "eventType": "TOOL_CALL",
            "description": "Reads the repository README (README.md, README.rst, etc.) to give the LLM project context before it selects files. Truncated at 5000 characters.",
            "prompt": None,
            "promptLabel": None,
            "tools": ["file_reader"],
            "conditional": True,
        },
        {
            "name": "File Selector",
            "eventType": "LLM_RESPONSE",
            "description": "Uses the README and directory tree to select up to 8 files most critical for understanding the architecture. Skips tests, lock files, and generated output.",
            "prompt": _FILE_SELECTOR_PROMPT,
            "promptLabel": "Prompt Template",
            "tools": [],
            "conditional": False,
        },
        {
            "name": "File Reader",
            "eventType": "TOOL_CALL",
            "description": "Reads each selected file. Files are truncated at 3000 characters to keep context focused.",
            "prompt": None,
            "promptLabel": None,
            "tools": ["file_reader"],
            "conditional": False,
        },
        {
            "name": "Dependency Tracer",
            "eventType": "LLM_RESPONSE",
            "description": "Maps entry points, module dependencies, core abstractions, architectural patterns, and key data flows across the read files.",
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
            "description": "Returns the architectural technical brief. Cloned repositories are deleted from disk.",
            "prompt": None,
            "promptLabel": None,
            "tools": [],
            "conditional": False,
        },
    ],
    "toolsAvailable": ["git_clone", "directory_tree", "file_reader"],
    "maxRetries": None,
    "retryNote": None,
    "workflowType": "sequential",
}

register(AgentDefinition(
    id="codebase_explainer",
    name="Codebase Explainer",
    description=(
        "Accepts a GitHub URL (any public repo) or a local filesystem path. "
        "Clones the repo, reads the README and up to 8 key source files, traces "
        "dependencies, and produces a deep architectural technical brief with data "
        "flows, entry points, and design patterns."
    ),
    run_fn=_run,
    details=_DETAILS,
))
