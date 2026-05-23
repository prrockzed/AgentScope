CREATE TABLE agent_patches (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_type       TEXT        NOT NULL,
    source_run_id    UUID        REFERENCES agent_runs(id) ON DELETE SET NULL,
    evaluator_model  TEXT,
    title            TEXT,
    instruction      TEXT,
    rationale        TEXT,
    status           TEXT        NOT NULL DEFAULT 'GENERATING',
    error_message    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activated_at     TIMESTAMPTZ,
    rejected_at      TIMESTAMPTZ,
    revoked_at       TIMESTAMPTZ
);
CREATE INDEX agent_patches_agent_type_status ON agent_patches(agent_type, status);
