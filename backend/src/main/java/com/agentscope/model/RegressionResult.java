package com.agentscope.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "regression_results")
public class RegressionResult {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "baseline_run_id", nullable = false)
    private UUID baselineRunId;

    @Column(name = "candidate_run_id", nullable = false)
    private UUID candidateRunId;

    @Column(name = "latency_delta")
    private Long latencyDelta;

    @Column(name = "token_delta")
    private Integer tokenDelta;

    @Column(name = "retry_delta")
    private Integer retryDelta;

    @Column(name = "baseline_status", nullable = false)
    private String baselineStatus;

    @Column(name = "candidate_status", nullable = false)
    private String candidateStatus;

    @Column(nullable = false)
    private BigDecimal score;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getBaselineRunId() { return baselineRunId; }
    public void setBaselineRunId(UUID baselineRunId) { this.baselineRunId = baselineRunId; }

    public UUID getCandidateRunId() { return candidateRunId; }
    public void setCandidateRunId(UUID candidateRunId) { this.candidateRunId = candidateRunId; }

    public Long getLatencyDelta() { return latencyDelta; }
    public void setLatencyDelta(Long latencyDelta) { this.latencyDelta = latencyDelta; }

    public Integer getTokenDelta() { return tokenDelta; }
    public void setTokenDelta(Integer tokenDelta) { this.tokenDelta = tokenDelta; }

    public Integer getRetryDelta() { return retryDelta; }
    public void setRetryDelta(Integer retryDelta) { this.retryDelta = retryDelta; }

    public String getBaselineStatus() { return baselineStatus; }
    public void setBaselineStatus(String baselineStatus) { this.baselineStatus = baselineStatus; }

    public String getCandidateStatus() { return candidateStatus; }
    public void setCandidateStatus(String candidateStatus) { this.candidateStatus = candidateStatus; }

    public BigDecimal getScore() { return score; }
    public void setScore(BigDecimal score) { this.score = score; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
