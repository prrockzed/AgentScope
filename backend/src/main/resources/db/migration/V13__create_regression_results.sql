CREATE TABLE regression_results (
    id                UUID        PRIMARY KEY,
    baseline_run_id   UUID        NOT NULL REFERENCES agent_runs(id),
    candidate_run_id  UUID        NOT NULL REFERENCES agent_runs(id),
    latency_delta     BIGINT,
    token_delta       INT,
    retry_delta       INT,
    baseline_status   TEXT        NOT NULL,
    candidate_status  TEXT        NOT NULL,
    score             NUMERIC     NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
