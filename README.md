# NATE-communication

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.1-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Electron](https://img.shields.io/badge/Electron-39.2.7-47848F?logo=electron)
![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-3178C6?logo=typescript)

**Electron 기반 실시간 협업 메신저 애플리케이션**

Slack과 유사한 기능을 제공하는 데스크톱 채팅 애플리케이션입니다.

[기능](#-주요-기능) • [설치](#-시작하기) • [사용법](#-사용-방법) • [개발](#-개발) • [문서](#-문서)

</div>

---

## 📋 목차

- [소개](#-소개)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [시작하기](#-시작하기)
- [사용 방법](#-사용-방법)
- [프로젝트 구조](#-프로젝트-구조)
- [데이터베이스](#-데이터베이스)
- [개발](#-개발)
- [테스트](#-테스트)
- [빌드 및 배포](#-빌드-및-배포)
- [라이선스](#-라이선스)

## 🎯 소개

**NATE-communication**은 Supabase를 백엔드로 사용하는 Electron 기반 데스크톱 메신저 애플리케이션입니다. 실시간 채팅, 워크스페이스 관리, 다이렉트 메시지 등 팀 협업에 필요한 핵심 기능을 제공합니다.

### 주요 특징

- 🚀 **실시간 동기화**: Supabase Realtime을 통한 즉각적인 메시지 전송
- 🔒 **보안**: Row Level Security (RLS) 기반 데이터 보호
- 💬 **스레드 지원**: 메시지에 대한 답글 및 스레드 기능
- 🎨 **모던 UI**: Tailwind CSS 기반 반응형 디자인
- 🧪 **테스트**: Playwright 기반 E2E 테스트 포함
- 📦 **크로스 플랫폼**: Windows, macOS, Linux 지원

## ✨ 주요 기능

### ✅ 구현 완료

#### 🔐 인증 시스템
- **이메일/비밀번호 로그인**: 전통적인 인증 방식
- **Magic Link**: 비밀번호 없이 이메일 링크로 로그인
- **자동 프로필 생성**: 회원가입 시 자동 프로필 생성
- **세션 관리**: 자동 토큰 갱신 및 세션 유지
- **Deep Linking**: 커스텀 프로토콜(`electrontest://`)을 통한 인증 콜백 처리

#### 🏢 워크스페이스 관리
- **멀티 워크스페이스**: 여러 워크스페이스에 동시 참여
- **워크스페이스 생성**: 간편한 워크스페이스 생성 및 관리
- **역할 기반 권한**: owner, admin, member, guest 4단계 권한 시스템
- **멤버 관리**: 워크스페이스 멤버 초대 및 관리
- **워크스페이스 전환**: 사이드바에서 빠른 워크스페이스 전환

#### 📢 채널 기능
- **공개/비공개 채널**: 채널 타입 선택 가능
- **채널 생성**: 워크스페이스 내 채널 생성
- **채널 참여**: 공개 채널 자동 참여, 비공개 채널 수동 참여
- **채널 멤버 관리**: 채널별 멤버 추가/제거
- **읽음 상태**: 채널별 메시지 읽음 상태 추적

#### 💬 다이렉트 메시지 (DM)
- **1:1 대화**: 워크스페이스 멤버와 직접 대화
- **멤버 검색**: 워크스페이스 멤버 검색 기능
- **기존 DM 감지**: 이미 존재하는 DM 자동 재사용
- **읽음 표시**: DM 읽음 상태 표시

#### 📨 메시징
- **실시간 메시지**: Supabase Realtime을 통한 즉각적인 메시지 동기화
- **메시지 전송**: Enter로 전송, Shift+Enter로 줄바꿈
- **메시지 편집**: 작성한 메시지 수정 가능
- **메시지 삭제**: 작성한 메시지 삭제 가능
- **읽음 표시**: 메시지 읽음 상태 표시

#### 😊 이모지 리액션
- **7가지 기본 이모지**: 👍, ❤️, 😂, 😮, 😢, 😡, ✅
- **리액션 추가/제거**: 메시지에 이모지 반응 추가
- **카운트 표시**: 같은 이모지 반응 개수 표시
- **실시간 업데이트**: 리액션 변경사항 실시간 반영

#### 🧵 스레드 기능
- **답글 작성**: 메시지에 대한 답글 작성
- **스레드 사이드바**: 우측 사이드바에서 스레드 확인
- **답글 개수 표시**: 원본 메시지에 답글 개수 표시
- **스레드 참여자**: 스레드에 참여한 사용자 목록
- **마지막 답글 시간**: 최근 답글 시간 표시

#### 📎 파일 첨부
- **파일 업로드**: Supabase Storage를 통한 파일 업로드
- **다중 파일 지원**: 여러 파일 동시 업로드
- **이미지 미리보기**: 이미지 파일 인라인 표시
- **파일 다운로드**: 일반 파일 다운로드 기능
- **업로드 진행 상태**: 파일 업로드 진행 상황 표시

#### 🖥️ 데스크톱 기능
- **커스텀 타이틀바**: 프레임리스 윈도우 및 커스텀 타이틀바
- **시스템 트레이**: 최소화 시 시스템 트레이로 이동
- **윈도우 제어**: 최소화, 최대화, 닫기 기능
- **Deep Linking**: 커스텀 프로토콜을 통한 외부 링크 처리

#### 🧪 테스트
- **E2E 테스트**: Playwright 기반 자동화 테스트
- **테스트 커버리지**: 회원가입, 워크스페이스 생성, 채널 생성, 메시지 전송 등

### 🚧 진행 중 / 계획 중

- 🔍 **검색 기능**: 메시지, 파일, 사용자 검색
- 🔔 **알림 시스템**: 데스크톱 푸시 알림
- 📞 **음성/영상 통화**: WebRTC 기반 통화 기능
- 🎨 **커스텀 이모지**: 워크스페이스별 커스텀 이모지
- 🤖 **봇 및 자동화**: 워크플로우 자동화
- 📊 **분석 및 통계**: 사용량 통계 및 분석

## 🛠️ 기술 스택

### 프론트엔드
- **React** `19.2.3` - UI 라이브러리
- **TypeScript** `5.3.3` - 타입 안정성
- **React Router** `7.11.0` - 클라이언트 사이드 라우팅
- **TanStack Query** `5.90.16` - 서버 상태 관리 및 캐싱

### 데스크톱
- **Electron** `39.2.7` - 크로스 플랫폼 데스크톱 앱 프레임워크
- **Electron Forge** `7.10.2` - 빌드 및 패키징 도구

### 빌드 도구
- **Vite** `5.4.21` - 빠른 빌드 도구
- **TypeScript** `5.3.3` - 타입 체크 및 컴파일
- **ESLint** `8.57.1` - 코드 품질 관리

### 스타일링
- **Tailwind CSS** `4.1.18` - 유틸리티 우선 CSS 프레임워크
- **PostCSS** `8.5.6` - CSS 후처리
- **Autoprefixer** `10.4.23` - 브라우저 호환성

### 백엔드 (Supabase)
- **PostgreSQL** - 관계형 데이터베이스
- **Supabase Auth** - 인증 시스템
- **Supabase Realtime** - 실시간 데이터 동기화
- **Supabase Storage** - 파일 저장소

### UI 컴포넌트
- **Radix UI** `1.2.4` - 접근성 우선 UI 컴포넌트
- **Lucide React** `0.562.0` - 아이콘 라이브러리
- **class-variance-authority** `0.7.1` - 컴포넌트 변형 관리
- **clsx** `2.1.1` - 조건부 클래스명 유틸리티
- **tailwind-merge** `3.4.0` - Tailwind 클래스 병합

### 테스트
- **Playwright** `1.57.0` - E2E 테스트 프레임워크

## 🚀 시작하기

### 필수 요구사항

- **Node.js** `18.x` 이상
- **npm** `9.x` 이상
- **Supabase 프로젝트** (또는 기존 Supabase 인스턴스)

### 1. 저장소 클론

```bash
git clone https://github.com/your-username/nate-communication.git
cd nate-communication
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> **참고**: Supabase 프로젝트가 없다면 [Supabase](https://supabase.com)에서 무료로 생성할 수 있습니다.

### 3. 의존성 설치

```bash
npm install
```

### 4. 앱 실행

#### 개발 모드

```bash
npm start
```

개발 모드에서는 Hot Module Replacement (HMR)가 활성화되어 코드 변경 시 자동으로 반영됩니다.

#### 프로덕션 빌드

```bash
npm run package
```

빌드된 앱은 `out/` 디렉토리에 생성됩니다.

### 5. 테스트 실행

```bash
# 먼저 앱을 패키징해야 합니다
npm run package

# E2E 테스트 실행
npx playwright test
```

## 📖 사용 방법

### 회원가입 및 로그인

#### 이메일/비밀번호 로그인

1. 앱 실행 후 "회원가입" 탭 클릭
2. 사용자 이름, 이메일, 비밀번호 입력
3. "회원가입" 버튼 클릭
4. 자동으로 로그인되어 워크스페이스 선택 화면으로 이동

#### Magic Link 로그인

1. "로그인" 탭에서 이메일 입력
2. "Magic Link로 로그인" 버튼 클릭
3. 이메일로 전송된 링크 클릭
4. 앱이 자동으로 열리며 로그인 완료

### 워크스페이스 관리

#### 워크스페이스 생성

1. 로그인 후 "Create New Workspace" 버튼 클릭
2. 워크스페이스 이름 입력
3. 생성 완료 시 자동으로 owner 권한 부여

#### 워크스페이스 전환

1. 사이드바 상단의 워크스페이스 드롭다운 클릭
2. 전환할 워크스페이스 선택

### 채널 사용

#### 채널 생성

1. 사이드바 "Channels" 섹션의 `+` 버튼 클릭
2. 채널 이름 입력 (소문자, 하이픈 자동 변환)
3. 공개/비공개 선택
4. 채널 생성 완료

#### 채널 참여

- **공개 채널**: 자동으로 목록에 표시되며 클릭하여 참여
- **비공개 채널**: 초대받거나 직접 참여 요청

### 다이렉트 메시지

1. 사이드바 "Direct Messages" 섹션의 `+` 버튼 클릭
2. 대화할 멤버 검색 및 선택
3. 기존 DM이 있으면 자동으로 해당 대화로 이동

### 메시지 전송

1. 채널 또는 DM 선택
2. 하단 입력창에 메시지 입력
3. `Enter` 키로 전송, `Shift + Enter`로 줄바꿈

### 스레드 답글

1. 메시지에 마우스 오버
2. 나타나는 💬 아이콘 클릭
3. 우측 사이드바에서 답글 작성
4. 답글 개수는 원본 메시지 하단에 표시

### 이모지 리액션

1. 메시지에 마우스 오버
2. 나타나는 😊 아이콘 클릭
3. 원하는 이모지 선택
4. 같은 이모지는 카운트로 표시

### 파일 첨부

1. 메시지 입력창 옆의 📎 아이콘 클릭
2. 파일 선택 (다중 선택 가능)
3. 업로드 완료 시 자동으로 메시지에 첨부
4. 이미지는 미리보기, 일반 파일은 다운로드 링크 제공

## 📁 프로젝트 구조

```
nate-communication/
├── src/
│   ├── components/          # React 컴포넌트
│   │   ├── ui/              # 재사용 가능한 UI 컴포넌트
│   │   ├── AuthProvider.tsx
│   │   ├── ChannelMembersModal.tsx
│   │   ├── ChatArea.tsx     # 메인 채팅 영역
│   │   ├── CreateChannelModal.tsx
│   │   ├── CreateWorkspaceModal.tsx
│   │   ├── CustomTitleBar.tsx
│   │   ├── InviteUserModal.tsx
│   │   ├── MainLayout.tsx
│   │   ├── SearchModal.tsx
│   │   ├── Sidebar.tsx      # 사이드바 네비게이션
│   │   ├── ThreadsList.tsx
│   │   ├── ThreadView.tsx  # 스레드 뷰
│   │   ├── UserProfileModal.tsx
│   │   ├── UserSelectModal.tsx
│   │   └── WorkspaceSidebar.tsx
│   ├── contexts/            # React Context
│   │   └── AuthContext.tsx  # 인증 상태 관리
│   ├── hooks/               # Custom Hooks
│   │   ├── useProfile.ts
│   │   └── ...
│   ├── lib/                 # 유틸리티 및 설정
│   │   ├── supabase.ts      # Supabase 클라이언트
│   │   ├── queryClient.ts   # TanStack Query 설정
│   │   └── ...
│   ├── pages/               # 페이지 컴포넌트
│   │   ├── AuthCallback.tsx # 인증 콜백 처리
│   │   ├── Login.tsx        # 로그인 페이지
│   │   └── ProfileSettings.tsx
│   ├── types/               # TypeScript 타입 정의
│   │   ├── database.types.ts # Supabase 타입
│   │   ├── electron.d.ts
│   │   └── supabase.ts
│   ├── App.tsx              # 메인 앱 컴포넌트
│   ├── main.ts              # Electron 메인 프로세스
│   ├── preload.ts           # Preload 스크립트
│   └── renderer.tsx         # 렌더러 진입점
├── assets/                  # 정적 리소스
│   ├── supabase-logo.png
│   └── supabase-logo.svg
├── docs/                    # 문서
│   ├── SUPABASE_SCHEMA.md  # 데이터베이스 스키마
│   ├── COMPLETION_REPORT.md
│   └── ...
├── tests/                   # E2E 테스트
│   ├── channel-creation.spec.ts
│   ├── complete-flow.spec.ts
│   ├── electron.spec.ts
│   └── login-test.spec.ts
├── forge.config.ts          # Electron Forge 설정
├── vite.main.config.ts      # Vite 메인 프로세스 설정
├── vite.preload.config.ts  # Vite Preload 설정
├── vite.renderer.config.ts  # Vite 렌더러 설정
├── tailwind.config.js       # Tailwind CSS 설정
├── tsconfig.json            # TypeScript 설정
├── playwright.config.ts     # Playwright 설정
└── package.json
```

## 🗄️ 데이터베이스

### 스키마 개요

이 프로젝트는 Supabase (PostgreSQL)를 데이터베이스로 사용합니다. 자세한 스키마 정보는 [`docs/SUPABASE_SCHEMA.md`](docs/SUPABASE_SCHEMA.md)를 참조하세요.

### 주요 테이블

| 테이블 | 설명 |
|--------|------|
| `profiles` | 사용자 프로필 정보 |
| `workspaces` | 워크스페이스 메타데이터 |
| `members` | 워크스페이스 멤버십 및 권한 |
| `channels` | 채널 정보 (공개/비공개) |
| `channel_members` | 채널 참여 정보 및 읽음 상태 |
| `messages` | 채팅 메시지 (스레드 포함) |
| `threads` | 스레드 메타데이터 |
| `reactions` | 이모지 반응 |
| `attachments` | 파일 첨부 메타데이터 |
| `presences` | 사용자 실시간 접속 상태 |

### 보안

모든 테이블에는 **Row Level Security (RLS)**가 활성화되어 있어 사용자는 자신이 접근 권한이 있는 데이터만 조회/수정할 수 있습니다.

### 데이터 타입 (Enums)

- `user_role`: `owner`, `admin`, `member`, `guest`
- `channel_type`: `public`, `private`
- `user_status`: `active`, `away`, `dnd`, `offline`

## 💻 개발

### 개발 환경 설정

1. 저장소 클론 및 의존성 설치 (위의 "시작하기" 참조)
2. `.env` 파일 설정
3. `npm start`로 개발 서버 실행

### 코드 스타일

이 프로젝트는 ESLint를 사용하여 코드 품질을 관리합니다:

```bash
npm run lint
```

### 타입 생성

Supabase 스키마가 변경되면 TypeScript 타입을 재생성해야 합니다. Supabase MCP를 통해 자동으로 생성됩니다.

### 주요 개발 도구

- **Vite**: 빠른 개발 서버 및 빌드
- **TypeScript**: 타입 안정성
- **ESLint**: 코드 품질 관리
- **Prettier**: 코드 포맷팅 (선택사항)

## 🧪 테스트

### E2E 테스트

Playwright를 사용한 End-to-End 테스트가 포함되어 있습니다:

```bash
# 테스트 실행
npx playwright test

# 테스트 UI 모드
npx playwright test --ui

# 특정 테스트 실행
npx playwright test tests/login-test.spec.ts
```

### 테스트 커버리지

현재 다음 시나리오가 테스트됩니다:

- ✅ 회원가입 및 로그인
- ✅ 워크스페이스 생성
- ✅ 채널 생성 및 참여
- ✅ 메시지 전송
- ✅ 이모지 리액션
- ✅ 스레드 답글

## 📦 빌드 및 배포

### 프로덕션 빌드

```bash
# 패키징
npm run package

# 설치 파일 생성 (Windows: Squirrel, macOS: ZIP, Linux: DEB/RPM)
npm run make
```

빌드된 파일은 `out/` 디렉토리에 생성됩니다.

### 플랫폼별 빌드

- **Windows**: Squirrel 설치 파일 (`.exe`)
- **macOS**: ZIP 아카이브
- **Linux**: DEB 및 RPM 패키지

### 배포

Electron Forge를 사용하여 각 플랫폼용 설치 파일을 생성할 수 있습니다. 자세한 내용은 [Electron Forge 문서](https://www.electronforge.io/)를 참조하세요.

## 📚 문서

프로젝트의 상세 문서는 `docs/` 디렉토리에 있습니다:

- [`SUPABASE_SCHEMA.md`](docs/SUPABASE_SCHEMA.md) - 데이터베이스 스키마 상세 설명
- [`COMPLETION_REPORT.md`](docs/COMPLETION_REPORT.md) - 구현 완료 보고서
- [`DEEP_LINKING_SETUP.md`](DEEP_LINKING_SETUP.md) - Deep Linking 설정 가이드

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 🙏 감사의 말

- [Supabase](https://supabase.com) - 백엔드 인프라 제공
- [Electron](https://www.electronjs.org/) - 크로스 플랫폼 데스크톱 앱 프레임워크
- [React](https://react.dev/) - UI 라이브러리
- [Tailwind CSS](https://tailwindcss.com/) - CSS 프레임워크

## 📧 문의

문제가 발생하거나 질문이 있으시면 [Issue](https://github.com/your-username/nate-communication/issues)를 등록해주세요.

---

<div align="center">

**⭐ 이 프로젝트가 도움이 되었다면 Star를 눌러주세요! ⭐**

Made with ❤️ using Electron and React

</div>
