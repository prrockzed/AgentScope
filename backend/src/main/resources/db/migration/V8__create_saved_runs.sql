CREATE TABLE saved_runs (
    id       UUID                     PRIMARY KEY,
    run_id   UUID                     NOT NULL REFERENCES agent_runs(id),
    saved_at TIMESTAMP WITH TIME ZONE NOT NULL
);
