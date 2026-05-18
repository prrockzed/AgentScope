package com.agentscope.service;

import com.agentscope.dto.RegressionResultDto;
import com.agentscope.model.AgentRun;
import com.agentscope.model.RegressionResult;
import com.agentscope.repository.AgentRunRepository;
import com.agentscope.repository.RegressionResultRepository;
import com.agentscope.repository.TraceStepRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class RegressionComparisonService {

    private final RegressionResultRepository repo;
    private final AgentRunRepository agentRunRepo;
    private final TraceStepRepository traceRepo;

    public RegressionComparisonService(RegressionResultRepository repo,
                                       AgentRunRepository agentRunRepo,
                                       TraceStepRepository traceRepo) {
        this.repo = repo;
        this.agentRunRepo = agentRunRepo;
        this.traceRepo = traceRepo;
    }

    public void compareIfReplay(UUID runId) {
        if (repo.existsByCandidateRunId(runId)) return;

        AgentRun candidate = agentRunRepo.findById(runId).orElse(null);
        if (candidate == null || candidate.getReplayOf() == null) return;

        AgentRun baseline = agentRunRepo.findById(candidate.getReplayOf()).orElse(null);
        if (baseline == null) return;

        long baselineRetries = countRetries(baseline.getId());
        long candidateRetries = countRetries(candidate.getId());

        Long latencyDelta = delta(candidate.getTotalLatency(), baseline.getTotalLatency());
        Integer tokenDelta = intDelta(candidate.getTotalTokens(), baseline.getTotalTokens());
        int retryDelta = (int) (candidateRetries - baselineRetries);

        BigDecimal score = computeScore(
                baseline.getStatus(), candidate.getStatus(),
                latencyDelta, tokenDelta, retryDelta,
                baseline.getTotalLatency(), baseline.getTotalTokens());

        RegressionResult result = new RegressionResult();
        result.setId(UUID.randomUUID());
        result.setBaselineRunId(baseline.getId());
        result.setCandidateRunId(candidate.getId());
        result.setLatencyDelta(latencyDelta);
        result.setTokenDelta(tokenDelta);
        result.setRetryDelta(retryDelta);
        result.setBaselineStatus(baseline.getStatus());
        result.setCandidateStatus(candidate.getStatus());
        result.setScore(score);
        result.setCreatedAt(Instant.now());
        repo.save(result);
    }

    public List<RegressionResultDto> getAll() {
        return repo.findAllByOrderByCreatedAtDesc().stream()
                .map(r -> {
                    AgentRun baseline = agentRunRepo.findById(r.getBaselineRunId()).orElse(null);
                    AgentRun candidate = agentRunRepo.findById(r.getCandidateRunId()).orElse(null);
                    return new RegressionResultDto(
                            r.getId(),
                            r.getBaselineRunId(),
                            r.getCandidateRunId(),
                            baseline != null ? baseline.getTask() : null,
                            baseline != null ? baseline.getModel() : null,
                            candidate != null ? candidate.getModel() : null,
                            baseline != null ? baseline.getAgentType() : null,
                            candidate != null ? candidate.getAgentType() : null,
                            r.getLatencyDelta(),
                            r.getTokenDelta(),
                            r.getRetryDelta(),
                            r.getBaselineStatus(),
                            r.getCandidateStatus(),
                            r.getScore(),
                            r.getCreatedAt()
                    );
                })
                .toList();
    }

    private long countRetries(UUID runId) {
        return traceRepo.findByRunIdOrderByStepNumberAsc(runId)
                .stream()
                .filter(s -> "RETRY_TRIGGERED".equals(s.getEventType()))
                .count();
    }

    private Long delta(Long candidate, Long baseline) {
        if (candidate == null || baseline == null) return null;
        return candidate - baseline;
    }

    private Integer intDelta(Integer candidate, Integer baseline) {
        if (candidate == null || baseline == null) return null;
        return candidate - baseline;
    }

    private BigDecimal computeScore(String baselineStatus, String candidateStatus,
                                    Long latencyDelta, Integer tokenDelta, int retryDelta,
                                    Long baselineTotalLatency, Integer baselineTotalTokens) {
        if ("SUCCESS".equals(baselineStatus) && "FAILED".equals(candidateStatus)) {
            return BigDecimal.ONE;
        }
        if ("FAILED".equals(baselineStatus) && "SUCCESS".equals(candidateStatus)) {
            return BigDecimal.ZERO;
        }

        double latencyScore = 0.0;
        if (latencyDelta != null && baselineTotalLatency != null && baselineTotalLatency > 0) {
            latencyScore = Math.max(0.0, (double) latencyDelta / baselineTotalLatency) * 0.5;
        }

        double tokenScore = 0.0;
        if (tokenDelta != null && baselineTotalTokens != null && baselineTotalTokens > 0) {
            tokenScore = Math.max(0.0, (double) tokenDelta / baselineTotalTokens) * 0.3;
        }

        double retryScore = Math.min(Math.max(0, retryDelta) * 0.1, 0.2);

        double total = Math.min(latencyScore + tokenScore + retryScore, 1.0);
        return BigDecimal.valueOf(total).setScale(4, RoundingMode.HALF_UP);
    }
}
