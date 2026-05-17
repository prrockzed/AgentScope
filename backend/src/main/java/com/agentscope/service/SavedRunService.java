package com.agentscope.service;

import com.agentscope.dto.SavedRunDto;
import com.agentscope.model.AgentRun;
import com.agentscope.model.SavedRun;
import com.agentscope.repository.AgentRunRepository;
import com.agentscope.repository.SavedRunRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class SavedRunService {

    private final SavedRunRepository savedRunRepository;
    private final AgentRunRepository agentRunRepository;

    public SavedRunService(SavedRunRepository savedRunRepository,
                           AgentRunRepository agentRunRepository) {
        this.savedRunRepository = savedRunRepository;
        this.agentRunRepository = agentRunRepository;
    }

    public List<SavedRunDto> getAllSavedRuns() {
        return savedRunRepository.findAllByOrderBySavedAtDesc().stream()
                .map(saved -> {
                    AgentRun run = agentRunRepository.findById(saved.getRunId()).orElse(null);
                    return new SavedRunDto(
                            saved.getId(),
                            saved.getRunId(),
                            run != null ? run.getTask() : null,
                            run != null ? run.getStatus() : null,
                            run != null ? run.getTotalLatency() : null,
                            run != null ? run.getTotalTokens() : null,
                            run != null ? run.getModel() : null,
                            run != null ? run.getAgentType() : null,
                            saved.getSavedAt()
                    );
                })
                .toList();
    }

    public boolean isSaved(UUID runId) {
        return savedRunRepository.findByRunId(runId).isPresent();
    }

    public SavedRunDto saveRun(UUID runId) {
        Optional<SavedRun> existing = savedRunRepository.findByRunId(runId);
        if (existing.isPresent()) {
            SavedRun saved = existing.get();
            AgentRun run = agentRunRepository.findById(runId).orElse(null);
            return toDto(saved, run);
        }

        AgentRun run = agentRunRepository.findById(runId).orElse(null);

        SavedRun saved = new SavedRun();
        saved.setId(UUID.randomUUID());
        saved.setRunId(runId);
        saved.setSavedAt(Instant.now());
        savedRunRepository.save(saved);

        return toDto(saved, run);
    }

    public void unsaveRun(UUID runId) {
        savedRunRepository.findByRunId(runId).ifPresent(savedRunRepository::delete);
    }

    private SavedRunDto toDto(SavedRun saved, AgentRun run) {
        return new SavedRunDto(
                saved.getId(),
                saved.getRunId(),
                run != null ? run.getTask() : null,
                run != null ? run.getStatus() : null,
                run != null ? run.getTotalLatency() : null,
                run != null ? run.getTotalTokens() : null,
                run != null ? run.getModel() : null,
                run != null ? run.getAgentType() : null,
                saved.getSavedAt()
        );
    }
}
