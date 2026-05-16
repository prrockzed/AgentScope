package com.agentscope.repository;

import com.agentscope.model.AgentRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AgentRunRepository extends JpaRepository<AgentRun, UUID> {
    List<AgentRun> findByTask(String task);
    List<AgentRun> findAllByOrderByCreatedAtDesc();
}
