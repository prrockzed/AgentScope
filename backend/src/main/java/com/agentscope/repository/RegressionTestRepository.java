package com.agentscope.repository;

import com.agentscope.model.RegressionTest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RegressionTestRepository extends JpaRepository<RegressionTest, UUID> {
    Optional<RegressionTest> findByInput(String input);
}
