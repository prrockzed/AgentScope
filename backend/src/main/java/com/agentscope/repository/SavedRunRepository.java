package com.agentscope.repository;

import com.agentscope.model.SavedRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SavedRunRepository extends JpaRepository<SavedRun, UUID> {
    Optional<SavedRun> findByRunId(UUID runId);
    List<SavedRun> findAllByOrderBySavedAtDesc();
}
