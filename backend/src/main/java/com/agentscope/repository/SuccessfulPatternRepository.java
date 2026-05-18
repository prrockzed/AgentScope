package com.agentscope.repository;

import com.agentscope.model.SuccessfulPattern;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SuccessfulPatternRepository extends JpaRepository<SuccessfulPattern, UUID> {

    Optional<SuccessfulPattern> findByTaskAndAgentTypeAndModel(String task, String agentType, String model);

    List<SuccessfulPattern> findAllByOrderByOccurrenceCountDesc();
}
