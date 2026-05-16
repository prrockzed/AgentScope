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

    @Value("${runtime.base-url}")
    private String runtimeBaseUrl;

    public AgentRunService(AgentRunRepository agentRunRepository, RestTemplate restTemplate) {
        this.agentRunRepository = agentRunRepository;
        this.restTemplate = restTemplate;
    }

    public AgentRunDto createAndExecuteRun(CreateRunRequest request) {
        UUID runId = UUID.randomUUID();

        AgentRun run = new AgentRun();
        run.setId(runId);
        run.setStatus("RUNNING");
        run.setCreatedAt(Instant.now());
        agentRunRepository.save(run);

        try {
            RuntimeExecuteRequest runtimeRequest = new RuntimeExecuteRequest(request.task(), runId.toString());
            RuntimeExecuteResponse runtimeResponse = restTemplate.postForObject(
                    runtimeBaseUrl + "/execute",
                    runtimeRequest,
                    RuntimeExecuteResponse.class
            );

            if (runtimeResponse != null) {
                run.setStatus(runtimeResponse.status());
                run.setTotalLatency(runtimeResponse.total_latency());
                run.setTotalTokens(runtimeResponse.total_tokens());
            } else {
                run.setStatus("FAILED");
            }
        } catch (RestClientException e) {
            log.error("Runtime call failed for run {}: {}", runId, e.getMessage());
            run.setStatus("FAILED");
        }

        agentRunRepository.save(run);
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

    private AgentRunDto toDto(AgentRun run) {
        return new AgentRunDto(
                run.getId(),
                run.getStatus(),
                run.getCreatedAt(),
                run.getTotalLatency(),
                run.getTotalTokens()
        );
    }

    private record RuntimeExecuteRequest(String task, String run_id) {}

    private record RuntimeExecuteResponse(
            String status,
            Long total_latency,
            Integer total_tokens
    ) {}
}
