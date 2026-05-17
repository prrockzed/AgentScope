CREATE TABLE optimization_suggestions (
    id         UUID        PRIMARY KEY,
    run_id     UUID        NOT NULL REFERENCES agent_runs(id),
    category   TEXT        NOT NULL,
    severity   TEXT        NOT NULL,
    suggestion TEXT        NOT NULL,
    source     TEXT        NOT NULL DEFAULT 'RULE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
