-- PostgreSQL Schema for AI Encounters Sessions
-- Run this migration to set up the database for the postgres-storage plugin

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  player_id VARCHAR(255) NOT NULL,
  encounter JSONB NOT NULL,
  state JSONB NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sessions_player_id ON sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_completed_at ON sessions(completed_at DESC) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_difficulty ON sessions((encounter->>'difficulty'));

-- Index for incomplete sessions
CREATE INDEX IF NOT EXISTS idx_sessions_incomplete ON sessions(player_id, started_at) WHERE completed_at IS NULL;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Optional: Create a view for active (incomplete) sessions
CREATE OR REPLACE VIEW active_sessions AS
SELECT
  session_id,
  player_id,
  encounter,
  state,
  started_at,
  EXTRACT(EPOCH FROM (NOW() - started_at)) AS duration_seconds
FROM sessions
WHERE completed_at IS NULL
ORDER BY started_at DESC;

-- Optional: Function to get session statistics
CREATE OR REPLACE FUNCTION get_session_stats(p_player_id VARCHAR DEFAULT NULL)
RETURNS TABLE (
  total_sessions BIGINT,
  completed_sessions BIGINT,
  active_sessions BIGINT,
  avg_completion_time_seconds NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_sessions,
    COUNT(completed_at)::BIGINT AS completed_sessions,
    COUNT(*) FILTER (WHERE completed_at IS NULL)::BIGINT AS active_sessions,
    ROUND(AVG(
      EXTRACT(EPOCH FROM (completed_at - started_at))
    ) FILTER (WHERE completed_at IS NOT NULL), 2) AS avg_completion_time_seconds
  FROM sessions
  WHERE p_player_id IS NULL OR player_id = p_player_id;
END;
$$ LANGUAGE plpgsql;

-- Example queries:
-- Get all active sessions: SELECT * FROM active_sessions;
-- Get stats for all players: SELECT * FROM get_session_stats();
-- Get stats for specific player: SELECT * FROM get_session_stats('player123');
