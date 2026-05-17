"""Chain of Thought — forces the LLM to reason step-by-step before giving a
final answer. Good for logic, maths, and multi-part questions."""

import time
from typing import Any

from langchain_ollama import ChatOllama

from app.agents.registry import AgentDefinition, register
from app.tracing.tracer import Tracer

_SYSTEM_PROMPT = (
    "You are a careful reasoning assistant. Before giving your final answer, "
    "work through the problem step-by-step, labelling each step clearly "
    "(e.g. 'Step 1:', 'Step 2:', …). "
    "After your reasoning, write '## Final Answer' followed by a concise, "
    "definitive response."
)


def _run(
    task: str,
    run_id: str,
    tracer: Tracer,
    model: str,
    base_url: str,
) -> dict[str, Any]:
    llm = ChatOllama(model=model, base_url=base_url)

    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": task},
    ]

    t0 = time.time()
    response = llm.invoke(messages)
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


register(AgentDefinition(
    id="chain_of_thought",
    name="Chain of Thought",
    description=(
        "Forces the LLM to reason step-by-step before giving a final answer. "
        "Good for logic, maths, and multi-part questions."
    ),
    run_fn=_run,
))
