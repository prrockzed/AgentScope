import json
from typing import Optional


class ValidationResult:
    def __init__(self, passed: bool, reason: Optional[str] = None) -> None:
        self.passed = passed
        self.reason = reason


class EmptyResponseValidator:
    def validate(self, output: Optional[str]) -> ValidationResult:
        if output is None or not output.strip():
            return ValidationResult(passed=False, reason="EMPTY_RESPONSE")
        return ValidationResult(passed=True)


class MalformedJsonValidator:
    def validate(self, output: Optional[str]) -> ValidationResult:
        if output is None:
            return ValidationResult(passed=True)
        stripped = output.strip()
        if stripped.startswith('{') or stripped.startswith('['):
            try:
                json.loads(stripped)
            except (json.JSONDecodeError, ValueError):
                return ValidationResult(passed=False, reason="MALFORMED_JSON")
        return ValidationResult(passed=True)


class HallucinationHintValidator:
    _PHRASES = [
        "i don't have", "i do not have", "i cannot", "i can't",
        "as an ai", "as a language model", "i'm not able",
        "i am not able", "i'm unable", "i am unable",
        "i don't know", "i do not know",
    ]

    def validate(self, output: Optional[str]) -> ValidationResult:
        if output is None:
            return ValidationResult(passed=True)
        lower = output.lower()
        for phrase in self._PHRASES:
            if phrase in lower:
                return ValidationResult(passed=False, reason="HALLUCINATION_DETECTED")
        return ValidationResult(passed=True)


class TimeoutValidator:
    _PHRASES = ["timed out", "timeout", "connection error", "request failed"]

    def validate(self, output: Optional[str]) -> ValidationResult:
        if output is None:
            return ValidationResult(passed=True)
        lower = output.lower()
        for phrase in self._PHRASES:
            if phrase in lower:
                return ValidationResult(passed=False, reason="TIMEOUT")
        return ValidationResult(passed=True)


class OutputValidator:
    _VALIDATORS = [
        EmptyResponseValidator(),
        MalformedJsonValidator(),
        TimeoutValidator(),
    ]

    def validate(self, output: Optional[str]) -> ValidationResult:
        for v in self._VALIDATORS:
            result = v.validate(output)
            if not result.passed:
                return result
        return ValidationResult(passed=True)
