-- ==========================================
-- 🚨 무한 재귀 오류 완전 해결 (SECURITY DEFINER 방식)
-- ==========================================
--
-- 오류: infinite recursion detected in policy for relation "members"
-- 원인: RLS 정책 내부에서 members 테이블을 다시 조회할 때 RLS가 또 발동하여 무한 루프 발생
-- 해결: SECURITY DEFINER 함수를 사용하여 RLS를 우회하는 안전한 함수로 감쌈
--

-- 1. 내 워크스페이스 ID 목록을 가져오는 함수 (RLS 우회)
CREATE OR REPLACE FUNCTION get_my_workspace_ids()
RETURNS setof uuid
LANGUAGE sql
SECURITY DEFINER -- ⚠️ 핵심: 함수 생성자(Admin) 권한으로 실행되어 RLS를 우회함
SET search_path = public
STABLE
AS $$
  SELECT workspace_id FROM members WHERE user_id = auth.uid();
$$;

-- 2. 워크스페이스 관리자 여부 확인 함수 (RLS 우회)
CREATE OR REPLACE FUNCTION is_workspace_admin(lookup_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM members 
    WHERE workspace_id = lookup_workspace_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  );
$$;

-- 3. 기존 정책 삭제
DROP POLICY IF EXISTS "members_select" ON members;
DROP POLICY IF EXISTS "members_insert" ON members;
DROP POLICY IF EXISTS "members_update" ON members;
DROP POLICY IF EXISTS "members_delete" ON members;
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;

-- 4. MEMBERS 테이블 정책 재설정

-- SELECT: get_my_workspace_ids() 함수 사용으로 재귀 방지
CREATE POLICY "members_select"
ON members FOR SELECT
TO authenticated
USING (
  workspace_id IN ( SELECT get_my_workspace_ids() )
);

-- INSERT: 본인 가입 또는 소유자의 초대
CREATE POLICY "members_insert"
ON members FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
);

-- UPDATE: 관리자만 가능
CREATE POLICY "members_update"
ON members FOR UPDATE
TO authenticated
USING (
  is_workspace_admin(workspace_id)
);

-- DELETE: 본인 탈퇴 또는 관리자 강퇴
CREATE POLICY "members_delete"
ON members FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR
  is_workspace_admin(workspace_id)
);

-- 5. WORKSPACES 테이블 정책 재설정

-- SELECT: 역시 함수 사용하여 안전하게 조회
CREATE POLICY "workspaces_select"
ON workspaces FOR SELECT
TO authenticated
USING (
  id IN ( SELECT get_my_workspace_ids() )
);

-- 나머지 workspaces 정책은 기존 유지 (필요시 추가)
-- INSERT, UPDATE, DELETE 등은 owner_id = auth.uid() 체크이므로 재귀 없음

SELECT '✅ 무한 재귀 오류가 해결되었습니다.' AS result;
