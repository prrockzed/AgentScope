CREATE TABLE evaluations (
    id             UUID    PRIMARY KEY,
    run_id         UUID    NOT NULL REFERENCES agent_runs(id),
    score          NUMERIC,
    failure_reason TEXT
);
