package com.agentscope.repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import com.agentscope.model.AgentRun;
import com.agentscope.model.TraceStep;

@DataJpaTest
@ActiveProfiles("test")
class TraceStepRepositoryTest {

    @Autowired
    private TraceStepRepository traceStepRepository;

    @Autowired
    private AgentRunRepository agentRunRepository;

    private UUID runId;

    @BeforeEach
    @SuppressWarnings("unused")
    void setUp() {
        AgentRun run = new AgentRun();
        runId = UUID.randomUUID();
        run.setId(runId);
        run.setStatus("RUNNING");
        run.setCreatedAt(Instant.now());
        agentRunRepository.save(run);
    }

    @Test
    void save_andFindByRunId_returnsOrderedSteps() {
        traceStepRepository.save(buildStep(runId, 2, "LLM_RESPONSE"));
        traceStepRepository.save(buildStep(runId, 1, "TOOL_CALL"));
        traceStepRepository.save(buildStep(runId, 3, "RUN_COMPLETED"));

        List<TraceStep> steps = traceStepRepository.findByRunIdOrderByStepNumberAsc(runId);
        assertThat(steps).hasSize(3);
        assertThat(steps.get(0).getStepNumber()).isEqualTo(1);
        assertThat(steps.get(1).getStepNumber()).isEqualTo(2);
        assertThat(steps.get(2).getStepNumber()).isEqualTo(3);
    }

    @Test
    void findByRunId_unknownRunId_returnsEmpty() {
        List<TraceStep> steps = traceStepRepository.findByRunIdOrderByStepNumberAsc(UUID.randomUUID());
        assertThat(steps).isEmpty();
    }

    private TraceStep buildStep(UUID runId, int stepNumber, String eventType) {
        TraceStep step = new TraceStep();
        step.setId(UUID.randomUUID());
        step.setRunId(runId);
        step.setStepNumber(stepNumber);
        step.setEventType(eventType);
        step.setLatency(100L);
        step.setTokenUsage(10);
        step.setStatus("SUCCESS");
        step.setCreatedAt(Instant.now());
        return step;
    }
}
