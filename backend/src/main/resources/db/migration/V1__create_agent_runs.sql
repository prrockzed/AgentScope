CREATE TABLE agent_runs (
    id            UUID        PRIMARY KEY,
    status        TEXT        NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL,
    total_latency BIGINT,
    total_tokens  INT
);
