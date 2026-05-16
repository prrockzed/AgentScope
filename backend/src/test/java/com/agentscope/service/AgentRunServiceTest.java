package com.agentscope.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import com.agentscope.dto.AgentRunDto;
import com.agentscope.dto.CreateRunRequest;
import com.agentscope.exception.ResourceNotFoundException;
import com.agentscope.model.AgentRun;
import com.agentscope.repository.AgentRunRepository;

@ExtendWith(MockitoExtension.class)
class AgentRunServiceTest {

    @Mock
    private AgentRunRepository agentRunRepository;

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private AgentRunService agentRunService;

    @BeforeEach
    @SuppressWarnings("unused")
    void setUp() {
        ReflectionTestUtils.setField(agentRunService, "runtimeBaseUrl", "http://localhost:8000");
    }

    @Test
    void createAndExecuteRun_nullRuntimeResponse_savesFailedStatus() {
        // Capture status at the moment of each save(), because the service
        // mutates and re-saves the same AgentRun object.
        List<String> capturedStatuses = new ArrayList<>();
        when(agentRunRepository.save(any())).thenAnswer(inv -> {
            AgentRun r = inv.getArgument(0);
            capturedStatuses.add(r.getStatus());
            return r;
        });

        agentRunService.createAndExecuteRun(new CreateRunRequest("test task"));

        assertThat(capturedStatuses).hasSize(2);
        assertThat(capturedStatuses.get(0)).isEqualTo("RUNNING");
        assertThat(capturedStatuses.get(1)).isEqualTo("FAILED");
    }

    @Test
    void createAndExecuteRun_runtimeException_savesFailedStatus() {
        List<String> capturedStatuses = new ArrayList<>();
        when(agentRunRepository.save(any())).thenAnswer(inv -> {
            AgentRun r = inv.getArgument(0);
            capturedStatuses.add(r.getStatus());
            return r;
        });
        when(restTemplate.postForObject(anyString(), any(), any()))
                .thenThrow(new RestClientException("connection refused"));

        agentRunService.createAndExecuteRun(new CreateRunRequest("test task"));

        assertThat(capturedStatuses).hasSize(2);
        assertThat(capturedStatuses.get(0)).isEqualTo("RUNNING");
        assertThat(capturedStatuses.get(1)).isEqualTo("FAILED");
    }

    @Test
    void getAllRuns_returnsMappedDtos() {
        AgentRun run1 = buildRun("SUCCESS");
        AgentRun run2 = buildRun("FAILED");
        when(agentRunRepository.findAll()).thenReturn(List.of(run1, run2));

        List<AgentRunDto> dtos = agentRunService.getAllRuns();

        assertThat(dtos).hasSize(2);
        assertThat(dtos.get(0).status()).isEqualTo("SUCCESS");
        assertThat(dtos.get(1).status()).isEqualTo("FAILED");
    }

    @Test
    void getRun_unknownId_throwsResourceNotFoundException() {
        UUID id = UUID.randomUUID();
        when(agentRunRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> agentRunService.getRun(id))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining(id.toString());
    }

    private AgentRun buildRun(String status) {
        AgentRun run = new AgentRun();
        run.setId(UUID.randomUUID());
        run.setStatus(status);
        run.setCreatedAt(Instant.now());
        return run;
    }
}
