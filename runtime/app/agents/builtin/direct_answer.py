"""Direct Answer — sends the task straight to the LLM and returns the
response immediately. No tools, no retries. Fastest option."""

import time
from typing import Any

from langchain_ollama import ChatOllama

from app.agents.registry import AgentDefinition, register
from app.tracing.tracer import Tracer


def _run(
    task: str,
    run_id: str,
    tracer: Tracer,
    model: str,
    base_url: str,
) -> dict[str, Any]:
    llm = ChatOllama(model=model, base_url=base_url)

    t0 = time.time()
    response = llm.invoke([{"role": "user", "content": task}])
    latency = int((time.time() - t0) * 1000)

    content = response.content
    tokens = getattr(response, "usage_metadata", None)
    token_count = tokens.get("total_tokens", 0) if tokens else 0

    tracer.emit(
        event_type="LLM_RESPONSE",
        status="SUCCESS",
        latency=latency,
        token_usage=token_count,
        prompt=task,
        response=content,
    )
    tracer.emit(
        event_type="RUN_COMPLETED",
        status="SUCCESS",
        token_usage=token_count,
        response=content,
    )

    return {
        "status": "SUCCESS",
        "final_output": content,
        "total_tokens": token_count,
        "error": None,
    }


_DETAILS = {
    "steps": [
        {
            "name": "LLM Call",
            "eventType": "LLM_RESPONSE",
            "description": "Sends the task directly to the LLM as a user message with no system instructions or tools.",
            "prompt": None,
            "promptLabel": None,
            "tools": [],
            "conditional": False,
        },
        {
            "name": "Run Complete",
            "eventType": "RUN_COMPLETED",
            "description": "Returns the LLM response immediately. Always marks the run as SUCCESS.",
            "prompt": None,
            "promptLabel": None,
            "tools": [],
            "conditional": False,
        },
    ],
    "toolsAvailable": [],
    "maxRetries": None,
    "retryNote": None,
    "workflowType": "single_call",
}

register(AgentDefinition(
    id="direct_answer",
    name="Direct Answer",
    description=(
        "Sends the task straight to the LLM and returns the response immediately "
        "— no tools, no retries. Fastest option."
    ),
    run_fn=_run,
    details=_DETAILS,
))
