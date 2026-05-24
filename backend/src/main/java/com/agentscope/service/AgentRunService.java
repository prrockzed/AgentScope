package com.agentscope.service;

import com.agentscope.dto.AgentRunDto;
import com.agentscope.dto.CreateRunRequest;
import com.agentscope.dto.FailureSummaryDto;
import com.agentscope.exception.ResourceNotFoundException;
import com.agentscope.model.AccuracyEvaluation;
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
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AgentRunService {

    private static final Logger log = LoggerFactory.getLogger(AgentRunService.class);

    private final ConcurrentHashMap<UUID, Thread> activeRunThreads = new ConcurrentHashMap<>();

    private final AgentRunRepository agentRunRepository;
    private final RestTemplate restTemplate;
    private final FailureDetectionService failureDetectionService;
    private final EvaluationService evaluationService;
    private final OptimizationService optimizationService;
    private final RegressionComparisonService regressionComparisonService;
    private final MemoryService memoryService;
    private final KnowledgeService knowledgeService;
    private final AccuracyEvalService accuracyEvalService;
    private final AgentPatchService agentPatchService;
    private final MeterRegistry meterRegistry;

    @Value("${runtime.base-url}")
    private String runtimeBaseUrl;

    public AgentRunService(AgentRunRepository agentRunRepository, RestTemplate restTemplate,
                           FailureDetectionService failureDetectionService,
                           EvaluationService evaluationService,
                           OptimizationService optimizationService,
                           RegressionComparisonService regressionComparisonService,
                           MemoryService memoryService,
                           KnowledgeService knowledgeService,
                           AccuracyEvalService accuracyEvalService,
                           AgentPatchService agentPatchService,
                           MeterRegistry meterRegistry) {
        this.agentRunRepository = agentRunRepository;
        this.restTemplate = restTemplate;
        this.failureDetectionService = failureDetectionService;
        this.evaluationService = evaluationService;
        this.optimizationService = optimizationService;
        this.regressionComparisonService = regressionComparisonService;
        this.memoryService = memoryService;
        this.knowledgeService = knowledgeService;
        this.accuracyEvalService = accuracyEvalService;
        this.agentPatchService = agentPatchService;
        this.meterRegistry = meterRegistry;
    }

    public AgentRunDto createAndExecuteRun(CreateRunRequest request) {
        UUID runId = UUID.randomUUID();
        String agentType = request.agentType() != null ? request.agentType() : "tool_agent";
        String resolvedModel = request.model();

        AgentRun run = new AgentRun();
        run.setId(runId);
        run.setTask(request.task());
        run.setStatus("RUNNING");
        run.setCreatedAt(Instant.now());
        run.setModel(resolvedModel);
        run.setAgentType(agentType);
        agentRunRepository.save(run);

        startRunThread(runId, request.task(), agentType, resolvedModel, "run-" + runId);

        return toDto(run, null);
    }

    public List<AgentRunDto> getAllRuns() {
        List<AgentRun> runs = agentRunRepository.findAllByOrderByCreatedAtDesc();
        List<UUID> runIds = runs.stream().map(AgentRun::getId).toList();
        Map<UUID, AccuracyEvaluation> evalMap = accuracyEvalService.getAllForRuns(runIds);
        return runs.stream()
                .map(run -> toDto(run, evalMap.get(run.getId())))
                .toList();
    }

    public AgentRunDto getRun(UUID id) {
        AgentRun run = agentRunRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Run not found: " + id));
        Map<UUID, AccuracyEvaluation> evalMap = accuracyEvalService.getAllForRuns(List.of(id));
        return toDto(run, evalMap.get(id));
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
        String agentType = original.getAgentType() != null ? original.getAgentType() : "tool_agent";

        String replayModel = original.getModel();

        AgentRun newRun = new AgentRun();
        newRun.setId(newRunId);
        newRun.setTask(original.getTask());
        newRun.setStatus("RUNNING");
        newRun.setCreatedAt(Instant.now());
        newRun.setReplayOf(original.getId());
        newRun.setModel(replayModel);
        newRun.setAgentType(agentType);
        agentRunRepository.save(newRun);

        startRunThread(newRunId, original.getTask(), agentType, replayModel, "replay-" + newRunId);

        return toDto(newRun, null);
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    private void startRunThread(UUID runId, String task, String agentType, String model, String threadName) {
        Thread thread = new Thread(() -> executeRuntime(runId, task, agentType, model), threadName);
        thread.setDaemon(true);
        activeRunThreads.put(runId, thread);
        thread.start();
    }

    private void executeRuntime(UUID runId, String task, String agentType, String model) {
        String status = "FAILED";
        Long latency = null;
        Integer tokens = null;

        try {
            try {
                String knowledgeContext = knowledgeService.getKnowledgeContext(task, model);
                String agentInstructions = agentPatchService.buildAgentInstructions(agentType);
                String combinedContext = combineContexts(agentInstructions, knowledgeContext);
                RuntimeExecuteRequest runtimeRequest = new RuntimeExecuteRequest(task, runId.toString(), agentType, model, combinedContext);
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
                if ("CANCELLED".equals(run.getStatus())) return;
                run.setStatus(finalStatus);
                run.setTotalLatency(finalLatency);
                run.setTotalTokens(finalTokens);
                agentRunRepository.save(run);
            });

            AgentRun saved = agentRunRepository.findById(runId).orElse(null);
            if (saved == null || "CANCELLED".equals(saved.getStatus())) return;

            failureDetectionService.analyze(runId);
            evaluationService.onRunComplete(runId);
            optimizationService.analyze(runId);
            regressionComparisonService.compareIfReplay(runId);
            memoryService.record(runId);
            knowledgeService.recordModelInsight(runId);
            recordMetrics(runId, finalStatus, finalLatency, finalTokens);
        } finally {
            activeRunThreads.remove(runId);
        }
    }

    public void cancelRun(UUID runId) {
        AgentRun run = agentRunRepository.findById(runId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!"RUNNING".equals(run.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Run is not RUNNING");
        }

        run.setStatus("CANCELLED");
        agentRunRepository.save(run);

        try {
            restTemplate.postForObject(runtimeBaseUrl + "/cancel/" + runId, null, Void.class);
        } catch (RestClientException e) {
            log.warn("Could not signal runtime to cancel run {}: {}", runId, e.getMessage());
        }

        Thread t = activeRunThreads.get(runId);
        if (t != null) t.interrupt();
    }

    private String combineContexts(String agentInstructions, String knowledgeContext) {
        if (agentInstructions == null && knowledgeContext == null) return null;
        if (agentInstructions == null) return knowledgeContext;
        if (knowledgeContext == null) return agentInstructions;
        return agentInstructions + "\n\n" + knowledgeContext;
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

    private AgentRunDto toDto(AgentRun run, AccuracyEvaluation eval) {
        return new AgentRunDto(
                run.getId(),
                run.getTask(),
                run.getStatus(),
                run.getCreatedAt(),
                run.getTotalLatency(),
                run.getTotalTokens(),
                run.getReplayOf(),
                run.getFailureReason(),
                run.getModel(),
                run.getAgentType(),
                eval != null ? eval.getAccuracyScore() : null,
                eval != null ? eval.getEvalStatus() : null
        );
    }

    private record RuntimeExecuteRequest(String task, String run_id, String agent_type, String model, String knowledge_context) {}

    private record RuntimeExecuteResponse(
            String status,
            Long total_latency,
            Integer total_tokens
    ) {}
}
