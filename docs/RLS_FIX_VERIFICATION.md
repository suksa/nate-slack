# 채널 생성 RLS 정책 수정 완료

## 문제점
기존 구현에서 `channels` 테이블에 대한 **INSERT 정책이 누락**되어 있어서 채널 생성 시 RLS 오류가 발생했습니다.

## 수정 내용

### 1. 완전한 RLS 정책 적용 (`docs/COMPLETE_RLS_POLICIES.sql`)
모든 테이블에 대한 포괄적인 RLS 정책을 작성하고 적용했습니다:

- **channels**: 워크스페이스 멤버만 채널 생성 가능
- **channel_members**: 공개 채널은 자유 참여, 비공개 채널은 생성자만 멤버 추가 가능
- **messages, reactions, attachments**: 채널 멤버만 접근 가능
- **workspaces, members**: 멤버십 기반 접근 제어
- **기타 테이블**: 소유자 기반 접근 제어

### 2. 테스트 스크립트 작성 (`tests/channel-creation.spec.ts`)
Playwright를 사용한 E2E 테스트:
- 워크스페이스 생성 후 기본 채널 존재 확인
- 공개 채널 생성 검증
- 비공개 채널 생성 검증
- 유효성 검사 확인

## 테스트 실행 방법

```bash
# Playwright 테스트 실행
npm run test

# 또는 UI 모드로 실행
npx playwright test --ui

# 특정 테스트만 실행
npx playwright test channel-creation
```

## 수동 테스트 체크리스트

1. **워크스페이스 생성**
   - [ ] 새 워크스페이스 생성 시 #general, #random 채널이 자동으로 생성되는가?

2. **채널 생성**
   - [ ] 채널 이름 입력이 정상적으로 작동하는가?
   - [ ] 채널 설명 입력이 정상적으로 작동하는가?
   - [ ] 공개/비공개 체크박스가 작동하는가?
   - [ ] "채널 생성" 버튼 클릭 시 채널이 생성되는가?
   - [ ] 생성된 채널이 사이드바에 표시되는가?

3. **RLS 정책**
   - [ ] 다른 워크스페이스의 채널이 보이지 않는가?
   - [ ] 비공개 채널이 멤버가 아닌 사용자에게 보이지 않는가?

## 마이그레이션 적용 확인

Supabase Dashboard에서 확인:
1. SQL Editor에서 다음 쿼리 실행:
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('channels', 'channel_members', 'messages')
ORDER BY tablename, policyname;
```

2. 각 테이블에 최소 2개 이상의 정책이 있어야 합니다.

## 다음 단계
실제 앱을 실행하고 채널 생성을 테스트해주세요. 문제가 발생하면 브라우저 콘솔의 오류 메시지를 확인해주세요.

