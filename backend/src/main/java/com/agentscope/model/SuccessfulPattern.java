package com.agentscope.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "successful_patterns")
public class SuccessfulPattern {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String task;

    @Column(name = "agent_type")
    private String agentType;

    @Column
    private String model;

    @Column(name = "avg_latency")
    private Long avgLatency;

    @Column(name = "avg_tokens")
    private Integer avgTokens;

    @Column(name = "occurrence_count", nullable = false)
    private int occurrenceCount;

    @Column(name = "last_seen", nullable = false)
    private Instant lastSeen;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getTask() { return task; }
    public void setTask(String task) { this.task = task; }

    public String getAgentType() { return agentType; }
    public void setAgentType(String agentType) { this.agentType = agentType; }

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public Long getAvgLatency() { return avgLatency; }
    public void setAvgLatency(Long avgLatency) { this.avgLatency = avgLatency; }

    public Integer getAvgTokens() { return avgTokens; }
    public void setAvgTokens(Integer avgTokens) { this.avgTokens = avgTokens; }

    public int getOccurrenceCount() { return occurrenceCount; }
    public void setOccurrenceCount(int occurrenceCount) { this.occurrenceCount = occurrenceCount; }

    public Instant getLastSeen() { return lastSeen; }
    public void setLastSeen(Instant lastSeen) { this.lastSeen = lastSeen; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
