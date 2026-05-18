"""Critic Agent — generates a first-draft answer, then runs a critic pass
that evaluates and rewrites it for accuracy and completeness."""

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
    total_tokens = 0

    # --- Step 1: Generator ---
    gen_prompt = f"Answer the following task as thoroughly as you can:\n\nTask: {task}"
    t0 = time.time()
    gen_response = llm.invoke([{"role": "user", "content": gen_prompt}])
    latency = int((time.time() - t0) * 1000)

    initial_answer = gen_response.content
    tokens = getattr(gen_response, "usage_metadata", None)
    token_count = tokens.get("total_tokens", 0) if tokens else 0
    total_tokens += token_count

    tracer.emit(
        event_type="LLM_RESPONSE",
        status="SUCCESS",
        latency=latency,
        token_usage=token_count,
        prompt=gen_prompt,
        response=initial_answer,
    )

    # --- Step 2: Critic ---
    critic_prompt = (
        "You are a critical reviewer. Evaluate the answer below for the given task.\n\n"
        f"Task: {task}\n\n"
        f"Answer to review:\n{initial_answer}\n\n"
        "Identify any inaccuracies, gaps, or areas for improvement. "
        "Be specific and constructive."
    )
    t0 = time.time()
    critic_response = llm.invoke([{"role": "user", "content": critic_prompt}])
    latency = int((time.time() - t0) * 1000)

    critique = critic_response.content
    tokens = getattr(critic_response, "usage_metadata", None)
    token_count = tokens.get("total_tokens", 0) if tokens else 0
    total_tokens += token_count

    tracer.emit(
        event_type="LLM_RESPONSE",
        status="SUCCESS",
        latency=latency,
        token_usage=token_count,
        prompt=critic_prompt,
        response=critique,
    )

    # --- Step 3: Revisor ---
    revise_prompt = (
        "Rewrite the answer to the task below, incorporating the critique provided.\n\n"
        f"Task: {task}\n\n"
        f"Original answer:\n{initial_answer}\n\n"
        f"Critique:\n{critique}\n\n"
        "Provide a revised, improved answer that addresses all points raised."
    )
    t0 = time.time()
    revise_response = llm.invoke([{"role": "user", "content": revise_prompt}])
    latency = int((time.time() - t0) * 1000)

    final_answer = revise_response.content
    tokens = getattr(revise_response, "usage_metadata", None)
    token_count = tokens.get("total_tokens", 0) if tokens else 0
    total_tokens += token_count

    tracer.emit(
        event_type="LLM_RESPONSE",
        status="SUCCESS",
        latency=latency,
        token_usage=token_count,
        prompt=revise_prompt,
        response=final_answer,
    )
    tracer.emit(
        event_type="RUN_COMPLETED",
        status="SUCCESS",
        token_usage=total_tokens,
        response=final_answer,
    )

    return {
        "status": "SUCCESS",
        "final_output": final_answer,
        "total_tokens": total_tokens,
        "error": None,
    }


_DETAILS = {
    "steps": [
        {
            "name": "Generator",
            "eventType": "LLM_RESPONSE",
            "description": "Produces an initial draft answer to the task as thoroughly as possible.",
            "prompt": "Answer the following task as thoroughly as you can:\n\nTask: {task}",
            "promptLabel": "Prompt Template",
            "tools": [],
            "conditional": False,
        },
        {
            "name": "Critic",
            "eventType": "LLM_RESPONSE",
            "description": "Reviews the draft answer and identifies inaccuracies, gaps, and areas for improvement.",
            "prompt": (
                "You are a critical reviewer. Evaluate the answer below for the given task.\n\n"
                "Task: {task}\n\n"
                "Answer to review:\n{initial_answer}\n\n"
                "Identify any inaccuracies, gaps, or areas for improvement. "
                "Be specific and constructive."
            ),
            "promptLabel": "Prompt Template",
            "tools": [],
            "conditional": False,
        },
        {
            "name": "Revisor",
            "eventType": "LLM_RESPONSE",
            "description": "Rewrites the answer incorporating all points raised in the critique.",
            "prompt": (
                "Rewrite the answer to the task below, incorporating the critique provided.\n\n"
                "Task: {task}\n\n"
                "Original answer:\n{initial_answer}\n\n"
                "Critique:\n{critique}\n\n"
                "Provide a revised, improved answer that addresses all points raised."
            ),
            "promptLabel": "Prompt Template",
            "tools": [],
            "conditional": False,
        },
        {
            "name": "Run Complete",
            "eventType": "RUN_COMPLETED",
            "description": "Returns the final revised answer. Always marks the run as SUCCESS.",
            "prompt": None,
            "promptLabel": None,
            "tools": [],
            "conditional": False,
        },
    ],
    "toolsAvailable": [],
    "maxRetries": None,
    "retryNote": None,
    "workflowType": "sequential",
}

register(AgentDefinition(
    id="critic_agent",
    name="Critic Agent",
    description=(
        "Generates a first-draft answer, then runs a critic pass that evaluates "
        "and rewrites it for accuracy and completeness."
    ),
    run_fn=_run,
    details=_DETAILS,
))
