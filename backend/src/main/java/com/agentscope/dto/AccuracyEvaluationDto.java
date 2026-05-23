package com.agentscope.dto;

import java.time.Instant;
import java.util.UUID;

public record AccuracyEvaluationDto(
        UUID id,
        UUID runId,
        Integer accuracyScore,
        String scoreReasoning,
        String taskFit,
        String actionRecommendation,
        String recommendationReasoning,
        String evaluatorModel,
        String evalStatus,
        String errorMessage,
        Instant createdAt,
        Instant completedAt
) {}
