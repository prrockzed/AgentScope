package com.agentscope.repository;

import com.agentscope.model.TraceStep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TraceStepRepository extends JpaRepository<TraceStep, UUID> {

    List<TraceStep> findByRunIdOrderByStepNumberAsc(UUID runId);
}
