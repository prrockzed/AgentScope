from typing import Optional


class ValidationResult:
    def __init__(self, passed: bool, reason: Optional[str] = None) -> None:
        self.passed = passed
        self.reason = reason


class OutputValidator:
    def validate(self, output: Optional[str]) -> ValidationResult:
        if output is None:
            return ValidationResult(passed=False, reason="EMPTY_RESPONSE")
        if not output.strip():
            return ValidationResult(passed=False, reason="EMPTY_RESPONSE")
        return ValidationResult(passed=True)
