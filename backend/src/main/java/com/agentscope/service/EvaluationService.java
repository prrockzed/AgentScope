package com.agentscope.service;

import com.agentscope.dto.RegressionTestDto;
import com.agentscope.model.AgentRun;
import com.agentscope.model.Evaluation;
import com.agentscope.model.RegressionTest;
import com.agentscope.repository.AgentRunRepository;
import com.agentscope.repository.EvaluationRepository;
import com.agentscope.repository.RegressionTestRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class EvaluationService {

    private final AgentRunRepository agentRunRepository;
    private final EvaluationRepository evaluationRepository;
    private final RegressionTestRepository regressionTestRepository;

    public EvaluationService(AgentRunRepository agentRunRepository,
                             EvaluationRepository evaluationRepository,
                             RegressionTestRepository regressionTestRepository) {
        this.agentRunRepository = agentRunRepository;
        this.evaluationRepository = evaluationRepository;
        this.regressionTestRepository = regressionTestRepository;
    }

    public void onRunComplete(UUID runId) {
        AgentRun run = agentRunRepository.findById(runId).orElse(null);
        if (run == null) return;

        if ("FAILED".equals(run.getStatus())) {
            if (run.getTask() != null &&
                    regressionTestRepository.findByInput(run.getTask()).isEmpty()) {
                RegressionTest test = new RegressionTest();
                test.setId(UUID.randomUUID());
                test.setInput(run.getTask());
                test.setExpectedFailure(run.getFailureReason());
                test.setType("AUTO");
                test.setCreatedAt(Instant.now());
                regressionTestRepository.save(test);
            }
            if (evaluationRepository.findByRunId(runId).isEmpty()) {
                saveEvaluation(runId, 0.0, run.getFailureReason());
            }

        } else if ("SUCCESS".equals(run.getStatus())) {
            if (run.getTask() != null &&
                    regressionTestRepository.findByInput(run.getTask()).isPresent() &&
                    evaluationRepository.findByRunId(runId).isEmpty()) {
                saveEvaluation(runId, 1.0, null);
            }
        }
    }

    public void generateEvalManual(UUID runId) {
        AgentRun run = agentRunRepository.findById(runId).orElse(null);
        if (run == null || !"FAILED".equals(run.getStatus())) return;

        if (run.getTask() != null &&
                regressionTestRepository.findByInput(run.getTask()).isEmpty()) {
            RegressionTest test = new RegressionTest();
            test.setId(UUID.randomUUID());
            test.setInput(run.getTask());
            test.setExpectedFailure(run.getFailureReason());
            test.setType("MANUAL");
            test.setCreatedAt(Instant.now());
            regressionTestRepository.save(test);
        }
        if (evaluationRepository.findByRunId(runId).isEmpty()) {
            saveEvaluation(runId, 0.0, run.getFailureReason());
        }
    }

    public List<RegressionTestDto> getAll() {
        return regressionTestRepository.findAll().stream()
                .map(test -> {
                    String status = agentRunRepository.findByTask(test.getInput())
                            .stream()
                            .filter(r -> !"RUNNING".equals(r.getStatus()))
                            .max(Comparator.comparing(AgentRun::getCreatedAt))
                            .flatMap(r -> evaluationRepository.findByRunId(r.getId()))
                            .map(e -> e.getScore().compareTo(BigDecimal.ONE) >= 0 ? "PASSING" : "FAILING")
                            .orElse("UNTESTED");
                    return new RegressionTestDto(test.getId(), test.getInput(),
                            test.getExpectedFailure(), test.getType(), test.getCreatedAt(), status);
                })
                .toList();
    }

    private void saveEvaluation(UUID runId, double score, String failureReason) {
        Evaluation eval = new Evaluation();
        eval.setId(UUID.randomUUID());
        eval.setRunId(runId);
        eval.setScore(BigDecimal.valueOf(score));
        eval.setFailureReason(failureReason);
        evaluationRepository.save(eval);
    }
}
