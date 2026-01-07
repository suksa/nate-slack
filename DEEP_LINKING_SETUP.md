# Electron Deep Linking 설정 가이드

이 문서는 Electron 앱에서 이메일 인증 링크를 처리하기 위한 Deep Linking 설정 방법을 설명합니다.

## 📋 설정 완료 사항

### 1. ✅ Electron Main Process 설정 (`src/main.ts`)
- 커스텀 프로토콜 `electrontest://` 등록
- Single instance lock 구현 (중복 실행 방지)
- Deep link URL 파싱 및 처리
- Windows, macOS, Linux 모두 지원

### 2. ✅ 프로토콜 등록 (`package.json`, `forge.config.ts`)
- `electrontest://` 프로토콜 등록
- 앱이 URL scheme의 기본 핸들러로 설정됨

### 3. ✅ 인증 콜백 페이지 (`src/pages/AuthCallback.tsx`)
- URL 해시에서 토큰 추출
- Supabase 세션 설정
- 성공/실패 UI 표시

### 4. ✅ 라우팅 설정 (`src/App.tsx`)
- `/auth/callback` 라우트 추가
- 인증 콜백 처리

### 5. ✅ Supabase 클라이언트 설정 (`src/lib/supabase.ts`)
- PKCE 플로우 활성화
- Session detection 설정

### 6. ✅ 회원가입 리다이렉트 URL (`src/pages/Login.tsx`)
- `emailRedirectTo: 'electrontest://auth/callback'`

## 🔧 Supabase Dashboard 설정 (필수!)

이메일 인증이 작동하려면 Supabase Dashboard에서 다음 설정이 필요합니다:

### 1. Authentication > URL Configuration

**Redirect URLs에 추가:**
```
electrontest://auth/callback
```

### 2. Authentication > Email Templates

**Confirm signup** 템플릿에서 링크 URL 확인:
```html
{{ .ConfirmationURL }}
```

이 URL이 `electrontest://auth/callback` 형식으로 생성되어야 합니다.

## 🚀 사용 방법

### 회원가입 플로우:
1. 사용자가 앱에서 회원가입
2. Supabase가 확인 이메일 발송
3. 사용자가 이메일의 "인증하기" 링크 클릭
4. OS가 `electrontest://` 프로토콜을 인식하고 앱 실행
5. 앱이 `/auth/callback` 페이지로 이동
6. 토큰 추출 및 세션 생성
7. 홈 화면으로 자동 이동

## 🧪 테스트 방법

### 개발 환경:
```bash
npm start
```

### 프로토콜 테스트:
```bash
# Windows (PowerShell)
Start-Process "electrontest://auth/callback#access_token=test&refresh_token=test"

# macOS/Linux
open "electrontest://auth/callback#access_token=test&refresh_token=test"
```

## 📝 주의사항

1. **개발 환경**: `npm start`로 실행 시 프로토콜이 자동 등록됩니다.

2. **프로덕션 빌드**: 
   ```bash
   npm run make
   ```
   빌드된 앱 설치 시 프로토콜이 OS에 등록됩니다.

3. **Windows**: 첫 실행 시 Windows Defender가 경고할 수 있습니다. "추가 정보"를 클릭하고 "실행"을 선택하세요.

4. **macOS**: 코드 서명이 없으면 "확인되지 않은 개발자" 경고가 표시될 수 있습니다. 시스템 환경설정 > 보안 및 개인정보에서 허용하세요.

## 🔍 디버깅

앱 콘솔에서 다음 로그를 확인하세요:

```
🔗 Deep link received: electrontest://auth/callback#access_token=...
📍 Navigating to: /#/auth/callback#access_token=...
🔐 Processing auth callback...
📋 Auth type: signup
🔑 Has access token: true
✅ Authentication successful!
👤 User: user@example.com
```

## 🌐 다른 프로토콜로 변경하려면

`src/main.ts`에서 PROTOCOL 상수 변경:
```typescript
const PROTOCOL = 'yourappname';  // yourappname://
```

그리고 다음 파일들도 함께 수정:
- `package.json` - build.protocols
- `forge.config.ts` - packagerConfig.protocols
- `src/pages/Login.tsx` - emailRedirectTo

## 📚 참고 자료

- [Electron Protocol Handler](https://www.electronjs.org/docs/latest/api/protocol)
- [Supabase Auth Deep Linking](https://supabase.com/docs/guides/auth/auth-deep-linking)
- [Windows Protocol Registration](https://docs.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/platform-apis/aa767914(v=vs.85))

