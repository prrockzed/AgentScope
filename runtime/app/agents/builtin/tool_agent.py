"""Tool Agent — plans which tool to use, executes it, summarises the result,
and validates the output. Retries up to 3× on failure.

LangGraph workflow
------------------
  START → planner → tool_executor → summarizer → validator
  validator: PASS              → output_assembler → END
  validator: FAIL, retries ≤ 3 → tool_executor  (retry)
  validator: FAIL, retries > 3 → output_assembler → END (failed)

Public helpers
--------------
  build_workflow(llm, tracer)  — compile and return the LangGraph app; useful
                                 if you want to inspect or extend the graph.
  AgentState                   — TypedDict that describes the mutable workflow state.
"""

from __future__ import annotations

import json
import re
import time
from typing import Any, Optional

from langgraph.graph import END, START, StateGraph
from typing_extensions import TypedDict

from app.agents.registry import AgentDefinition, register
from app.llm import LiteLLMChat
from app.tools.base import BaseTool
from app.tools.calculator import CalculatorTool
from app.tools.fetch_website import FetchWebsiteTool
from app.tools.file_reader import FileReaderTool
from app.tracing.tracer import Tracer
from app.validators.output_validator import OutputValidator

# ---------------------------------------------------------------------------
# Tool registry
# ---------------------------------------------------------------------------

_TOOL_INSTANCES: list[BaseTool] = [
    CalculatorTool(),
    FetchWebsiteTool(),
    FileReaderTool(),
]

TOOLS: dict[str, BaseTool] = {t.name: t for t in _TOOL_INSTANCES}

_MAX_RETRIES = 3

# ---------------------------------------------------------------------------
# Workflow state
# ---------------------------------------------------------------------------


class AgentState(TypedDict):
    task: str
    run_id: str
    tool_name: Optional[str]
    tool_input: Optional[dict[str, Any]]
    tool_output: Optional[str]
    summary: Optional[str]
    validation_status: str          # "PASS" | "FAIL" | ""
    validation_reason: Optional[str]
    final_output: Optional[str]
    retry_count: int
    total_tokens: int
    error: Optional[str]


def _initial_state(task: str, run_id: str) -> AgentState:
    return AgentState(
        task=task,
        run_id=run_id,
        tool_name=None,
        tool_input=None,
        tool_output=None,
        summary=None,
        validation_status="",
        validation_reason=None,
        final_output=None,
        retry_count=0,
        total_tokens=0,
        error=None,
    )


# ---------------------------------------------------------------------------
# Node factories (close over llm / tracer at graph-compile time)
# ---------------------------------------------------------------------------

def _make_planner(llm: LiteLLMChat, tracer: Tracer):
    tool_descriptions = "\n".join(
        f"- {t.name}: {t.description}" for t in _TOOL_INSTANCES
    )
    system_prompt = (
        "You are an agent planner. Given a task, choose ONE tool and specify its inputs.\n\n"
        f"Available tools:\n{tool_descriptions}\n\n"
        "Respond ONLY with a JSON object (no markdown, no extra text):\n"
        '{"reasoning": "<why you chose this tool>", "tool": "<tool_name>", "tool_input": {<tool arguments>}}'
    )

    def planner(state: AgentState) -> AgentState:
        t0 = time.time()
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Task: {state['task']}"},
        ]
        response = llm.invoke(messages)
        latency = int((time.time() - t0) * 1000)

        content = response.content
        token_count = response.usage_metadata.get("total_tokens", 0)

        match = re.search(r"\{.*\}", content, re.DOTALL)
        tool_name: Optional[str] = None
        tool_input: Optional[dict[str, Any]] = None
        error: Optional[str] = None

        if match:
            try:
                parsed = json.loads(match.group())
                tool_name = parsed.get("tool")
                tool_input = parsed.get("tool_input", {})
            except json.JSONDecodeError as exc:
                error = f"Planner JSON parse error: {exc}"
        else:
            error = "Planner returned no JSON"

        tracer.emit(
            event_type="LLM_RESPONSE",
            status="SUCCESS" if not error else "FAILED",
            latency=latency,
            token_usage=token_count,
            tool_name=None,
            prompt=f"Task: {state['task']}",
            response=content,
        )

        new_state = dict(state)
        new_state["tool_name"] = tool_name
        new_state["tool_input"] = tool_input
        new_state["total_tokens"] = state["total_tokens"] + token_count
        new_state["error"] = error
        return AgentState(**new_state)

    return planner


