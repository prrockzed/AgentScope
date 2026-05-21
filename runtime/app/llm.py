"""LiteLLM-backed chat wrapper.

Provides a single class, LiteLLMChat, that the agents call exactly like they
called ChatOllama:

    response = llm.invoke(messages)
    content  = response.content
    tokens   = response.usage_metadata.get("total_tokens", 0)

Model ID convention
-------------------
- Ollama models  : bare model name, e.g. "qwen3:4b"
  Internally prefixed with "ollama_chat/" and routed to the local Ollama URL.
- Cloud models   : full LiteLLM provider/model string, e.g.
    "groq/llama-3.3-70b-versatile"
    "openai/gpt-4o"
    "anthropic/claude-3-5-sonnet-20241022"
  API keys are read automatically from the environment:
    GROQ_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.

Adding a new provider in future = add model strings to models.py and set the
corresponding env var. No code changes needed here or in the agents.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import litellm

# Silence LiteLLM's verbose output
litellm.suppress_debug_info = True
litellm.set_verbose = False


@dataclass
class _LLMResponse:
    """Minimal response object that matches what agents expect."""
    content: str
    usage_metadata: dict[str, int]


class LiteLLMChat:
    """Thin wrapper around litellm.completion() with a .invoke() interface."""

    def __init__(self, model: str, ollama_base_url: str = "http://localhost:11434") -> None:
        if "/" not in model:
            # No provider prefix → Ollama local model
            self._model = f"ollama_chat/{model}"
            self._api_base: str | None = ollama_base_url
        else:
            # Provider-prefixed cloud model (groq/..., openai/..., anthropic/...)
            self._model = model
            self._api_base = None

    def invoke(self, messages: list[dict[str, Any]]) -> _LLMResponse:
        kwargs: dict[str, Any] = {
            "model": self._model,
            "messages": messages,
        }
        if self._api_base:
            kwargs["api_base"] = self._api_base

        response = litellm.completion(**kwargs)
        content: str = response.choices[0].message.content or ""
        total_tokens: int = response.usage.total_tokens if response.usage else 0

        return _LLMResponse(
            content=content,
            usage_metadata={"total_tokens": total_tokens},
        )
