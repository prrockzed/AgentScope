ALTER TABLE agent_runs
    ADD COLUMN model TEXT;

UPDATE agent_runs
SET model = 'qwen3:4b'
WHERE model IS NULL;
