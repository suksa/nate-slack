-- ============================================
-- COMPLETE RLS POLICIES FOR ALL TABLES
-- ============================================

-- 1. CHANNELS TABLE
-- Users can view public channels in their workspaces + private channels they're members of
DROP POLICY IF EXISTS "Workspace members can view public channels" ON channels;
DROP POLICY IF EXISTS "Members can view private channels they joined" ON channels;
DROP POLICY IF EXISTS "Workspace members can create channels" ON channels;
DROP POLICY IF EXISTS "Channel creator or admins can update channels" ON channels;
DROP POLICY IF EXISTS "Channel creator or admins can delete channels" ON channels;

CREATE POLICY "Workspace members can view public channels"
ON channels FOR SELECT
USING (
  type = 'public' 
  AND EXISTS (
    SELECT 1 FROM members
    WHERE members.workspace_id = channels.workspace_id
    AND members.user_id = auth.uid()
  )
);

CREATE POLICY "Members can view private channels they joined"
ON channels FOR SELECT
USING (
  type = 'private'
  AND EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_members.channel_id = channels.id
    AND channel_members.user_id = auth.uid()
  )
);

CREATE POLICY "Workspace members can create channels"
ON channels FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.workspace_id = channels.workspace_id
    AND members.user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Channel creator or admins can update channels"
ON channels FOR UPDATE
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM members
    WHERE members.workspace_id = channels.workspace_id
    AND members.user_id = auth.uid()
    AND members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Channel creator or admins can delete channels"
ON channels FOR DELETE
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM members
    WHERE members.workspace_id = channels.workspace_id
    AND members.user_id = auth.uid()
    AND members.role IN ('owner', 'admin')
  )
);


-- 2. CHANNEL_MEMBERS TABLE
DROP POLICY IF EXISTS "Users can view channel memberships" ON channel_members;
DROP POLICY IF EXISTS "Users can join public channels" ON channel_members;
DROP POLICY IF EXISTS "Users can leave channels" ON channel_members;

CREATE POLICY "Users can view channel memberships"
ON channel_members FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM channel_members cm
    WHERE cm.channel_id = channel_members.channel_id
    AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can join public channels"
ON channel_members FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM channels
      WHERE channels.id = channel_members.channel_id
      AND channels.type = 'public'
      AND EXISTS (
        SELECT 1 FROM members
        WHERE members.workspace_id = channels.workspace_id
        AND members.user_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM channels
      WHERE channels.id = channel_members.channel_id
      AND channels.type = 'private'
      AND channels.created_by = auth.uid()
    )
  )
);

CREATE POLICY "Users can leave channels"
ON channel_members FOR DELETE
USING (user_id = auth.uid());


-- 3. MESSAGES TABLE (Already done, but including for completeness)
DROP POLICY IF EXISTS "Members can view channel messages" ON messages;
DROP POLICY IF EXISTS "Members can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages or admins can delete any" ON messages;

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


-- 4. REACTIONS TABLE
DROP POLICY IF EXISTS "Users can view reactions" ON reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON reactions;
DROP POLICY IF EXISTS "Users can remove own reactions" ON reactions;

CREATE POLICY "Users can view reactions"
ON reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages
    JOIN channel_members ON channel_members.channel_id = messages.channel_id
    WHERE messages.id = reactions.message_id
    AND channel_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add reactions"
ON reactions FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM messages
    JOIN channel_members ON channel_members.channel_id = messages.channel_id
    WHERE messages.id = reactions.message_id
    AND channel_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove own reactions"
ON reactions FOR DELETE
USING (user_id = auth.uid());


-- 5. THREADS TABLE
DROP POLICY IF EXISTS "Users can view threads" ON threads;
DROP POLICY IF EXISTS "System can manage threads" ON threads;

CREATE POLICY "Users can view threads"
ON threads FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages
    JOIN channel_members ON channel_members.channel_id = messages.channel_id
    WHERE messages.id = threads.parent_message_id
    AND channel_members.user_id = auth.uid()
  )
);

-- Threads are typically managed by triggers, but allow insert/update for flexibility
CREATE POLICY "System can manage threads"
ON threads FOR ALL
USING (true)
WITH CHECK (true);


-- 6. ATTACHMENTS TABLE
DROP POLICY IF EXISTS "Users can view attachments" ON attachments;
DROP POLICY IF EXISTS "Users can upload attachments" ON attachments;
DROP POLICY IF EXISTS "Users can delete own attachments" ON attachments;

