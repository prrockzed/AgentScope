package com.agentscope.service;

import com.agentscope.dto.AgentRunDto;
import com.agentscope.dto.CreateRunRequest;
import com.agentscope.dto.FailureSummaryDto;
import com.agentscope.exception.ResourceNotFoundException;
import com.agentscope.model.AgentRun;
import com.agentscope.repository.AgentRunRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class AgentRunService {

    private static final Logger log = LoggerFactory.getLogger(AgentRunService.class);

    private final AgentRunRepository agentRunRepository;
    private final RestTemplate restTemplate;
    private final FailureDetectionService failureDetectionService;
    private final EvaluationService evaluationService;
    private final MeterRegistry meterRegistry;

    @Value("${runtime.base-url}")
    private String runtimeBaseUrl;

    @Value("${ollama.model:qwen3:4b}")
    private String ollamaModel;

    public AgentRunService(AgentRunRepository agentRunRepository, RestTemplate restTemplate,
                           FailureDetectionService failureDetectionService,
                           EvaluationService evaluationService,
                           MeterRegistry meterRegistry) {
        this.agentRunRepository = agentRunRepository;
        this.restTemplate = restTemplate;
        this.failureDetectionService = failureDetectionService;
        this.evaluationService = evaluationService;
        this.meterRegistry = meterRegistry;
    }

    public AgentRunDto createAndExecuteRun(CreateRunRequest request) {
        UUID runId = UUID.randomUUID();

        AgentRun run = new AgentRun();
        run.setId(runId);
        run.setTask(request.task());
        run.setStatus("RUNNING");
        run.setCreatedAt(Instant.now());
        run.setModel(ollamaModel);
        agentRunRepository.save(run);

        startRunThread(runId, request.task(), "run-" + runId);

        return toDto(run);
    }

    public List<AgentRunDto> getAllRuns() {
        return agentRunRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDto)
                .toList();
    }

    public AgentRunDto getRun(UUID id) {
        AgentRun run = agentRunRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Run not found: " + id));
        return toDto(run);
    }

    public List<FailureSummaryDto> getFailureSummary() {
        return agentRunRepository.findFailureSummary().stream()
                .map(row -> new FailureSummaryDto(
                        (String)  row[0],
                        (Long)    row[1],
                        (Instant) row[2]
                ))
                .toList();
    }

    public AgentRunDto replayRun(UUID originalId) {
        AgentRun original = agentRunRepository.findById(originalId)
                .orElseThrow(() -> new ResourceNotFoundException("Run not found: " + originalId));

        UUID newRunId = UUID.randomUUID();
        AgentRun newRun = new AgentRun();
        newRun.setId(newRunId);
        newRun.setTask(original.getTask());
        newRun.setStatus("RUNNING");
        newRun.setCreatedAt(Instant.now());
        newRun.setReplayOf(original.getId());
        newRun.setModel(ollamaModel);
        agentRunRepository.save(newRun);

        startRunThread(newRunId, original.getTask(), "replay-" + newRunId);

        return toDto(newRun);
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    private void startRunThread(UUID runId, String task, String threadName) {
        Thread thread = new Thread(() -> executeRuntime(runId, task), threadName);
        thread.setDaemon(true);
        thread.start();
    }

    private void executeRuntime(UUID runId, String task) {
        String status = "FAILED";
        Long latency = null;
        Integer tokens = null;

        try {
            RuntimeExecuteRequest runtimeRequest = new RuntimeExecuteRequest(task, runId.toString());
            RuntimeExecuteResponse runtimeResponse = restTemplate.postForObject(
                    runtimeBaseUrl + "/execute",
                    runtimeRequest,
                    RuntimeExecuteResponse.class
            );

            if (runtimeResponse != null) {
                status = runtimeResponse.status();
                latency = runtimeResponse.total_latency();
                tokens = runtimeResponse.total_tokens();
            }
        } catch (RestClientException e) {
            log.error("Runtime call failed for run {}: {}", runId, e.getMessage());
        }

        final String finalStatus = status;
        final Long finalLatency = latency;
        final Integer finalTokens = tokens;

        agentRunRepository.findById(runId).ifPresent(run -> {
            run.setStatus(finalStatus);
            run.setTotalLatency(finalLatency);
            run.setTotalTokens(finalTokens);
            agentRunRepository.save(run);
        });

        failureDetectionService.analyze(runId);
        evaluationService.onRunComplete(runId);
        recordMetrics(runId, finalStatus, finalLatency, finalTokens);
    }

    private void recordMetrics(UUID runId, String status, Long latencyMs, Integer tokens) {
        Counter.builder("agentscope.runs")
                .tag("status", status != null ? status : "UNKNOWN")
                .description("Total completed agent runs by status")
                .register(meterRegistry)
                .increment();

        if (latencyMs != null) {
            Timer.builder("agentscope.run.duration")
                    .description("Agent run duration")
                    .register(meterRegistry)
                    .record(latencyMs, TimeUnit.MILLISECONDS);
        }

        if (tokens != null) {
            Counter.builder("agentscope.tokens")
                    .description("Total LLM tokens consumed")
                    .register(meterRegistry)
                    .increment(tokens);
        }

        if ("FAILED".equals(status)) {
            agentRunRepository.findById(runId).ifPresent(run -> {
                String reason = run.getFailureReason() != null ? run.getFailureReason() : "UNKNOWN";
                Counter.builder("agentscope.failures")
                        .tag("reason", reason)
                        .description("Total agent run failures by reason")
                        .register(meterRegistry)
                        .increment();
            });
        }
    }

    private AgentRunDto toDto(AgentRun run) {
        return new AgentRunDto(
                run.getId(),
                run.getTask(),
                run.getStatus(),
                run.getCreatedAt(),
                run.getTotalLatency(),
                run.getTotalTokens(),
                run.getReplayOf(),
                run.getFailureReason(),
                run.getModel()
        );
    }

    private record RuntimeExecuteRequest(String task, String run_id) {}

    private record RuntimeExecuteResponse(
            String status,
            Long total_latency,
            Integer total_tokens
    ) {}
}
