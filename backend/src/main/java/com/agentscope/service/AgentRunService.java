package com.agentscope.service;

import com.agentscope.dto.AgentRunDto;
import com.agentscope.dto.CreateRunRequest;
import com.agentscope.exception.ResourceNotFoundException;
import com.agentscope.model.AgentRun;
import com.agentscope.repository.AgentRunRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class AgentRunService {

    private static final Logger log = LoggerFactory.getLogger(AgentRunService.class);

    private final AgentRunRepository agentRunRepository;
    private final RestTemplate restTemplate;
    private final FailureDetectionService failureDetectionService;

    @Value("${runtime.base-url}")
    private String runtimeBaseUrl;

    public AgentRunService(AgentRunRepository agentRunRepository, RestTemplate restTemplate,
                           FailureDetectionService failureDetectionService) {
        this.agentRunRepository = agentRunRepository;
        this.restTemplate = restTemplate;
        this.failureDetectionService = failureDetectionService;
    }

    public AgentRunDto createAndExecuteRun(CreateRunRequest request) {
        UUID runId = UUID.randomUUID();

        AgentRun run = new AgentRun();
        run.setId(runId);
        run.setTask(request.task());
        run.setStatus("RUNNING");
        run.setCreatedAt(Instant.now());
        agentRunRepository.save(run);

        startRunThread(runId, request.task(), "run-" + runId);

        return toDto(run);
    }

    public List<AgentRunDto> getAllRuns() {
        return agentRunRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    public AgentRunDto getRun(UUID id) {
        AgentRun run = agentRunRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Run not found: " + id));
        return toDto(run);
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
                run.getFailureReason()
        );
    }

    private record RuntimeExecuteRequest(String task, String run_id) {}

    private record RuntimeExecuteResponse(
            String status,
            Long total_latency,
            Integer total_tokens
    ) {}
}
