-- Backfill successful_patterns from all completed SUCCESS runs
INSERT INTO successful_patterns (id, task, agent_type, model, avg_latency, avg_tokens, occurrence_count, last_seen, created_at)
SELECT
    gen_random_uuid(),
    task,
    agent_type,
    model,
    AVG(total_latency)::BIGINT,
    AVG(total_tokens)::INT,
    COUNT(*),
    MAX(created_at),
    MIN(created_at)
FROM agent_runs
WHERE status = 'SUCCESS'
  AND task IS NOT NULL
GROUP BY task, agent_type, model
ON CONFLICT (task, agent_type, model) DO NOTHING;

-- Backfill failure_patterns from all completed non-SUCCESS runs
INSERT INTO failure_patterns (id, task, agent_type, model, failure_reason, occurrence_count, last_seen, created_at)
SELECT
    gen_random_uuid(),
    task,
    agent_type,
    model,
    COALESCE(failure_reason, 'UNKNOWN'),
    COUNT(*),
    MAX(created_at),
    MIN(created_at)
FROM agent_runs
WHERE status = 'FAILED'
  AND task IS NOT NULL
GROUP BY task, agent_type, model, COALESCE(failure_reason, 'UNKNOWN')
ON CONFLICT (task, agent_type, model, failure_reason) DO NOTHING;
