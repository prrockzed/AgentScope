package com.agentscope.repository;

import com.agentscope.model.OptimizationSuggestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OptimizationSuggestionRepository extends JpaRepository<OptimizationSuggestion, UUID> {
    List<OptimizationSuggestion> findByRunId(UUID runId);
    List<OptimizationSuggestion> findAllByOrderByCreatedAtDesc();
    boolean existsByRunIdAndSource(UUID runId, String source);
}
