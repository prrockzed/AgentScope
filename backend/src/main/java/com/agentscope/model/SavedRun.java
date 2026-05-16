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
@Table(name = "saved_runs")
@Getter
@Setter
public class SavedRun {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "run_id", nullable = false, updatable = false)
    private UUID runId;

    @Column(name = "saved_at", nullable = false, updatable = false)
    private Instant savedAt;
}
