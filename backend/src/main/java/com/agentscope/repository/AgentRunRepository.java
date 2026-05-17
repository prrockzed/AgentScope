package com.agentscope.repository;

import com.agentscope.model.AgentRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AgentRunRepository extends JpaRepository<AgentRun, UUID> {
    List<AgentRun> findByTask(String task);
    List<AgentRun> findAllByOrderByCreatedAtDesc();

    @Query("SELECT r.failureReason, COUNT(r), MAX(r.createdAt) " +
           "FROM AgentRun r " +
           "WHERE r.status = 'FAILED' AND r.failureReason IS NOT NULL " +
           "GROUP BY r.failureReason " +
           "ORDER BY COUNT(r) DESC")
    List<Object[]> findFailureSummary();
}
