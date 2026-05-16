ALTER TABLE agent_runs
  ADD COLUMN replay_of UUID REFERENCES agent_runs(id);
