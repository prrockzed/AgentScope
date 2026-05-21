from typing import TypedDict


class ModelInfo(TypedDict):
    id: str
    name: str
    description: str
    provider: str  # "ollama" | "groq" | "openai" | "anthropic" | "gemini"


SUPPORTED_MODELS: list[ModelInfo] = [
    # ── Ollama (local) ───────────────────────────────────────────────────────
    {"id": "tinyllama:latest",  "name": "TinyLlama",     "description": "Ultra-light model for quick prototyping",          "provider": "ollama"},
    {"id": "qwen3:4b",          "name": "Qwen3 4B",      "description": "Fast, balanced — good default for most tasks",     "provider": "ollama"},
    {"id": "qwen3:8b",          "name": "Qwen3 8B",      "description": "Larger Qwen3; better reasoning, slower",           "provider": "ollama"},
    {"id": "llama3.2:3b",       "name": "Llama 3.2 3B",  "description": "Meta's compact Llama — very fast",                "provider": "ollama"},
    {"id": "llama3.1:8b",       "name": "Llama 3.1 8B",  "description": "Meta's capable 8B Llama",                         "provider": "ollama"},
    {"id": "mistral:7b",        "name": "Mistral 7B",    "description": "Strong general-purpose model",                    "provider": "ollama"},

    # ── Groq (cloud) ─────────────────────────────────────────────────────────
    {"id": "groq/llama-3.3-70b-versatile", "name": "Llama 3.3 70B (Groq)", "description": "Fast 70B Llama via Groq — strong reasoning",    "provider": "groq"},
    {"id": "groq/llama-3.1-8b-instant",    "name": "Llama 3.1 8B (Groq)", "description": "Ultra-fast 8B Llama via Groq",                  "provider": "groq"},
    {"id": "groq/mixtral-8x7b-32768",      "name": "Mixtral 8x7B (Groq)", "description": "Long-context Mixtral via Groq",                 "provider": "groq"},

    # ── OpenAI (cloud) ───────────────────────────────────────────────────────
    {"id": "openai/gpt-4o",      "name": "GPT-4o (Openai)",      "description": "OpenAI's flagship multimodal model",              "provider": "openai"},
    {"id": "openai/gpt-4o-mini", "name": "GPT-4o Mini (Openai)", "description": "Fast, affordable GPT-4o variant",                 "provider": "openai"},

    # ── Anthropic (cloud) ────────────────────────────────────────────────────
    {"id": "anthropic/claude-3-5-sonnet-20241022", "name": "Claude 3.5 Sonnet (Anthropic)", "description": "Anthropic's best balance of speed and intelligence", "provider": "anthropic"},
    {"id": "anthropic/claude-3-haiku-20240307",    "name": "Claude 3 Haiku (Anthropic)",    "description": "Anthropic's fastest and most compact model",          "provider": "anthropic"},

    # ── Google Gemini (cloud) ─────────────────────────────────────────────────
    {"id": "gemini/gemini-2.0-flash",  "name": "Gemini 2.0 Flash (Google)",  "description": "Google's fast, efficient multimodal model",          "provider": "gemini"},
    {"id": "gemini/gemini-1.5-pro",    "name": "Gemini 1.5 Pro (Google)",    "description": "Google's high-capability long-context model",        "provider": "gemini"},
]
