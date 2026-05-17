from typing import TypedDict


class ModelInfo(TypedDict):
    id: str
    name: str
    description: str


SUPPORTED_MODELS: list[ModelInfo] = [
    {"id": "tinyllama:latest", "name": "TinyLlama",     "description": "Ultra-light model for quick prototyping"},
    {"id": "qwen3:4b",         "name": "Qwen3 4B",      "description": "Fast, balanced — good default for most tasks"},
    {"id": "qwen3:8b",         "name": "Qwen3 8B",      "description": "Larger Qwen3; better reasoning, slower"},
    {"id": "llama3.2:3b",      "name": "Llama 3.2 3B",  "description": "Meta's compact Llama — very fast"},
    {"id": "llama3.1:8b",      "name": "Llama 3.1 8B",  "description": "Meta's capable 8B Llama"},
    {"id": "mistral:7b",       "name": "Mistral 7B",    "description": "Strong general-purpose model"},
]
