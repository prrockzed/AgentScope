package com.agentscope.dto;

import java.time.Instant;
import java.util.UUID;

public record OptimizationSuggestionDto(
        UUID id,
        UUID runId,
        String category,
        String severity,
        String suggestion,
        String source,
        Instant createdAt
) {}
