INSERT INTO model_insights (id, model, total_runs, success_count, failure_count, avg_latency, avg_tokens, last_updated)
SELECT
    gen_random_uuid(),
    model,
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'SUCCESS'),
    COUNT(*) FILTER (WHERE status = 'FAILED'),
    AVG(total_latency)::BIGINT,
    AVG(total_tokens)::INT,
    MAX(created_at)
FROM agent_runs
WHERE model IS NOT NULL
GROUP BY model
ON CONFLICT (model) DO NOTHING;
