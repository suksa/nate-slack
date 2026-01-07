-- ==========================================
-- 🐛 워크스페이스 생성 오류 해결 (RLS 정책 수정)
-- ==========================================
--
-- 오류: new row violates row-level security policy for table "workspaces"
-- 원인: 워크스페이스 생성(INSERT) 후 결과를 반환(SELECT)하려는데, 
--       아직 members 테이블에 추가되지 않아서 기존 SELECT 정책(members 기준)에 위배됨.
-- 해결: SELECT 정책에 "소유자(owner_id)인 경우"도 추가하여, 
--       방금 생성한 워크스페이스도 조회할 수 있게 함.
--

-- 기존 SELECT 정책 삭제
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;

-- 수정된 SELECT 정책
CREATE POLICY "workspaces_select"
ON workspaces FOR SELECT
TO authenticated
USING (
  -- 1. 내가 멤버로 속한 워크스페이스 (기존 로직)
  id IN ( SELECT get_my_workspace_ids() )
  OR
  -- 2. 내가 소유자인 워크스페이스 (새로 추가)
  -- 이렇게 해야 INSERT 후 RETURNING 시점에 조회가 가능함
  owner_id = auth.uid()
);

SELECT '✅ 워크스페이스 조회 정책이 수정되었습니다.' AS result;

