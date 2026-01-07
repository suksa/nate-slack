-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS (If not exists, though Postgres doesn't support IF NOT EXISTS for types easily, we assume they might exist or we catch errors if run manually. 
-- For migration scripts, it's better to check or just rely on the fact they exist from previous setups.)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'guest');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE channel_type AS ENUM ('public', 'private');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'away', 'dnd', 'offline');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABLES (Ensure all tables exist with correct columns)
-- We skip full CREATE TABLE if they exist, but we ensure RLS is enabled.

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE presences ENABLE ROW LEVEL SECURITY;
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_emojis ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. INDEXES (memo.md 12.2 Strategy)
CREATE INDEX IF NOT EXISTS idx_messages_channel_created ON messages(channel_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_user_created ON messages(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON messages(parent_id);

CREATE INDEX IF NOT EXISTS idx_reactions_message_emoji ON reactions(message_id, emoji);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);

CREATE INDEX IF NOT EXISTS idx_channel_members_channel_user ON channel_members(channel_id, user_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user_workspace ON channel_members(user_id); -- Optimization for fetching user's channels

CREATE INDEX IF NOT EXISTS idx_read_receipts_user_channel ON read_receipts(user_id, channel_id);

-- Full-text search index (GIN)
CREATE INDEX IF NOT EXISTS idx_messages_content_fts ON messages USING GIN (to_tsvector('english', content));


-- 4. RLS POLICIES (memo.md 13.1 + Others)
-- Clean up existing policies to ensure fresh application
DROP POLICY IF EXISTS "Members can view channel messages" ON messages;
DROP POLICY IF EXISTS "Members can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages or admins can delete any" ON messages;

-- Messages Policies
CREATE POLICY "Members can view channel messages"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_members.channel_id = messages.channel_id
    AND channel_members.user_id = auth.uid()
  )
);

CREATE POLICY "Members can insert messages"
ON messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_members.channel_id = messages.channel_id
    AND channel_members.user_id = auth.uid()
  )
  AND messages.user_id = auth.uid()
);

CREATE POLICY "Users can update own messages"
ON messages FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own messages or admins can delete any"
ON messages FOR DELETE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM members
    JOIN channels ON channels.workspace_id = members.workspace_id
    WHERE channels.id = messages.channel_id
    AND members.user_id = auth.uid()
    AND members.role IN ('owner', 'admin')
  )
);


-- 5. TRIGGER: Default Channels on Workspace Creation
CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS TRIGGER AS $$
DECLARE
  general_id uuid;
  random_id uuid;
BEGIN
  -- Create #general
  INSERT INTO public.channels (workspace_id, name, type, created_by, description)
  VALUES (NEW.id, 'general', 'public', NEW.owner_id, '공지사항 및 일반적인 대화가 이루어지는 곳입니다.')
  RETURNING id INTO general_id;

  -- Create #random
  INSERT INTO public.channels (workspace_id, name, type, created_by, description)
  VALUES (NEW.id, 'random', 'public', NEW.owner_id, '주제와 상관없이 자유롭게 대화하는 곳입니다.')
  RETURNING id INTO random_id;

  -- Add owner to #general
  INSERT INTO public.channel_members (channel_id, user_id)
  VALUES (general_id, NEW.owner_id);

  -- Add owner to #random
  INSERT INTO public.channel_members (channel_id, user_id)
  VALUES (random_id, NEW.owner_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid duplication error (Postgres doesn't support CREATE TRIGGER IF NOT EXISTS cleanly)
DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;

CREATE TRIGGER on_workspace_created
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_workspace();


-- 6. TRIGGER: Auto-join default channels on Member Join
-- When a user joins a workspace, they should be added to default channels (#general, #random)
CREATE OR REPLACE FUNCTION public.handle_new_workspace_member()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into channel_members for all public channels named 'general' or 'random' in this workspace
  INSERT INTO public.channel_members (channel_id, user_id)
  SELECT c.id, NEW.user_id
  FROM public.channels c
  WHERE c.workspace_id = NEW.workspace_id
  AND c.name IN ('general', 'random')
  AND c.type = 'public'
  ON CONFLICT DO NOTHING; -- If already exists, ignore

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_workspace_member_created ON members;

CREATE TRIGGER on_workspace_member_created
  AFTER INSERT ON members
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_workspace_member();


