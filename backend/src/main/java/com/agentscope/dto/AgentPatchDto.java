package com.agentscope.dto;

import java.time.Instant;
import java.util.UUID;

public record AgentPatchDto(
        UUID id,
        String agentType,
        UUID sourceRunId,
        String evaluatorModel,
        String title,
        String instruction,
        String rationale,
        String status,
        String errorMessage,
        Instant createdAt,
        Instant activatedAt,
        Instant rejectedAt,
        Instant revokedAt
) {}
