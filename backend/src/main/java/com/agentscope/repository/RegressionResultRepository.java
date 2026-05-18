package com.agentscope.repository;

import com.agentscope.model.RegressionResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RegressionResultRepository extends JpaRepository<RegressionResult, UUID> {

    List<RegressionResult> findAllByOrderByCreatedAtDesc();

    boolean existsByCandidateRunId(UUID candidateRunId);
}