def _make_tool_executor(tracer: Tracer):
    def tool_executor(state: AgentState) -> AgentState:
        if state["retry_count"] > 0:
            tracer.emit(
                event_type="RETRY_TRIGGERED",
                status="INFO",
                tool_name=state.get("tool_name"),
            )

        tool_name = state.get("tool_name")
        tool_input = state.get("tool_input") or {}
        tool_output: Optional[str] = None
        error: Optional[str] = state.get("error")

        t0 = time.time()
        if not tool_name or tool_name not in TOOLS:
            error = f"Unknown tool: {tool_name!r}"
            latency = int((time.time() - t0) * 1000)
            tracer.emit(
                event_type="TOOL_CALL",
                status="FAILED",
                latency=latency,
                tool_name=tool_name,
                prompt=json.dumps(tool_input),
                response=error,
            )
        else:
            tool = TOOLS[tool_name]
            try:
                tool_output = tool.run(**tool_input)
                latency = int((time.time() - t0) * 1000)
                tracer.emit(
                    event_type="TOOL_CALL",
                    status="SUCCESS",
                    latency=latency,
                    tool_name=tool_name,
                    prompt=json.dumps(tool_input),
                    response=tool_output,
                )
                error = None
            except Exception as exc:
                latency = int((time.time() - t0) * 1000)
                error = str(exc)
                tracer.emit(
                    event_type="TOOL_CALL",
                    status="FAILED",
                    latency=latency,
                    tool_name=tool_name,
                    prompt=json.dumps(tool_input),
                    response=error,
                )

        new_state = dict(state)
        new_state["tool_output"] = tool_output
        new_state["error"] = error
        return AgentState(**new_state)

    return tool_executor


def _make_summarizer(llm: LiteLLMChat, tracer: Tracer):
    def summarizer(state: AgentState) -> AgentState:
        tool_output = state.get("tool_output")
        if tool_output is None:
            new_state = dict(state)
            new_state["summary"] = None
            return AgentState(**new_state)

        prompt = (
            f"Task: {state['task']}\n\n"
            f"Tool used: {state.get('tool_name')}\n"
            f"Tool output:\n{tool_output}\n\n"
            "Please provide a concise, helpful summary that directly answers the task."
        )
        t0 = time.time()
        response = llm.invoke([{"role": "user", "content": prompt}])
        latency = int((time.time() - t0) * 1000)

        content = response.content
        token_count = response.usage_metadata.get("total_tokens", 0)

        tracer.emit(
            event_type="LLM_RESPONSE",
            status="SUCCESS",
            latency=latency,
            token_usage=token_count,
            prompt=prompt,
            response=content,
        )

        new_state = dict(state)
        new_state["summary"] = content
        new_state["total_tokens"] = state["total_tokens"] + token_count
        return AgentState(**new_state)

    return summarizer


def _make_validator(tracer: Tracer):
    validator = OutputValidator()

    def validate(state: AgentState) -> AgentState:
        result = validator.validate(state.get("summary"))
        new_state = dict(state)

        if result.passed:
            new_state["validation_status"] = "PASS"
            new_state["validation_reason"] = None
        else:
            new_state["validation_status"] = "FAIL"
            new_state["validation_reason"] = result.reason
            new_state["retry_count"] = state["retry_count"] + 1
            tracer.emit(
                event_type="VALIDATION_FAILURE",
                status="FAILED",
                tool_name=state.get("tool_name"),
                response=result.reason,
            )

        return AgentState(**new_state)

    return validate


def _make_output_assembler(tracer: Tracer):
    def output_assembler(state: AgentState) -> AgentState:
        if state.get("validation_status") == "PASS":
            final_output = state.get("summary") or state.get("tool_output")
            run_status = "SUCCESS"
        else:
            final_output = (
                state.get("summary") or state.get("tool_output") or state.get("error")
            )
            run_status = "FAILED"

        tracer.emit(
            event_type="RUN_COMPLETED",
            status=run_status,
            token_usage=state["total_tokens"],
            response=final_output,
        )

        new_state = dict(state)
        new_state["final_output"] = final_output
        return AgentState(**new_state)

    return output_assembler


# ---------------------------------------------------------------------------
# Routing
# ---------------------------------------------------------------------------

