-- ============================================================
-- BlockOps — Complete Supabase Migration
-- Run this once in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ============================================================
-- PART 1: Core Tables (users, agents)
-- Required for frontend auth flow (Privy + Supabase)
-- ============================================================

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, -- Sui wallet address (from @mysten/dapp-kit useCurrentAccount)
  private_key TEXT,
  wallet_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Agents table
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  api_key TEXT UNIQUE NOT NULL,
  tools JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS — auth is handled by wallet connection (@mysten/dapp-kit), not Supabase Auth
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE agents DISABLE ROW LEVEL SECURITY;

-- Drop any stale policies
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can view own agents" ON agents;
DROP POLICY IF EXISTS "Users can create own agents" ON agents;
DROP POLICY IF EXISTS "Users can update own agents" ON agents;
DROP POLICY IF EXISTS "Users can delete own agents" ON agents;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_api_key ON agents(api_key);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_created_at ON agents(created_at DESC);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- PART 2: Conversation Memory Tables
-- Required for backend AI chat memory (backend/database/schema.sql)
-- ============================================================

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
  ON conversations(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_agent
  ON conversations(agent_id, updated_at DESC);

-- Conversation messages table
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'function')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON conversation_messages(conversation_id, created_at ASC);

-- Disable RLS on conversation tables — accessed only via service_role key
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages DISABLE ROW LEVEL SECURITY;

-- Function: Keep last 30 messages per conversation
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM conversation_messages
  WHERE conversation_id = NEW.conversation_id
  AND id NOT IN (
    SELECT id
    FROM conversation_messages
    WHERE conversation_id = NEW.conversation_id
    ORDER BY created_at DESC
    LIMIT 30
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleanup_messages ON conversation_messages;
CREATE TRIGGER trigger_cleanup_messages
AFTER INSERT ON conversation_messages
FOR EACH ROW
EXECUTE FUNCTION cleanup_old_messages();

-- Function: Keep message_count and updated_at in sync
CREATE OR REPLACE FUNCTION update_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    message_count = (
      SELECT COUNT(*)
      FROM conversation_messages
      WHERE conversation_id = NEW.conversation_id
    ),
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_message_count ON conversation_messages;
CREATE TRIGGER trigger_update_message_count
AFTER INSERT ON conversation_messages
FOR EACH ROW
EXECUTE FUNCTION update_message_count();

-- Function: Probabilistic stale conversation cleanup (1% on each insert)
CREATE OR REPLACE FUNCTION smart_cleanup()
RETURNS TRIGGER AS $$
BEGIN
  IF random() < 0.01 THEN
    DELETE FROM conversations
    WHERE id IN (
      SELECT id
      FROM conversations
      WHERE updated_at < NOW() - INTERVAL '30 days'
      ORDER BY updated_at ASC
      LIMIT 10
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_smart_cleanup ON conversation_messages;
CREATE TRIGGER trigger_smart_cleanup
AFTER INSERT ON conversation_messages
FOR EACH ROW
EXECUTE FUNCTION smart_cleanup();

-- Admin helper functions
CREATE OR REPLACE FUNCTION delete_stale_conversations(max_delete INTEGER DEFAULT 100)
RETURNS TABLE(deleted_count INTEGER) AS $$
DECLARE
  del_count INTEGER;
BEGIN
  DELETE FROM conversations
  WHERE id IN (
    SELECT id
    FROM conversations
    WHERE updated_at < NOW() - INTERVAL '30 days'
    ORDER BY updated_at ASC
    LIMIT max_delete
  );
  GET DIAGNOSTICS del_count = ROW_COUNT;
  RETURN QUERY SELECT del_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS TABLE(
  total_conversations BIGINT,
  total_messages BIGINT,
  avg_messages_per_conversation NUMERIC,
  active_conversations_7d BIGINT,
  oldest_conversation_days INTEGER,
  database_size_mb NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT c.id)::BIGINT,
    COUNT(m.id)::BIGINT,
    COALESCE(ROUND(AVG(COALESCE((
      SELECT COUNT(*) FROM conversation_messages
      WHERE conversation_id = c.id
    ), 0)), 2), 0),
    COUNT(DISTINCT c.id) FILTER (WHERE c.updated_at > NOW() - INTERVAL '7 days')::BIGINT,
    COALESCE(EXTRACT(DAY FROM NOW() - MIN(c.updated_at))::INTEGER, 0),
    ROUND(pg_database_size(current_database())::NUMERIC / (1024*1024), 2)
  FROM conversations c
  LEFT JOIN conversation_messages m ON c.id = m.conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'agents', 'conversations', 'conversation_messages')
ORDER BY table_name;
-- Expected: 4 rows
