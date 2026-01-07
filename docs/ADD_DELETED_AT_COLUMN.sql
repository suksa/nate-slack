-- profiles 테이블에 deleted_at 컬럼 추가 (소프트 삭제)
-- 회원 탈퇴 시 실제로 데이터를 삭제하지 않고 deleted_at에 타임스탬프 기록
-- 탈퇴된 회원의 메시지와 활동은 그대로 유지됨

-- 1. profiles 테이블에 deleted_at 컬럼 추가
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2. deleted_at 컬럼에 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at);

-- 3. 코멘트 추가
COMMENT ON COLUMN profiles.deleted_at IS '회원 탈퇴 시각 (NULL이면 활성 회원, 값이 있으면 탈퇴한 회원)';

-- 4. 활성 회원만 조회하는 뷰 생성 (선택사항)
CREATE OR REPLACE VIEW active_profiles AS
SELECT * FROM profiles
WHERE deleted_at IS NULL;

-- 5. 탈퇴한 회원 조회하는 뷰 생성 (선택사항)
CREATE OR REPLACE VIEW deleted_profiles AS
SELECT * FROM profiles
WHERE deleted_at IS NOT NULL;

-- 완료!
-- 이제 회원 탈퇴 시 deleted_at에 현재 시각을 기록하면 됩니다.
-- 예: UPDATE profiles SET deleted_at = NOW() WHERE id = 'user_id';

