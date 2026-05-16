package com.agentscope.dto;

public record TraceStepRequest(
        int stepNumber,
        String toolName,
        String eventType,
        String prompt,
        String response,
        long latency,
        int tokenUsage,
        String status
) {}
