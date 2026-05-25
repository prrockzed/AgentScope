package com.agentscope.service;

import com.agentscope.model.AgentRun;
import com.agentscope.model.TraceStep;
import com.agentscope.repository.AgentRunRepository;
import com.agentscope.repository.TraceStepRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class FailureDetectionService {

    private final AgentRunRepository agentRunRepository;
    private final TraceStepRepository traceStepRepository;

    public FailureDetectionService(AgentRunRepository agentRunRepository,
                                   TraceStepRepository traceStepRepository) {
        this.agentRunRepository = agentRunRepository;
        this.traceStepRepository = traceStepRepository;
    }

    public void analyze(UUID runId) {
        AgentRun run = agentRunRepository.findById(runId).orElse(null);
        if (run == null || !"FAILED".equals(run.getStatus())) return;
        if (run.getFailureReason() != null && !run.getFailureReason().isBlank()) return;

        List<TraceStep> steps = traceStepRepository.findByRunIdOrderByStepNumberAsc(runId);

        String reason = steps.stream()
                .filter(s -> "VALIDATION_FAILURE".equals(s.getEventType()))
                .map(TraceStep::getResponse)
                .filter(r -> r != null && !r.isBlank())
                .findFirst()
                .orElse("RUNTIME_ERROR");

        run.setFailureReason(reason);
        agentRunRepository.save(run);
    }
}
