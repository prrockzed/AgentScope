-- Back-fill agent_type for runs created before multi-agent support was added.
-- Any row that still has NULL means it ran against the original tool_agent workflow.
UPDATE agent_runs SET agent_type = 'tool_agent' WHERE agent_type IS NULL;
