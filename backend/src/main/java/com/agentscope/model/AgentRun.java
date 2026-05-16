package com.agentscope.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "agent_runs")
@Getter
@Setter
public class AgentRun {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false)
    private String status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "total_latency")
    private Long totalLatency;

    @Column(name = "total_tokens")
    private Integer totalTokens;

    @Column(columnDefinition = "TEXT")
    private String task;
}
