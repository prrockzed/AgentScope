package com.agentscope.service;

import com.agentscope.dto.TraceStepDto;
import com.agentscope.dto.TraceStepRequest;
import com.agentscope.model.TraceStep;
import com.agentscope.repository.TraceStepRepository;
import com.agentscope.websocket.TraceWebSocketHandler;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class TraceService {

    private static final Logger log = LoggerFactory.getLogger(TraceService.class);

    private final TraceStepRepository traceStepRepository;
    private final TraceWebSocketHandler traceWebSocketHandler;
    private final ObjectMapper objectMapper;

    public TraceService(TraceStepRepository traceStepRepository,
                        TraceWebSocketHandler traceWebSocketHandler) {
        this.traceStepRepository = traceStepRepository;
        this.traceWebSocketHandler = traceWebSocketHandler;
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    public TraceStepDto saveTraceStep(UUID runId, TraceStepRequest request) {
        TraceStep step = new TraceStep();
        step.setId(UUID.randomUUID());
        step.setRunId(runId);
        step.setStepNumber(request.stepNumber());
        step.setToolName(request.toolName());
        step.setEventType(request.eventType());
        step.setPrompt(request.prompt());
        step.setResponse(request.response());
        step.setLatency(request.latency());
        step.setTokenUsage(request.tokenUsage());
        step.setStatus(request.status());
        step.setCreatedAt(Instant.now());

        traceStepRepository.save(step);

        TraceStepDto dto = toDto(step);
        broadcastStep(dto);
        return dto;
    }

    public List<TraceStepDto> getTraceSteps(UUID runId) {
        return traceStepRepository.findByRunIdOrderByStepNumberAsc(runId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    private void broadcastStep(TraceStepDto dto) {
        try {
            String json = objectMapper.writeValueAsString(dto);
            traceWebSocketHandler.broadcast(json);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize trace step for broadcast: {}", e.getMessage());
        }
    }

    private TraceStepDto toDto(TraceStep step) {
        return new TraceStepDto(
                step.getId(),
                step.getRunId(),
                step.getStepNumber(),
                step.getToolName(),
                step.getEventType(),
                step.getPrompt(),
                step.getResponse(),
                step.getLatency(),
                step.getTokenUsage(),
                step.getStatus(),
                step.getCreatedAt()
        );
    }
}
