CREATE TABLE trace_steps (
    id          UUID        PRIMARY KEY,
    run_id      UUID        NOT NULL REFERENCES agent_runs(id),
    step_number INT         NOT NULL,
    tool_name   TEXT,
    event_type  TEXT        NOT NULL,
    prompt      TEXT,
    response    TEXT,
    latency     BIGINT      NOT NULL,
    token_usage INT         NOT NULL,
    status      TEXT        NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL
);
