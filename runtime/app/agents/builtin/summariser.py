"""Summariser — fetches a URL or reads provided content, then produces a
concise structured summary with key points and takeaways."""

import re
import time
from typing import Any

from langchain_ollama import ChatOllama

from app.agents.registry import AgentDefinition, register
from app.tools.fetch_website import FetchWebsiteTool
from app.tracing.tracer import Tracer

_fetcher = FetchWebsiteTool()

_SUMMARY_PROMPT_TEMPLATE = (
    "You are a summariser. Produce a concise, structured summary of the following content.\n\n"
    "Format your response as:\n"
    "## Summary\n<2-3 sentence overview>\n\n"
    "## Key Points\n- <point 1>\n- <point 2>\n- ...\n\n"
    "## Takeaways\n<1-2 key takeaways>\n\n"
    "Content to summarise:\n{content}"
)


def _run(
    task: str,
    run_id: str,
    tracer: Tracer,
    model: str,
    base_url: str,
) -> dict[str, Any]:
    llm = ChatOllama(model=model, base_url=base_url)
    content = task

    # If the task contains a URL, fetch the page content first
    url_match = re.search(r"https?://\S+", task)
    if url_match:
        url = url_match.group().rstrip(".,;)")
        t0 = time.time()
        try:
            web_content = _fetcher.run(url=url)
            latency = int((time.time() - t0) * 1000)
            tracer.emit(
                event_type="TOOL_CALL",
                status="SUCCESS",
                latency=latency,
                tool_name="fetch_website",
                prompt=url,
                response=web_content[:500] + "…" if len(web_content) > 500 else web_content,
            )
            content = f"URL: {url}\n\nFetched content:\n{web_content}"
        except Exception as exc:
            latency = int((time.time() - t0) * 1000)
            tracer.emit(
                event_type="TOOL_CALL",
                status="FAILED",
                latency=latency,
                tool_name="fetch_website",
                prompt=url,
                response=str(exc),
            )
            # Fall back to summarising the original task text

    prompt = _SUMMARY_PROMPT_TEMPLATE.format(content=content)

    t0 = time.time()
    response = llm.invoke([{"role": "user", "content": prompt}])
    latency = int((time.time() - t0) * 1000)

    output = response.content
    tokens = getattr(response, "usage_metadata", None)
    token_count = tokens.get("total_tokens", 0) if tokens else 0

    tracer.emit(
        event_type="LLM_RESPONSE",
        status="SUCCESS",
        latency=latency,
        token_usage=token_count,
        prompt=prompt[:300] + "…" if len(prompt) > 300 else prompt,
        response=output,
    )
    tracer.emit(
        event_type="RUN_COMPLETED",
        status="SUCCESS",
        token_usage=token_count,
        response=output,
    )

    return {
        "status": "SUCCESS",
        "final_output": output,
        "total_tokens": token_count,
        "error": None,
    }


_DETAILS = {
    "steps": [
        {
            "name": "Web Fetch",
            "eventType": "TOOL_CALL",
            "description": "If the task contains a URL, fetches and cleans the page content. Skipped if no URL is present.",
            "prompt": None,
            "promptLabel": None,
            "tools": ["fetch_website"],
            "conditional": True,
        },
        {
            "name": "Summarization",
            "eventType": "LLM_RESPONSE",
            "description": "Produces a structured summary with a 2\u20133 sentence overview, key points, and takeaways.",
            "prompt": (
                "You are a summariser. Produce a concise, structured summary of the following content.\n\n"
                "Format your response as:\n"
                "## Summary\n<2-3 sentence overview>\n\n"
                "## Key Points\n- <point 1>\n- <point 2>\n- ...\n\n"
                "## Takeaways\n<1-2 key takeaways>\n\n"
                "Content to summarise:\n{content}"
            ),
            "promptLabel": "Prompt Template",
            "tools": [],
            "conditional": False,
        },
        {
            "name": "Run Complete",
            "eventType": "RUN_COMPLETED",
            "description": "Returns the structured summary. Always marks the run as SUCCESS.",
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
    id="summariser",
    name="Summariser",
    description=(
        "Fetches a URL or reads provided content, then produces a concise "
        "structured summary with key points and takeaways."
    ),
    run_fn=_run,
    details=_DETAILS,
))
