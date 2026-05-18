CREATE TABLE model_insights (
    id            UUID        PRIMARY KEY,
    model         TEXT        NOT NULL UNIQUE,
    total_runs    INT         NOT NULL DEFAULT 0,
    success_count INT         NOT NULL DEFAULT 0,
    failure_count INT         NOT NULL DEFAULT 0,
    avg_latency   BIGINT,
    avg_tokens    INT,
    last_updated  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
