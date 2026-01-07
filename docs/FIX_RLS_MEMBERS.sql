-- ==========================================
-- 🔧 MEMBERS 테이블 무한 재귀 에러 수정
-- ==========================================
-- Supabase Dashboard > SQL Editor에서 실행하세요!
-- 
-- 📌 profiles vs members 차이:
-- - profiles: 전역 사용자 프로필 (1인당 1개)
-- - members: 워크스페이스별 멤버십 (1인당 N개)
--
-- ==========================================

-- 1단계: 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON members;
DROP POLICY IF EXISTS "Workspace owners can add members" ON members;
DROP POLICY IF EXISTS "Admins can update member roles" ON members;
DROP POLICY IF EXISTS "Users can leave or admins can remove members" ON members;
DROP POLICY IF EXISTS "members_select_policy" ON members;
DROP POLICY IF EXISTS "members_insert_policy" ON members;
DROP POLICY IF EXISTS "members_update_policy" ON members;
DROP POLICY IF EXISTS "members_delete_policy" ON members;
DROP POLICY IF EXISTS "Users can view workspace members" ON members;
DROP POLICY IF EXISTS "Users can view own memberships" ON members;
DROP POLICY IF EXISTS "Workspace owners can manage members" ON members;
DROP POLICY IF EXISTS "Allow workspace owners to add members" ON members;
DROP POLICY IF EXISTS "Users can insert members" ON members;
DROP POLICY IF EXISTS "Members can view workspace members" ON members;
DROP POLICY IF EXISTS "members_can_view" ON members;
DROP POLICY IF EXISTS "members_can_insert" ON members;
DROP POLICY IF EXISTS "members_can_update" ON members;
DROP POLICY IF EXISTS "members_can_delete" ON members;

-- 2단계: RLS 활성화 확인
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- 3단계: 새로운 정책 생성 (Supabase Best Practices 적용)
-- 참고: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices

-- SELECT: 본인이 속한 워크스페이스의 멤버만 조회 (IN 방식 - 성능 최적화)
CREATE POLICY "members_can_view"
ON members FOR SELECT
TO authenticated
USING (
  -- Supabase Best Practice: IN (SELECT ...) 방식 사용
  workspace_id IN (
    SELECT workspace_id 
    FROM members
    WHERE user_id = auth.uid()
  )
);

-- INSERT: 워크스페이스 소유자 또는 본인 추가
CREATE POLICY "members_can_insert"
ON members FOR INSERT
TO authenticated
WITH CHECK (
  -- 본인을 멤버로 추가하는 경우
  user_id = auth.uid()
  OR
  -- 워크스페이스 소유자가 추가하는 경우
  workspace_id IN (
    SELECT id FROM workspaces
    WHERE owner_id = auth.uid()
  )
);

-- UPDATE: 워크스페이스 소유자나 관리자만 수정 가능
CREATE POLICY "members_can_update"
ON members FOR UPDATE
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM members
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- DELETE: 본인 탈퇴 또는 관리자가 제거
CREATE POLICY "members_can_delete"
ON members FOR DELETE
TO authenticated
USING (
  -- 본인이 나가는 경우
  user_id = auth.uid()
  OR
  -- 관리자가 제거하는 경우
  workspace_id IN (
    SELECT workspace_id 
    FROM members
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- ==========================================
-- 🔧 WORKSPACES 테이블 정책 수정
-- ==========================================

-- 1단계: 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON workspaces;
DROP POLICY IF EXISTS "Users can create their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners can update" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners can delete" ON workspaces;
DROP POLICY IF EXISTS "workspaces_select_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete_policy" ON workspaces;

-- 2단계: RLS 활성화 확인
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- 3단계: 새로운 정책 생성

-- SELECT: 본인이 멤버인 워크스페이스만 조회
CREATE POLICY "workspaces_can_view"
ON workspaces FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.workspace_id = workspaces.id
    AND members.user_id = auth.uid()
  )
);

-- INSERT: 누구나 워크스페이스 생성 가능 (본인이 소유자)
CREATE POLICY "workspaces_can_create"
ON workspaces FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- UPDATE: 소유자만 수정 가능
CREATE POLICY "workspaces_can_update"
ON workspaces FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

-- DELETE: 소유자만 삭제 가능
CREATE POLICY "workspaces_can_delete"
ON workspaces FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- ==========================================
-- 🔧 외래 키 및 인덱스 설정
-- ==========================================

-- 외래 키 추가 (없는 경우만)
DO $$ 
BEGIN
    -- members -> workspaces
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'members_workspace_id_fkey'
    ) THEN
        ALTER TABLE members
        ADD CONSTRAINT members_workspace_id_fkey
        FOREIGN KEY (workspace_id)
        REFERENCES workspaces(id)
        ON DELETE CASCADE;
    END IF;

    -- members -> auth.users
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'members_user_id_fkey'
    ) THEN
        ALTER TABLE members
        ADD CONSTRAINT members_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- 성능을 위한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_workspace_id ON members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_members_workspace_user ON members(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);

-- ==========================================
-- ✅ 완료! 
-- ==========================================
SELECT '✅ RLS 정책이 성공적으로 수정되었습니다!' AS status;

