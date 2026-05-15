from abc import ABC, abstractmethod
from typing import Any


class BaseTool(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Unique identifier for the tool."""

    @property
    @abstractmethod
    def description(self) -> str:
        """Human-readable description shown to the planner LLM."""

    @abstractmethod
    def run(self, **kwargs: Any) -> str:
        """Execute the tool and return a string result."""
