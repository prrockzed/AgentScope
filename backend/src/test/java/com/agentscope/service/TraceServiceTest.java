package com.agentscope.service;

import com.agentscope.dto.TraceStepDto;
import com.agentscope.dto.TraceStepRequest;
import com.agentscope.model.TraceStep;
import com.agentscope.repository.TraceStepRepository;
import com.agentscope.websocket.TraceWebSocketHandler;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TraceServiceTest {

    @Mock
    private TraceStepRepository traceStepRepository;

    @Mock
    private TraceWebSocketHandler traceWebSocketHandler;

    @InjectMocks
    private TraceService traceService;

    @Test
    void saveTraceStep_persistsStepAndBroadcasts() {
        when(traceStepRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        doNothing().when(traceWebSocketHandler).broadcast(anyString());

        UUID runId = UUID.randomUUID();
        TraceStepRequest request = new TraceStepRequest(
                1, "calculator", "TOOL_CALL",
                "what is 2+2", "4", 50L, 5, "SUCCESS"
        );

        TraceStepDto result = traceService.saveTraceStep(runId, request);

        assertThat(result.runId()).isEqualTo(runId);
        assertThat(result.stepNumber()).isEqualTo(1);
        assertThat(result.eventType()).isEqualTo("TOOL_CALL");
        assertThat(result.status()).isEqualTo("SUCCESS");

        verify(traceStepRepository).save(any(TraceStep.class));
        verify(traceWebSocketHandler).broadcast(anyString());
    }

    @Test
    void getTraceSteps_returnsOrderedDtosForRun() {
        UUID runId = UUID.randomUUID();
        TraceStep s1 = buildStep(runId, 1);
        TraceStep s2 = buildStep(runId, 2);
        when(traceStepRepository.findByRunIdOrderByStepNumberAsc(runId))
                .thenReturn(List.of(s1, s2));

        List<TraceStepDto> dtos = traceService.getTraceSteps(runId);

        assertThat(dtos).hasSize(2);
        assertThat(dtos.get(0).stepNumber()).isEqualTo(1);
        assertThat(dtos.get(1).stepNumber()).isEqualTo(2);
    }

    private TraceStep buildStep(UUID runId, int stepNumber) {
        TraceStep step = new TraceStep();
        step.setId(UUID.randomUUID());
        step.setRunId(runId);
        step.setStepNumber(stepNumber);
        step.setEventType("TOOL_CALL");
        step.setLatency(100L);
        step.setTokenUsage(10);
        step.setStatus("SUCCESS");
        step.setCreatedAt(Instant.now());
        return step;
    }
}
