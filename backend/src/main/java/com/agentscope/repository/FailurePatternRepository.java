package com.agentscope.repository;

import com.agentscope.model.FailurePattern;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FailurePatternRepository extends JpaRepository<FailurePattern, UUID> {

    Optional<FailurePattern> findByTaskAndAgentTypeAndModelAndFailureReason(
            String task, String agentType, String model, String failureReason);

    List<FailurePattern> findAllByOrderByOccurrenceCountDesc();
}
