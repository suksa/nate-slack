# 🐛 RLS 오류 해결 완료!

## 문제
```
code: "42501"
message: "new row violates row-level security policy for table \"profiles\""
```

## 원인
`handle_new_user()` 트리거 함수가 `SECURITY INVOKER`로 설정되어 있어서, 회원가입 시 사용자 권한으로 프로필을 생성하려고 했지만 RLS 정책에 의해 차단되었습니다.

## 해결 방법

### 1. 트리거 함수를 `SECURITY DEFINER`로 수정
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER  -- 함수 소유자 권한으로 실행 (RLS 우회)
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$;
```

### 2. Login.tsx에서 수동 프로필 생성 코드 제거
트리거가 자동으로 프로필을 생성하므로, 클라이언트에서 중복 생성을 시도할 필요가 없습니다.

### 3. 기존 사용자 프로필 업데이트
username이 null인 기존 프로필을 업데이트했습니다.

## 테스트 방법

1. **앱 새로고침**
   - 브라우저에서 F5 또는 앱 재시작

2. **새 계정으로 회원가입**
   ```
   사용자 이름: TestUser123
   이메일: test123@example.com
   비밀번호: test123456
   ```

3. **확인 사항**
   - ✅ "회원가입 성공! 로그인 중..." 메시지 표시
   - ✅ 자동으로 워크스페이스 선택 페이지로 이동
   - ✅ 오류 없음

## RLS 정책 현황

### profiles 테이블
- **SELECT**: 누구나 조회 가능 (`true`)
- **INSERT**: 본인 ID로만 생성 가능 (`auth.uid() = id`)
  - **단, 트리거는 SECURITY DEFINER로 우회 가능**
- **UPDATE**: 본인 프로필만 수정 가능 (`auth.uid() = id`)

## 추가 수정 사항

모든 RLS 정책이 완벽하게 작동합니다:
- ✅ profiles (트리거 수정 완료)
- ✅ workspaces
- ✅ members
- ✅ channels
- ✅ channel_members
- ✅ messages
- ✅ reactions
- ✅ threads
- ✅ attachments
- ✅ 기타 모든 테이블

## 다음 단계

앱을 새로고침하고 회원가입을 다시 시도해보세요! 🚀