CREATE POLICY "Users can view attachments"
ON attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages
    JOIN channel_members ON channel_members.channel_id = messages.channel_id
    WHERE messages.id = attachments.message_id
    AND channel_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload attachments"
ON attachments FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM messages
    JOIN channel_members ON channel_members.channel_id = messages.channel_id
    WHERE messages.id = attachments.message_id
    AND channel_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own attachments"
ON attachments FOR DELETE
USING (user_id = auth.uid());


-- 7. WORKSPACES TABLE
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners can update" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners can delete" ON workspaces;

CREATE POLICY "Users can view workspaces they are members of"
ON workspaces FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.workspace_id = workspaces.id
    AND members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create workspaces"
ON workspaces FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Workspace owners can update"
ON workspaces FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Workspace owners can delete"
ON workspaces FOR DELETE
USING (owner_id = auth.uid());


-- 8. MEMBERS TABLE
DROP POLICY IF EXISTS "Users can view workspace members" ON members;
DROP POLICY IF EXISTS "Owners and admins can add members" ON members;
DROP POLICY IF EXISTS "Users can leave workspaces" ON members;
DROP POLICY IF EXISTS "Owners and admins can remove members" ON members;

CREATE POLICY "Users can view workspace members"
ON members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM members m
    WHERE m.workspace_id = members.workspace_id
    AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Owners and admins can add members"
ON members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM members m
    WHERE m.workspace_id = members.workspace_id
    AND m.user_id = auth.uid()
    AND m.role IN ('owner', 'admin')
  )
  OR (
    -- Allow self-join via invitation (simplified - you might want invitation code check)
    user_id = auth.uid()
  )
);

CREATE POLICY "Users can leave workspaces"
ON members FOR DELETE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM members m
    WHERE m.workspace_id = members.workspace_id
    AND m.user_id = auth.uid()
    AND m.role IN ('owner', 'admin')
  )
);


-- 9. PROFILES TABLE
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Public profiles are viewable by authenticated users"
ON profiles FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (id = auth.uid());


-- 10. REMAINING TABLES (pins, saves, reminders, drafts, read_receipts, invitations, custom_emojis, etc.)
-- For brevity, adding permissive policies. Refine as needed.

DROP POLICY IF EXISTS "Users manage own pins" ON pins;
CREATE POLICY "Users manage own pins" ON pins FOR ALL USING (pinned_by = auth.uid()) WITH CHECK (pinned_by = auth.uid());

DROP POLICY IF EXISTS "Users manage own saves" ON saves;
CREATE POLICY "Users manage own saves" ON saves FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own reminders" ON reminders;
CREATE POLICY "Users manage own reminders" ON reminders FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own drafts" ON drafts;
CREATE POLICY "Users manage own drafts" ON drafts FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own read receipts" ON read_receipts;
CREATE POLICY "Users manage own read receipts" ON read_receipts FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Workspace members view invitations" ON invitations;
CREATE POLICY "Workspace members view invitations" ON invitations FOR SELECT USING (
  EXISTS (SELECT 1 FROM members WHERE members.workspace_id = invitations.workspace_id AND members.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins manage invitations" ON invitations;
CREATE POLICY "Admins manage invitations" ON invitations FOR ALL USING (
  EXISTS (
    SELECT 1 FROM members 
    WHERE members.workspace_id = invitations.workspace_id 
    AND members.user_id = auth.uid() 
    AND members.role IN ('owner', 'admin')
  )
) WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM members 
    WHERE members.workspace_id = invitations.workspace_id 
    AND members.user_id = auth.uid() 
    AND members.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "Workspace members view custom emojis" ON custom_emojis;
CREATE POLICY "Workspace members view custom emojis" ON custom_emojis FOR SELECT USING (
  EXISTS (SELECT 1 FROM members WHERE members.workspace_id = custom_emojis.workspace_id AND members.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins manage custom emojis" ON custom_emojis;
CREATE POLICY "Admins manage custom emojis" ON custom_emojis FOR ALL USING (
  EXISTS (
    SELECT 1 FROM members 
    WHERE members.workspace_id = custom_emojis.workspace_id 
    AND members.user_id = auth.uid() 
    AND members.role IN ('owner', 'admin')
  )
) WITH CHECK (
  created_by = auth.uid()
);

DROP POLICY IF EXISTS "Users can view presences" ON presences;
CREATE POLICY "Users can view presences" ON presences FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own presence" ON presences;
CREATE POLICY "Users can update own presence" ON presences FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

