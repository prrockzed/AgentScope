package com.agentscope.dto;

import java.time.Instant;
import java.util.UUID;

public record RegressionTestDto(
        UUID id,
        String input,
        String expectedFailure,
        String type,
        Instant createdAt,
        String latestStatus
) {}
