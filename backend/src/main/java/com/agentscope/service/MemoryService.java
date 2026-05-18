package com.agentscope.service;

import com.agentscope.dto.FailurePatternDto;
import com.agentscope.dto.SuccessfulPatternDto;
import com.agentscope.model.AgentRun;
import com.agentscope.model.FailurePattern;
import com.agentscope.model.SuccessfulPattern;
import com.agentscope.repository.AgentRunRepository;
import com.agentscope.repository.FailurePatternRepository;
import com.agentscope.repository.SuccessfulPatternRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class MemoryService {

    private final SuccessfulPatternRepository successRepo;
    private final FailurePatternRepository failureRepo;
    private final AgentRunRepository agentRunRepo;

    public MemoryService(SuccessfulPatternRepository successRepo,
                         FailurePatternRepository failureRepo,
                         AgentRunRepository agentRunRepo) {
        this.successRepo = successRepo;
        this.failureRepo = failureRepo;
        this.agentRunRepo = agentRunRepo;
    }

    public void record(UUID runId) {
        AgentRun run = agentRunRepo.findById(runId).orElse(null);
        if (run == null || "RUNNING".equals(run.getStatus())) return;

        if ("SUCCESS".equals(run.getStatus())) {
            recordSuccess(run);
        } else {
            recordFailure(run);
        }
    }

    private void recordSuccess(AgentRun run) {
        Optional<SuccessfulPattern> existing = successRepo
                .findByTaskAndAgentTypeAndModel(run.getTask(), run.getAgentType(), run.getModel());

        if (existing.isPresent()) {
            SuccessfulPattern p = existing.get();
            p.setAvgLatency(rollingAvg(p.getAvgLatency(), p.getOccurrenceCount(), run.getTotalLatency()));
            p.setAvgTokens(rollingAvgInt(p.getAvgTokens(), p.getOccurrenceCount(), run.getTotalTokens()));
            p.setOccurrenceCount(p.getOccurrenceCount() + 1);
            p.setLastSeen(Instant.now());
            successRepo.save(p);
        } else {
            SuccessfulPattern p = new SuccessfulPattern();
            p.setId(UUID.randomUUID());
            p.setTask(run.getTask());
            p.setAgentType(run.getAgentType());
            p.setModel(run.getModel());
            p.setAvgLatency(run.getTotalLatency());
            p.setAvgTokens(run.getTotalTokens());
            p.setOccurrenceCount(1);
            p.setLastSeen(Instant.now());
            p.setCreatedAt(Instant.now());
            successRepo.save(p);
        }
    }

    private void recordFailure(AgentRun run) {
        String reason = run.getFailureReason() != null ? run.getFailureReason() : "UNKNOWN";
        Optional<FailurePattern> existing = failureRepo
                .findByTaskAndAgentTypeAndModelAndFailureReason(
                        run.getTask(), run.getAgentType(), run.getModel(), reason);

        if (existing.isPresent()) {
            FailurePattern p = existing.get();
            p.setOccurrenceCount(p.getOccurrenceCount() + 1);
            p.setLastSeen(Instant.now());
            failureRepo.save(p);
        } else {
            FailurePattern p = new FailurePattern();
            p.setId(UUID.randomUUID());
            p.setTask(run.getTask());
            p.setAgentType(run.getAgentType());
            p.setModel(run.getModel());
            p.setFailureReason(reason);
            p.setOccurrenceCount(1);
            p.setLastSeen(Instant.now());
            p.setCreatedAt(Instant.now());
            failureRepo.save(p);
        }
    }

    private Long rollingAvg(Long existingAvg, int count, Long newValue) {
        if (newValue == null) return existingAvg;
        if (existingAvg == null) return newValue;
        return (existingAvg * count + newValue) / (count + 1);
    }

    private Integer rollingAvgInt(Integer existingAvg, int count, Integer newValue) {
        if (newValue == null) return existingAvg;
        if (existingAvg == null) return newValue;
        return (int) ((long) (existingAvg * count + newValue) / (count + 1));
    }

    public List<SuccessfulPatternDto> getSuccessfulPatterns() {
        return successRepo.findAllByOrderByOccurrenceCountDesc().stream()
                .map(p -> new SuccessfulPatternDto(
                        p.getId(), p.getTask(), p.getAgentType(), p.getModel(),
                        p.getAvgLatency(), p.getAvgTokens(),
                        p.getOccurrenceCount(), p.getLastSeen(), p.getCreatedAt()))
                .toList();
    }

    public List<FailurePatternDto> getFailurePatterns() {
        return failureRepo.findAllByOrderByOccurrenceCountDesc().stream()
                .map(p -> new FailurePatternDto(
                        p.getId(), p.getTask(), p.getAgentType(), p.getModel(),
                        p.getFailureReason(), p.getOccurrenceCount(), p.getLastSeen(), p.getCreatedAt()))
                .toList();
    }
}
