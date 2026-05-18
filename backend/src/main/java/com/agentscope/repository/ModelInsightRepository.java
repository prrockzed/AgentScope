package com.agentscope.repository;

import com.agentscope.model.ModelInsight;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ModelInsightRepository extends JpaRepository<ModelInsight, UUID> {

    Optional<ModelInsight> findByModel(String model);

    List<ModelInsight> findAllByOrderByTotalRunsDesc();
}
