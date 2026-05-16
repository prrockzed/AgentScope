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
@Table(name = "regression_tests")
@Getter
@Setter
public class RegressionTest {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(columnDefinition = "TEXT")
    private String input;

    @Column(name = "expected_failure")
    private String expectedFailure;

    private String type;

    @Column(name = "created_at")
    private Instant createdAt;
}
