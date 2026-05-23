package com.agentscope.repository;

import com.agentscope.model.AgentPatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AgentPatchRepository extends JpaRepository<AgentPatch, UUID> {

    List<AgentPatch> findAllByOrderByCreatedAtDesc();

    List<AgentPatch> findByAgentTypeAndStatus(String agentType, String status);

    List<AgentPatch> findByStatus(String status);
}