def _route_validator(state: AgentState) -> str:
    if state["validation_status"] == "PASS":
        return "output_assembler"
    if state["retry_count"] > _MAX_RETRIES:
        return "output_assembler"
    return "tool_executor"


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def build_workflow(llm: LiteLLMChat, tracer: Tracer) -> Any:
    """Compile and return the LangGraph app for the tool agent.

    Useful if you want to inspect the graph, add extra nodes, or run the
    workflow directly without going through the registry.
    """
    graph = StateGraph(AgentState)

    graph.add_node("planner", _make_planner(llm, tracer))
    graph.add_node("tool_executor", _make_tool_executor(tracer))
    graph.add_node("summarizer", _make_summarizer(llm, tracer))
    graph.add_node("validator", _make_validator(tracer))
    graph.add_node("output_assembler", _make_output_assembler(tracer))

    graph.add_edge(START, "planner")
    graph.add_edge("planner", "tool_executor")
    graph.add_edge("tool_executor", "summarizer")
    graph.add_edge("summarizer", "validator")
    graph.add_conditional_edges(
        "validator",
        _route_validator,
        {
            "output_assembler": "output_assembler",
            "tool_executor": "tool_executor",
        },
    )
    graph.add_edge("output_assembler", END)

    return graph.compile()


# ---------------------------------------------------------------------------
# Registry entry-point
# ---------------------------------------------------------------------------

def _run(
    task: str,
    run_id: str,
    tracer: Tracer,
    llm: LiteLLMChat,
) -> dict[str, Any]:
    workflow = build_workflow(llm, tracer)
    initial = _initial_state(task=task, run_id=run_id)
    final_state: AgentState = workflow.invoke(initial)
    return {
        "status": "SUCCESS" if final_state.get("validation_status") == "PASS" else "FAILED",
        "final_output": final_state.get("final_output"),
        "total_tokens": final_state.get("total_tokens", 0),
        "error": final_state.get("error"),
    }


_DETAILS = {
    "steps": [
        {
            "name": "Planner",
            "eventType": "LLM_RESPONSE",
            "description": "Chooses which tool to call and formats its arguments as a JSON object.",
            "prompt": (
                "You are an agent planner. Given a task, choose ONE tool and specify its inputs.\n\n"
                "Available tools:\n"
                "- calculator: Evaluate a mathematical expression\n"
                "- fetch_website: Download and return the text content of a web page\n"
                "- file_reader: Read the contents of a .txt, .md, or .pdf file\n\n"
                "Respond ONLY with a JSON object (no markdown, no extra text):\n"
                '{"reasoning": "<why you chose this tool>", "tool": "<tool_name>", "tool_input": {<tool arguments>}}'
            ),
            "promptLabel": "System Prompt",
            "tools": [],
            "conditional": False,
        },
        {
            "name": "Tool Executor",
            "eventType": "TOOL_CALL",
            "description": "Runs the selected tool with the planned arguments. Emits RETRY_TRIGGERED if this is a retry attempt.",
            "prompt": None,
            "promptLabel": None,
            "tools": ["calculator", "fetch_website", "file_reader"],
            "conditional": False,
        },
        {
            "name": "Summarizer",
            "eventType": "LLM_RESPONSE",
            "description": "Converts the raw tool output into a concise, helpful answer for the original task.",
            "prompt": (
                "Task: {task}\n\n"
                "Tool used: {tool_name}\n"
                "Tool output:\n{tool_output}\n\n"
                "Please provide a concise, helpful summary that directly answers the task."
            ),
            "promptLabel": "Prompt Template",
            "tools": [],
            "conditional": False,
        },
        {
            "name": "Validator",
            "eventType": "VALIDATION",
            "description": "Checks the summary for empty or malformed output. Emits VALIDATION_FAILURE and triggers a retry if it fails.",
            "prompt": None,
            "promptLabel": None,
            "tools": [],
            "conditional": False,
        },
        {
            "name": "Output Assembler",
            "eventType": "RUN_COMPLETED",
            "description": "Assembles the final output and marks the run SUCCESS or FAILED.",
            "prompt": None,
            "promptLabel": None,
            "tools": [],
            "conditional": False,
        },
    ],
    "toolsAvailable": ["calculator", "fetch_website", "file_reader"],
    "maxRetries": 3,
    "retryNote": "On validation failure the workflow loops back to Tool Executor. After 3 failed attempts the run is marked FAILED.",
    "workflowType": "langgraph",
}

register(AgentDefinition(
    id="tool_agent",
    name="Tool Agent",
    description=(
        "Plans which tool to use, executes it, summarises the result, "
        "and validates the output. Retries up to 3× on failure."
    ),
    run_fn=_run,
    details=_DETAILS,
))
