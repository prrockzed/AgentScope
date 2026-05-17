package com.agentscope.dto;

import java.time.Instant;

public record FailureSummaryDto(
        String reason,
        long count,
        Instant lastSeenAt
) {}
