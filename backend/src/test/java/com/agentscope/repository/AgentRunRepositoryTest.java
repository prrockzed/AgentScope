package com.agentscope.repository;

import com.agentscope.model.AgentRun;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class AgentRunRepositoryTest {

    @Autowired
    private AgentRunRepository agentRunRepository;

    @Test
    void save_andFindById_returnsPersistedRun() {
        AgentRun run = buildRun("RUNNING");
        agentRunRepository.save(run);

        Optional<AgentRun> found = agentRunRepository.findById(run.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getStatus()).isEqualTo("RUNNING");
    }

    @Test
    void findAll_returnsAllSavedRuns() {
        agentRunRepository.save(buildRun("SUCCESS"));
        agentRunRepository.save(buildRun("FAILED"));

        List<AgentRun> runs = agentRunRepository.findAll();
        assertThat(runs).hasSizeGreaterThanOrEqualTo(2);
    }

    @Test
    void findById_unknownId_returnsEmpty() {
        Optional<AgentRun> result = agentRunRepository.findById(UUID.randomUUID());
        assertThat(result).isEmpty();
    }

    private AgentRun buildRun(String status) {
        AgentRun run = new AgentRun();
        run.setId(UUID.randomUUID());
        run.setStatus(status);
        run.setCreatedAt(Instant.now());
        return run;
    }
}
