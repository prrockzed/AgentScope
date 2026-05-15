"""Tests for OutputValidator and Tracer."""

import pytest

from app.tracing.tracer import Tracer
from app.validators.output_validator import OutputValidator


# ---------------------------------------------------------------------------
# OutputValidator
# ---------------------------------------------------------------------------

class TestOutputValidator:
    def setup_method(self):
        self.validator = OutputValidator()

    def test_valid_output_passes(self):
        result = self.validator.validate("This is a valid response")
        assert result.passed is True
        assert result.reason is None

    def test_none_fails_with_empty_response(self):
        result = self.validator.validate(None)
        assert result.passed is False
        assert result.reason == "EMPTY_RESPONSE"

    def test_empty_string_fails(self):
        result = self.validator.validate("")
        assert result.passed is False
        assert result.reason == "EMPTY_RESPONSE"

    def test_whitespace_only_fails(self):
        result = self.validator.validate("   \n\t  ")
        assert result.passed is False
        assert result.reason == "EMPTY_RESPONSE"

    def test_single_char_passes(self):
        result = self.validator.validate("x")
        assert result.passed is True


# ---------------------------------------------------------------------------
# Tracer
# ---------------------------------------------------------------------------

class TestTracer:
    def setup_method(self):
        self.run_id = "test-run-123"
        self.tracer = Tracer(run_id=self.run_id)

    def test_initial_state(self):
        assert self.tracer.run_id == self.run_id
        assert self.tracer.steps == []

    def test_step_counter_increments(self):
        self.tracer.emit(event_type="LLM_RESPONSE", status="SUCCESS")
        self.tracer.emit(event_type="TOOL_CALL", status="SUCCESS")
        self.tracer.emit(event_type="RUN_COMPLETED", status="SUCCESS")

        assert len(self.tracer.steps) == 3
        assert self.tracer.steps[0]["step"] == 1
        assert self.tracer.steps[1]["step"] == 2
        assert self.tracer.steps[2]["step"] == 3

    def test_run_id_on_every_event(self):
        self.tracer.emit(event_type="LLM_RESPONSE", status="SUCCESS")
        self.tracer.emit(event_type="TOOL_CALL", status="FAILED")

        for step in self.tracer.steps:
            assert step["run_id"] == self.run_id

    def test_all_fields_present(self):
        self.tracer.emit(
            event_type="TOOL_CALL",
            status="SUCCESS",
            latency=123,
            token_usage=50,
            tool_name="calculator",
            prompt="3 + 4",
            response="7",
        )

        step = self.tracer.steps[0]
        required_fields = {
            "run_id", "step", "event_type", "tool_name",
            "timestamp", "latency", "token_usage", "status",
            "prompt", "response",
        }
        assert required_fields == set(step.keys())

    def test_event_field_values(self):
        self.tracer.emit(
            event_type="TOOL_CALL",
            status="SUCCESS",
            latency=200,
            token_usage=75,
            tool_name="fetch_website",
            prompt="http://example.com",
            response="Example content",
        )

        step = self.tracer.steps[0]
        assert step["event_type"] == "TOOL_CALL"
        assert step["status"] == "SUCCESS"
        assert step["latency"] == 200
        assert step["token_usage"] == 75
        assert step["tool_name"] == "fetch_website"
        assert step["prompt"] == "http://example.com"
        assert step["response"] == "Example content"

    def test_optional_fields_default_to_none(self):
        self.tracer.emit(event_type="RUN_COMPLETED", status="SUCCESS")
        step = self.tracer.steps[0]
        assert step["tool_name"] is None
        assert step["prompt"] is None
        assert step["response"] is None

    def test_timestamp_is_iso_format(self):
        self.tracer.emit(event_type="LLM_RESPONSE", status="SUCCESS")
        from datetime import datetime
        ts = self.tracer.steps[0]["timestamp"]
        # Should not raise
        datetime.fromisoformat(ts)
