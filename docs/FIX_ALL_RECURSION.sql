-- ==========================================
-- 🚨 모든 테이블 무한 재귀 및 RLS 오류 통합 해결
-- ==========================================
--
-- 문제: channel_members, channels, messages 등 서로 참조하는 테이블 간의 RLS 정책이
--       상호 호출되거나 자기 자신을 호출하여 "infinite recursion" 발생.
-- 해결: SECURITY DEFINER 함수를 사용하여 RLS를 우회하는 안전한 조회 함수들을 만들고,
--       모든 정책이 테이블 직접 조회가 아닌 이 함수들을 사용하도록 변경.
--

-- ==========================================
-- 1. Helper Functions (SECURITY DEFINER)
-- ==========================================

-- 1.1 내 워크스페이스 ID 목록 (기존 함수 재정의)
CREATE OR REPLACE FUNCTION get_my_workspace_ids()
RETURNS setof uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT workspace_id FROM members WHERE user_id = auth.uid();
$$;

-- 1.2 워크스페이스 관리자 여부 (기존 함수 재정의)
CREATE OR REPLACE FUNCTION is_workspace_member(lookup_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM members 
    WHERE workspace_id = lookup_workspace_id 
    AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_workspace_admin(lookup_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM members 
    WHERE workspace_id = lookup_workspace_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  );
$$;

-- 1.3 내가 접근 가능한 채널 ID 목록
-- (내가 가입한 채널 OR 내가 속한 워크스페이스의 공개 채널)
CREATE OR REPLACE FUNCTION get_my_accessible_channel_ids()
RETURNS setof uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  -- 1. 내가 멤버인 채널
  SELECT channel_id 
  FROM channel_members 
  WHERE user_id = auth.uid()
  
  UNION
  
  -- 2. 내가 속한 워크스페이스의 공개 채널
  SELECT c.id
  FROM channels c
  WHERE c.type = 'public'
  AND c.workspace_id IN (SELECT workspace_id FROM members WHERE user_id = auth.uid());
END;
$$;

-- 1.4 특정 채널의 멤버인지 확인 (쓰기 권한 확인용)
CREATE OR REPLACE FUNCTION is_channel_member(lookup_channel_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM channel_members 
    WHERE channel_id = lookup_channel_id 
    AND user_id = auth.uid()
  );
$$;

-- ==========================================
-- 2. 기존 정책 삭제 (Clean up)
-- ==========================================

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE tablename IN ('channels', 'channel_members', 'messages', 'reactions', 'threads', 'attachments', 'pins', 'saves', 'reminders', 'drafts', 'read_receipts') 
        AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- ==========================================
-- 3. 테이블별 새 정책 적용
-- ==========================================

-- ------------------------------------------
-- 3.1 CHANNELS
-- ------------------------------------------
-- 조회: 내가 접근 가능한 채널 (가입함 or 공개)
CREATE POLICY "channels_select"
ON channels FOR SELECT
TO authenticated
USING (
  id IN ( SELECT get_my_accessible_channel_ids() )
);

-- 생성: 워크스페이스 멤버면 생성 가능
CREATE POLICY "channels_insert"
ON channels FOR INSERT
TO authenticated
WITH CHECK (
  is_workspace_member(workspace_id)
);

-- 수정: 관리자 또는 생성자
CREATE POLICY "channels_update"
ON channels FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR
  is_workspace_admin(workspace_id)
);

-- 삭제: 관리자만
CREATE POLICY "channels_delete"
ON channels FOR DELETE
TO authenticated
USING (
  is_workspace_admin(workspace_id)
);

-- ------------------------------------------
-- 3.2 CHANNEL_MEMBERS
-- ------------------------------------------
-- 조회: 내가 속한 채널의 멤버 목록은 볼 수 있음 OR 공개 채널의 멤버 목록
-- (단, channel_members 테이블 자체의 재귀를 막기 위해 함수 사용 필수)
CREATE POLICY "channel_members_select"
ON channel_members FOR SELECT
TO authenticated
USING (
  -- 내가 접근 가능한 채널의 멤버 정보만 조회 가능
  channel_id IN ( SELECT get_my_accessible_channel_ids() )
);

-- 가입(INSERT): 
-- 1. 공개 채널: 워크스페이스 멤버면 누구나 가입 가능
-- 2. 비공개 채널: 기존 멤버가 초대(INSERT)하거나 본인이 초대받은 경우
CREATE POLICY "channel_members_insert"
ON channel_members FOR INSERT
TO authenticated
WITH CHECK (
  -- 본인이 가입하는 경우 (공개 채널)
  (
    user_id = auth.uid() 
    AND 
    EXISTS (
      SELECT 1 FROM channels c
      WHERE c.id = channel_id 
      AND c.type = 'public'
      AND is_workspace_member(c.workspace_id)
    )
  )
  OR
  -- 다른 사람을 초대하는 경우 (기존 멤버가)
  (
    is_channel_member(channel_id)
  )
);

