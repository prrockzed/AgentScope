package com.agentscope.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "model_insights")
public class ModelInsight {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false, unique = true, columnDefinition = "TEXT")
    private String model;

    @Column(name = "total_runs", nullable = false)
    private int totalRuns;

    @Column(name = "success_count", nullable = false)
    private int successCount;

    @Column(name = "failure_count", nullable = false)
    private int failureCount;

    @Column(name = "avg_latency")
    private Long avgLatency;

    @Column(name = "avg_tokens")
    private Integer avgTokens;

    @Column(name = "last_updated", nullable = false)
    private Instant lastUpdated;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public int getTotalRuns() { return totalRuns; }
    public void setTotalRuns(int totalRuns) { this.totalRuns = totalRuns; }

    public int getSuccessCount() { return successCount; }
    public void setSuccessCount(int successCount) { this.successCount = successCount; }

    public int getFailureCount() { return failureCount; }
    public void setFailureCount(int failureCount) { this.failureCount = failureCount; }

    public Long getAvgLatency() { return avgLatency; }
    public void setAvgLatency(Long avgLatency) { this.avgLatency = avgLatency; }

    public Integer getAvgTokens() { return avgTokens; }
    public void setAvgTokens(Integer avgTokens) { this.avgTokens = avgTokens; }

    public Instant getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(Instant lastUpdated) { this.lastUpdated = lastUpdated; }
}
