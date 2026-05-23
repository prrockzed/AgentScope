package com.agentscope.repository;

import com.agentscope.model.AccuracyEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccuracyEvaluationRepository extends JpaRepository<AccuracyEvaluation, UUID> {

    Optional<AccuracyEvaluation> findByRunId(UUID runId);

    List<AccuracyEvaluation> findAllByRunIdIn(Collection<UUID> runIds);
}