-- 탈퇴/삭제(DELETE): 본인 또는 관리자
CREATE POLICY "channel_members_delete"
ON channel_members FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = channel_members.channel_id
    AND is_workspace_admin(c.workspace_id)
  )
);

-- ------------------------------------------
-- 3.3 MESSAGES
-- ------------------------------------------
-- 조회: 내가 접근 가능한 채널의 메시지
CREATE POLICY "messages_select"
ON messages FOR SELECT
TO authenticated
USING (
  channel_id IN ( SELECT get_my_accessible_channel_ids() )
);

-- 작성: 채널 멤버만 가능
CREATE POLICY "messages_insert"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  is_channel_member(channel_id)
  AND
  user_id = auth.uid()
);

-- 수정: 본인만
CREATE POLICY "messages_update"
ON messages FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
);

-- 삭제: 본인 또는 관리자
CREATE POLICY "messages_delete"
ON messages FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = messages.channel_id
    AND is_workspace_admin(c.workspace_id)
  )
);

-- ------------------------------------------
-- 3.4 REACTIONS, THREADS, ATTACHMENTS (Dependent on Messages)
-- ------------------------------------------

-- REACTIONS
CREATE POLICY "reactions_select" ON reactions FOR SELECT TO authenticated
USING ( EXISTS (SELECT 1 FROM messages m WHERE m.id = message_id AND m.channel_id IN (SELECT get_my_accessible_channel_ids())) );

CREATE POLICY "reactions_insert" ON reactions FOR INSERT TO authenticated
WITH CHECK ( user_id = auth.uid() AND EXISTS (SELECT 1 FROM messages m WHERE m.id = message_id AND is_channel_member(m.channel_id)) );

CREATE POLICY "reactions_delete" ON reactions FOR DELETE TO authenticated
USING ( user_id = auth.uid() );

-- THREADS
CREATE POLICY "threads_select" ON threads FOR SELECT TO authenticated
USING ( EXISTS (SELECT 1 FROM messages m WHERE m.id = parent_message_id AND m.channel_id IN (SELECT get_my_accessible_channel_ids())) );

-- ATTACHMENTS
CREATE POLICY "attachments_select" ON attachments FOR SELECT TO authenticated
USING ( EXISTS (SELECT 1 FROM messages m WHERE m.id = message_id AND m.channel_id IN (SELECT get_my_accessible_channel_ids())) );

CREATE POLICY "attachments_insert" ON attachments FOR INSERT TO authenticated
WITH CHECK ( user_id = auth.uid() AND EXISTS (SELECT 1 FROM messages m WHERE m.id = message_id AND is_channel_member(m.channel_id)) );

CREATE POLICY "attachments_delete" ON attachments FOR DELETE TO authenticated
USING ( user_id = auth.uid() );

-- ------------------------------------------
-- 3.5 USER SPECIFIC (Pins, Saves, Drafts, etc.)
-- ------------------------------------------

-- PINS
CREATE POLICY "pins_select" ON pins FOR SELECT TO authenticated
USING ( channel_id IN (SELECT get_my_accessible_channel_ids()) );

CREATE POLICY "pins_insert" ON pins FOR INSERT TO authenticated
WITH CHECK ( is_channel_member(channel_id) ); -- 누구나 고정 가능? 정책에 따라 다름

CREATE POLICY "pins_delete" ON pins FOR DELETE TO authenticated
WITH CHECK ( is_channel_member(channel_id) );

-- SAVES (Personal)
CREATE POLICY "saves_all" ON saves FOR ALL TO authenticated
USING ( user_id = auth.uid() ) WITH CHECK ( user_id = auth.uid() );

-- REMINDERS (Personal)
CREATE POLICY "reminders_all" ON reminders FOR ALL TO authenticated
USING ( user_id = auth.uid() ) WITH CHECK ( user_id = auth.uid() );

-- DRAFTS (Personal)
CREATE POLICY "drafts_all" ON drafts FOR ALL TO authenticated
USING ( user_id = auth.uid() ) WITH CHECK ( user_id = auth.uid() );

-- READ RECEIPTS
CREATE POLICY "read_receipts_select" ON read_receipts FOR SELECT TO authenticated
USING ( channel_id IN (SELECT get_my_accessible_channel_ids()) );

CREATE POLICY "read_receipts_insert" ON read_receipts FOR INSERT TO authenticated
WITH CHECK ( user_id = auth.uid() );

CREATE POLICY "read_receipts_update" ON read_receipts FOR UPDATE TO authenticated
USING ( user_id = auth.uid() );


SELECT '✅ 모든 테이블의 RLS 정책이 재귀 방지 로직으로 업데이트되었습니다.' AS result;

