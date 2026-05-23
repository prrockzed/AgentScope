package com.agentscope.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "accuracy_evaluations")
public class AccuracyEvaluation {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "run_id", nullable = false)
    private UUID runId;

    @Column(name = "accuracy_score")
    private Integer accuracyScore;

    @Column(name = "score_reasoning", columnDefinition = "TEXT")
    private String scoreReasoning;

    @Column(name = "task_fit")
    private String taskFit;

    @Column(name = "action_recommendation")
    private String actionRecommendation;

    @Column(name = "recommendation_reasoning", columnDefinition = "TEXT")
    private String recommendationReasoning;

    @Column(name = "evaluator_model")
    private String evaluatorModel;

    @Column(name = "eval_status", nullable = false)
    private String evalStatus;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getRunId() { return runId; }
    public void setRunId(UUID runId) { this.runId = runId; }

    public Integer getAccuracyScore() { return accuracyScore; }
    public void setAccuracyScore(Integer accuracyScore) { this.accuracyScore = accuracyScore; }

    public String getScoreReasoning() { return scoreReasoning; }
    public void setScoreReasoning(String scoreReasoning) { this.scoreReasoning = scoreReasoning; }

    public String getTaskFit() { return taskFit; }
    public void setTaskFit(String taskFit) { this.taskFit = taskFit; }

    public String getActionRecommendation() { return actionRecommendation; }
    public void setActionRecommendation(String actionRecommendation) { this.actionRecommendation = actionRecommendation; }

    public String getRecommendationReasoning() { return recommendationReasoning; }
    public void setRecommendationReasoning(String recommendationReasoning) { this.recommendationReasoning = recommendationReasoning; }

    public String getEvaluatorModel() { return evaluatorModel; }
    public void setEvaluatorModel(String evaluatorModel) { this.evaluatorModel = evaluatorModel; }

    public String getEvalStatus() { return evalStatus; }
    public void setEvalStatus(String evalStatus) { this.evalStatus = evalStatus; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
}
