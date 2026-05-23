CREATE TABLE accuracy_evaluations (
    id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id                   UUID        NOT NULL UNIQUE REFERENCES agent_runs(id) ON DELETE CASCADE,
    accuracy_score           INT,
    score_reasoning          TEXT,
    task_fit                 TEXT,
    action_recommendation    TEXT,
    recommendation_reasoning TEXT,
    evaluator_model          TEXT,
    eval_status              TEXT        NOT NULL DEFAULT 'PENDING',
    error_message            TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at             TIMESTAMPTZ
);
