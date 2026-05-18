CREATE TABLE successful_patterns (
    id               UUID        PRIMARY KEY,
    task             TEXT        NOT NULL,
    agent_type       TEXT,
    model            TEXT,
    avg_latency      BIGINT,
    avg_tokens       INT,
    occurrence_count INT         NOT NULL DEFAULT 1,
    last_seen        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (task, agent_type, model)
);

CREATE TABLE failure_patterns (
    id               UUID        PRIMARY KEY,
    task             TEXT        NOT NULL,
    agent_type       TEXT,
    model            TEXT,
    failure_reason   TEXT,
    occurrence_count INT         NOT NULL DEFAULT 1,
    last_seen        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (task, agent_type, model, failure_reason)
);
