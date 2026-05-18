package com.agentscope.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record RegressionResultDto(
        UUID id,
        UUID baselineRunId,
        UUID candidateRunId,
        String task,
        String baselineModel,
        String candidateModel,
        String baselineAgentType,
        String candidateAgentType,
        Long latencyDelta,
        Integer tokenDelta,
        Integer retryDelta,
        String baselineStatus,
        String candidateStatus,
        BigDecimal score,
        Instant createdAt
) {}
