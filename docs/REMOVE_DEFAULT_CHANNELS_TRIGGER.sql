-- 워크스페이스 생성 시 기본 채널(general, random) 자동 생성 트리거 제거

-- 1. 워크스페이스 생성 시 기본 채널 생성 트리거 제거
DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;

-- 2. 워크스페이스 생성 시 기본 채널 생성 함수 제거 (선택사항 - 다른 곳에서 사용하지 않는다면)
DROP FUNCTION IF EXISTS public.handle_new_workspace();

-- 3. 워크스페이스 멤버 추가 시 기본 채널 자동 참여 트리거 제거
DROP TRIGGER IF EXISTS on_workspace_member_created ON members;

-- 4. 워크스페이스 멤버 추가 시 기본 채널 자동 참여 함수 제거 (선택사항)
DROP FUNCTION IF EXISTS public.handle_new_workspace_member();

-- 참고: 기존에 생성된 general, random 채널은 그대로 유지됩니다.
-- 필요하다면 수동으로 삭제하거나, 아래 쿼리로 일괄 삭제할 수 있습니다:
-- DELETE FROM channels WHERE name IN ('general', 'random');

