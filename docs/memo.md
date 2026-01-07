# [기능정의서] 프로젝트명: NATE SLACK (네이트 슬랙 클론) - 완전판

## 1. 백엔드 아키텍처 (Supabase 기반)

이 프로젝트는 별도의 백엔드 서버 구축 최소화를 위해 **Supabase**를 메인 플랫폼으로 사용합니다.

* **Database**: PostgreSQL (Supabase 제공)
* **Authentication**: Supabase Auth (Magic Link, Social OAuth)
* **Real-time**: Supabase Realtime (메시지, 상태 변경 감지)
* **Storage**: Supabase Storage (이미지, 파일 업로드)
* **Edge Functions**: 알림 발송, 이미지 리사이징 등 서버리스 로직 처리

---

## 2. 인증 및 워크스페이스 관리 (Auth & Workspace)

### 2.1 로그인/회원가입
* Supabase Auth를 통한 **Magic Link**(이메일 기반 무비밀번호 로그인)
* Google/GitHub/Apple 소셜 로그인 연동
* **SSO(Single Sign-On)**: 기업용 SAML 2.0 인증 지원
* **2FA(Two-Factor Authentication)**: TOTP 기반 2단계 인증
* 비밀번호 로그인 옵션 (bcrypt 해싱)
* 비밀번호 재설정 플로우 (이메일 인증)

### 2.2 멀티 워크스페이스
* 사용자는 여러 워크스페이스에 참여 가능
* 워크스페이스별로 별도의 프로필(닉네임, 사진, 상태 메시지) 설정 가능
* 워크스페이스 간 빠른 전환 UI (사이드바 상단)
* **워크스페이스 설정**:
  * 이름, 아이콘, 커버 이미지
  * 도메인 커스터마이징 (예: yourcompany.nateslack.com)
  * 워크스페이스 설명 및 가이드라인
  * 기본 채널 설정 (#general, #random 등)
  * 멤버 가입 승인 방식 (자동/수동)

### 2.3 초대 시스템
* 특정 이메일로 초대장 발송 (Edge Function 활용)
* 고유 초대 링크 생성 및 유효 기간 설정 (1일/7일/30일/무제한)
* **초대 링크 옵션**:
  * 사용 횟수 제한 (1회/10회/무제한)
  * 특정 채널 자동 참여 설정
  * 게스트 계정으로 초대 (제한된 권한)
* 초대 이력 관리 (누가, 언제, 누구를 초대했는지)
* 대량 초대 (CSV 파일 업로드)
* 공개 가입 링크 (누구나 가입 가능)

### 2.4 역할 및 권한 관리
* **역할 계층**:
  * **Workspace Owner**: 최고 관리자, 워크스페이스 삭제 가능
  * **Workspace Admin**: 멤버 관리, 채널 관리, 설정 변경
  * **Full Member**: 모든 채널 접근, 채널 생성 가능
  * **Guest**: 특정 채널만 접근 가능, 제한된 기능
* **세부 권한 설정**:
  * 채널 생성 권한
  * 앱 설치 권한
  * 파일 공유 권한
  * 외부 초대 권한
  * 워크스페이스 데이터 내보내기 권한

---

## 3. 채널 및 다이렉트 메시지 (Channels & DM)

### 3.1 채널 (Public/Private)
* `#` 기호로 구분되는 공개/비공개 채널
* **채널 생성 시 설정**:
  * 채널 이름 (소문자, 하이픈, 언더스코어만 허용)
  * 채널 설명 (목적 명시)
  * 공개/비공개 선택
  * 기본 멤버 자동 추가 설정
* **채널 관리**:
  * 채널 이름 변경
  * 채널 아카이브 (삭제하지 않고 보관)
  * 채널 언아카이브 (복원)
  * 채널 삭제 (관리자만, 복구 불가 경고)
  * 다른 채널로 병합
* **채널별 알림 설정**:
  * 모든 메시지 알림
  * @멘션 및 키워드만 알림
  * 무음 (알림 없음, 뱃지만 표시)
* **채널 북마크**: 자주 사용하는 링크, 파일, 메시지를 채널 상단에 고정
* **채널 설명 및 토픽**: 채널 상단에 항상 표시되는 주제/설명 영역
* **채널 캔버스**: 채널 전용 공동 편집 문서 (노션 스타일)

### 3.2 다이렉트 메시지 (DM)
* 1:1 대화
* 그룹 DM (최대 9명)
* **본인과의 대화**: 메모장/북마크 대용
* **그룹 DM 관리**:
  * 그룹 이름 변경
  * 멤버 추가/제거
  * 그룹 DM을 채널로 전환
* DM 목록 정렬 (최근 활동순/알파벳순)

### 3.3 섹션 및 사이드바 관리
* **사용자 정의 섹션**: 채널을 카테고리별로 그룹화
  * 예: "개발팀", "마케팅", "프로젝트 A" 등
* **채널 정렬**:
  * 알파벳순
  * 최근 활동순
  * 수동 드래그 앤 드롭
* **즐겨찾기(Starred)**: 중요한 채널을 사이드바 상단에 고정
* **Unreads**: 읽지 않은 메시지가 있는 채널을 별도로 모아보기
* **Drafts(임시 저장)**: 메시지를 입력하다가 다른 채널로 이동해도 입력 내용 보존
* **모든 DM 보기**: 아카이브된 DM 포함 전체 목록
* **모든 채널 찾아보기**: 워크스페이스의 모든 공개 채널 탐색 및 참여

---

## 4. 메시징 엔진 (Messaging Engine)

### 4.1 실시간 통신 (Supabase Realtime)
* `supabase_realtime`을 통해 데이터베이스의 `INSERT`, `UPDATE`, `DELETE` 이벤트를 클라이언트가 즉시 수신
* WebSocket 연결 자동 재연결 로직
* 네트워크 끊김 시 메시지 큐잉 및 재전송

### 4.2 메시지 작성 기능
* **리치 텍스트 에디터**:
  * 마크다운 지원 (**, *, ~~, `code`, ```code block```)
  * 인라인 코드 하이라이팅
  * 코드 블록 언어 선택 및 신택스 하이라이팅
  * 블록 인용 (>)
  * 순서 있는 목록 / 순서 없는 목록
* **멘션 시스템**:
  * `@사용자명`: 특정 사용자 태그 (알림 발송)
  * `@channel`: 채널의 모든 멤버에게 알림
  * `@here`: 현재 온라인인 멤버에게만 알림
  * `@everyone`: 워크스페이스 전체 알림 (관리자만)
* **해시태그**: `#채널명` 입력 시 자동 링크 생성
* **이모지 피커**: 기본 이모지 + 커스텀 이모지 선택
* **파일 첨부**:
  * 드래그 앤 드롭 업로드
  * 클립보드에서 붙여넣기 (Ctrl+V)
  * 최대 파일 크기: 1GB
  * 지원 형식: 이미지, 동영상, PDF, 문서, 코드 파일 등
  * 여러 파일 동시 업로드
* **링크 프리뷰**: URL 입력 시 OpenGraph 데이터 자동 추출 (Edge Functions)
* **메시지 예약 발송**: 특정 시간에 메시지 전송 예약

### 4.3 메시지 상호작용
* **편집**: 자신의 메시지 수정 (수정 이력 표시)
* **삭제**: 메시지 삭제 (관리자는 다른 사용자 메시지도 삭제 가능)
* **반응(Reactions)**: 이모지로 빠른 반응
  * 이모지 클릭 시 누가 반응했는지 표시
  * 같은 이모지 여러 명 사용 시 카운트 표시
* **스레드(Threads)**:
  * 원문 메시지에 대한 깊이 있는 대화
  * "이 답글을 채널에도 전송" 옵션
  * 스레드 내 답글 개수 표시
  * 스레드 참여자 표시 (아바타)
  * 스레드 팔로우/언팔로우 (알림 제어)
* **메시지 고정(Pin)**: 중요한 메시지를 채널 상단에 고정
* **메시지 북마크(Save)**: 나중에 다시 보기 위해 개인적으로 저장
* **메시지 공유**: 다른 채널이나 DM으로 메시지 전달
* **리마인더**: 특정 시간에 메시지 알림 받기 (20분 후, 내일, 다음 주 등)

### 4.4 입력 중 표시 (Typing Indicator)
* 상대방이 메시지를 작성 중일 때 "OO님이 입력 중..." 표시
* 여러 명이 입력 중일 때 "OO님, △△님이 입력 중..." 표시
* 3초간 입력이 없으면 자동으로 표시 제거

### 4.5 읽음 확인 (Read Receipts)
* 채널/DM별로 어디까지 읽었는지 실시간 동기화
* 마지막으로 읽은 메시지 아래에 "새 메시지" 구분선 표시
* 읽지 않은 메시지 개수 뱃지 표시
* DM에서 상대방이 메시지를 읽었는지 확인 가능

### 4.6 메시지 포맷팅
* **인용 회신(Quote Reply)**: 특정 메시지를 인용하여 답장
* **텍스트 포맷 단축키**:
  * Ctrl+B: 굵게
  * Ctrl+I: 기울임
  * Ctrl+Shift+X: 취소선
  * Ctrl+Shift+C: 코드
* **링크 삽입**: 텍스트에 하이퍼링크 추가 (텍스트 선택 후 Ctrl+K)

---

## 5. 상호작용 및 멀티미디어 (Interactions & Media)

### 5.1 커스텀 이모지
* 워크스페이스 관리자가 고유의 이모지를 업로드하여 사용
* 이모지 이름으로 빠른 검색 (:emoji_name:)
* 이모지 카테고리 분류 (회사 로고, 밈, 감정 등)
* GIF 애니메이션 이모지 지원
* 이모지 별칭(Alias) 설정

### 5.2 허들 (Huddles - 보이스톡)
* **WebRTC 기반 실시간 음성 대화**:
  * 채널 내에서 가볍게 시작하고 종료
  * 최대 50명 동시 참여
  * 화면 공유 기능
  * 마이크 음소거/음소거 해제
  * 스피커 볼륨 조절
  * 참여자 목록 표시
  * 허들 중에도 텍스트 채팅 가능
  * 허들 녹음 기능 (클라우드 저장)
* **허들 알림**: 허들 시작 시 채널 멤버에게 알림

### 5.3 통화 기능 (Calls)
* **음성 통화**: 1:1 또는 그룹 음성 통화
* **영상 통화**: 1:1 또는 그룹 영상 통화
  * 카메라 켜기/끄기
  * 가상 배경 설정
  * 화면 레이아웃 선택 (그리드/스피커 뷰)
* **화면 공유**:
  * 전체 화면 또는 특정 창 공유
  * 시스템 오디오 공유
  * 주석 도구 (화면에 그리기)

### 5.4 파일 관리
* **Supabase Storage 활용**:
  * 자동 썸네일 생성 (이미지, 동영상)
  * 프로그레시브 업로드 (대용량 파일)
  * 업로드 취소 기능
* **파일 미리보기**:
  * 이미지: 인라인 표시 및 라이트박스
  * PDF: 브라우저 내 뷰어
  * 동영상: 인라인 플레이어
  * 코드 파일: 신택스 하이라이팅
  * Office 문서: Google Docs Viewer 연동
* **파일 검색**:
  * 파일명, 확장자, 업로더, 날짜로 필터링
  * 모든 파일 보기 (채널/DM별)
  * 최근 파일 빠른 접근
* **외부 파일 연동**:
  * Google Drive 링크 프리뷰
  * Dropbox 링크 프리뷰
  * Figma 파일 임베드

### 5.5 슬래시 커맨드 (Slash Commands)
* **기본 명령어**:
  * `/invite @user`: 채널에 사용자 초대
  * `/leave`: 현재 채널 나가기
  * `/remove @user`: 채널에서 사용자 제거 (관리자)
  * `/topic [주제]`: 채널 주제 변경
  * `/rename [새 이름]`: 채널 이름 변경
  * `/archive`: 채널 아카이브
  * `/mute`: 채널 알림 끄기
  * `/remind [내용] [시간]`: 리마인더 설정
  * `/dnd [시간]`: 방해 금지 모드 설정
  * `/status [상태 메시지]`: 상태 메시지 변경
  * `/shrug [메시지]`: ¯\_(ツ)_/¯ 추가
  * `/me [액션]`: 액션 메시지 (예: "춤을 춥니다")
  * `/poll [질문] [옵션1] [옵션2]`: 투표 생성
* **커스텀 슬래시 커맨드**: 관리자가 워크스페이스별로 커스텀 명령어 추가 가능

### 5.6 메시지 액션 및 워크플로우
* **메시지 액션 버튼**: 메시지에 커스텀 버튼 추가 (예: "승인", "거절")
* **자동화 워크플로우**:
  * 특정 이벤트 발생 시 자동 액션 실행
  * 예: 새 멤버 가입 시 환영 메시지 자동 발송
  * 예: 특정 키워드 감지 시 채널로 자동 전달

---

## 6. 검색 및 히스토리 (Search & Discovery)

### 6.1 통합 검색
* **Full-text Search**: PostgreSQL의 `tsvector`를 활용한 전체 텍스트 검색
* **검색 대상**:
  * 메시지 내용
  * 파일명 및 파일 내용 (텍스트 추출)
  * 채널 이름 및 설명
  * 사용자 이름 및 프로필
* **검색 필터**:
  * `from:@사용자`: 특정 사용자가 작성한 메시지
  * `in:#채널`: 특정 채널 내 검색
  * `has:link`: 링크가 포함된 메시지
  * `has:file`: 파일이 첨부된 메시지
  * `has:reaction`: 반응이 달린 메시지
  * `is:saved`: 내가 저장한 메시지
  * `is:pinned`: 고정된 메시지
  * `before:날짜`, `after:날짜`, `on:날짜`: 날짜 범위 지정
* **검색 결과 정렬**: 관련성 순/최신순
* **검색 히스토리**: 최근 검색어 저장 및 빠른 재검색

### 6.2 고급 검색 모달
* 필터 조합을 GUI로 쉽게 설정
* 검색 결과를 컨텍스트와 함께 표시
* 검색 결과에서 바로 메시지 이동

### 6.3 최근 활동 (Activity)
* **멘션 및 반응 타임라인**:
  * 나를 태그한 메시지
  * 내 메시지에 달린 반응(Reaction)
  * 내가 팔로우하는 스레드의 새 답글
* **읽지 않음 모아보기**: 모든 채널/DM의 읽지 않은 메시지 한눈에 보기
* 날짜별 필터링

### 6.4 메시지 히스토리 및 아카이브
* 무제한 메시지 히스토리 (데이터베이스 용량만 고려)
* 오래된 메시지도 검색 가능
* 메시지 내보내기 (JSON, CSV, HTML 형식)

---

## 7. 알림 및 상태 관리 (Notifications & Presence)

### 7.1 알림 시스템
* **알림 방식**:
  * 데스크톱 푸시 알림 (Electron Notification API)
  * 브라우저 푸시 알림 (Web Push API)
  * 이메일 알림 (Supabase Edge Functions)
  * 모바일 푸시 알림 (Firebase Cloud Messaging)
* **알림 설정**:
  * **전역 설정**:
    * 모든 메시지 알림
    * 다이렉트 메시지 및 멘션만
    * 알림 끄기
  * **채널별 설정**: 개별 채널마다 알림 방식 커스터마이징
  * **키워드 알림**: 특정 키워드가 언급되면 알림 (예: "긴급", "버그")
  * **스레드 알림**: 참여 중인 스레드의 새 답글 알림
* **방해 금지 모드 (Do Not Disturb)**:
  * 시간 설정 (20분, 1시간, 오늘까지, 커스텀)
  * 일정 기반 자동 활성화 (예: 매일 밤 10시~아침 8시)
  * 방해 금지 중에도 특정 키워드는 알림 받기
* **알림 스누즈**: 특정 시간 동안 알림 일시 정지
* **알림 센터**: 모든 알림 히스토리 확인 및 관리

### 7.2 상태 관리 (Presence)
* **온라인 상태**:
  * 🟢 **Active**: 현재 활동 중
  * 🟡 **Away**: 자리 비움 (10분간 활동 없음)
  * 🔴 **Do Not Disturb**: 방해 금지
  * ⚪ **Offline**: 오프라인
* **커스텀 상태 메시지**:
  * 이모지 + 텍스트 조합 (예: 🏖️ 휴가 중)
  * 상태 만료 시간 설정 (1시간 후, 오늘까지, 특정 날짜까지, 지울 때까지)
  * 상태 프리셋 (회의 중, 점심시간, 출장 중 등)
* **마지막 활동 시간**: "5분 전 활동" 표시
* **모바일 알림 배지**: 앱 아이콘에 읽지 않은 메시지 개수 표시

---

## 8. 앱 및 통합 (Apps & Integrations)

### 8.1 워크플로우 빌더
* **노코드 자동화**:
  * 트리거 설정 (새 멤버, 특정 이모지 반응, 일정 시간 등)
  * 액션 설정 (메시지 전송, 채널 생성, 외부 API 호출 등)
  * 조건 분기 (IF-THEN-ELSE)
* **사전 구성된 템플릿**: 일반적인 워크플로우 제공

### 8.2 외부 앱 연동
* **Webhook 수신**: 외부 서비스에서 Slack으로 메시지 전송
* **OAuth 앱 설치**: GitHub, Jira, Google Calendar 등
* **앱 디렉토리**: 인기 앱 탐색 및 설치
* **커스텀 앱 개발**: Supabase Edge Functions를 활용한 자체 봇 개발

### 8.3 봇 (Bots)
* **Slackbot**: 기본 도움말 및 안내 봇
* **커스텀 봇 생성**: 워크스페이스별 전용 봇
* **봇 명령어**: 봇과 상호작용하기 위한 명령어 시스템
* **봇 DM**: 봇과 1:1 대화 가능

---

## 9. 일렉트론 데스크톱 전용 (Native Desktop)

### 9.1 딥 링크 (Deep Linking)
* 웹 브라우저나 이메일에서 `nateslack://` 링크 클릭 시 앱 자동 실행
* 특정 채널/DM으로 직접 이동 (예: `nateslack://channel/general`)
* 특정 메시지로 이동 (예: `nateslack://message/12345`)

### 9.2 창 관리
* **항상 위 고정(Always on Top)**: 다른 창 위에 항상 표시
* **미니 윈도우 모드**: 작은 창으로 채팅만 빠르게 확인
* **확대/축소(Zoom)**: Ctrl++ / Ctrl+- 로 폰트 크기 조절
* **전체 화면 모드**: F11 키로 전환
* **멀티 윈도우**: 여러 개의 독립적인 창 열기 (워크스페이스별, 채널별)

### 9.3 트레이 아이콘
* 시스템 트레이에 아이콘 표시
* 읽지 않은 메시지 개수 뱃지
* 트레이 메뉴: 상태 변경, 환경설정, 종료
* 창 닫기 시 트레이로 최소화 옵션

### 9.4 키보드 단축키
* **글로벌 단축키**: 앱이 백그라운드에 있어도 작동
  * Ctrl+Shift+K: Quick Switcher (채널/DM 빠른 전환)
  * Ctrl+K: 검색
  * Ctrl+Shift+A: 모든 읽지 않음 보기
  * Ctrl+.: 환경설정 열기
  * Ctrl+/: 단축키 도움말
* **채널 탐색**:
  * Alt+↑/↓: 이전/다음 채널
  * Alt+Shift+↑/↓: 이전/다음 읽지 않은 채널
  * Ctrl+[1-9]: 사이드바의 N번째 항목으로 이동
* **메시지 작성**:
  * Ctrl+B/I/Shift+X: 서식 적용
  * Tab: 멘션/이모지 자동완성
  * ↑: 마지막 메시지 편집
  * Shift+Enter: 줄바꿈 (Enter는 전송)

### 9.5 시스템 통합
* **스타트업 자동 실행**: OS 부팅 시 자동 시작
* **하드웨어 가속**: GPU 가속 활성화로 부드러운 애니메이션
* **다운로드 관리**: 파일 다운로드 위치 설정
* **맞춤법 검사**: OS 수준 맞춤법 검사 통합
* **OS 다크 모드 연동**: 시스템 테마에 따라 자동 전환

### 9.6 오프라인 모드
* 최근 메시지 로컬 캐싱
* 오프라인 상태에서도 메시지 읽기 가능
* 네트워크 복구 시 자동 동기화
* 오프라인 중 작성한 메시지 자동 전송

---

## 10. 사용자 프로필 및 계정 관리

### 10.1 프로필 커스터마이징
* **프로필 사진**: 이미지 업로드 또는 웹캠 촬영
* **표시 이름**: 워크스페이스별로 다르게 설정 가능
* **전체 이름**: 실명
* **발음 표기**: 이름 발음 가이드
* **직책/역할**: 직함 표시
* **현지 시간**: 시간대 설정 및 표시
* **전화번호**: 비즈니스 연락처
* **소개**: 자기소개 텍스트

### 10.2 환경설정
* **테마**: 
  * 라이트 모드
  * 다크 모드
  * 자동 (시스템 설정 따라가기)
  * 커스텀 테마 (색상 조합)
* **사이드바 테마**: 별도의 사이드바 색상 커스터마이징
* **언어**: 다국어 지원 (한국어, 영어, 일본어 등)
* **글꼴 크기**: 작게/보통/크게
* **이모지 스타일**: 네이티브/트위터/구글
* **메시지 디스플레이**:
  * 컴팩트 모드 (한 줄에 더 많은 메시지)
  * 편안한 모드 (여백 많음)
* **시간 표시 형식**: 12시간제/24시간제

### 10.3 계정 관리
* **이메일 변경**: 이메일 인증 필요
* **비밀번호 변경**: 기존 비밀번호 확인 후 변경
* **세션 관리**: 현재 로그인된 모든 디바이스 목록 및 원격 로그아웃
* **계정 삭제**: 모든 데이터 영구 삭제 (복구 불가)
* **데이터 내보내기**: 개인 메시지 및 파일 백업

---

## 11. 관리자 및 분석 기능 (Admin & Analytics)

### 11.1 워크스페이스 분석
* **사용 통계**:
  * 활성 사용자 수 (일/주/월)
  * 메시지 전송 수
  * 파일 공유 수
  * 평균 응답 시간
* **채널 통계**: 가장 활발한 채널, 사용되지 않는 채널
* **사용자 활동 로그**: 관리 목적의 감사 로그

### 11.2 콘텐츠 관리
* **메시지 보존 정책**:
  * 특정 기간 후 메시지 자동 삭제
  * 특정 채널 제외 설정
* **법적 보존(Legal Hold)**: 소송 대비 데이터 보존
* **데이터 손실 방지(DLP)**: 민감한 정보 자동 감지 및 경고

### 11.3 멤버 관리
* **멤버 목록**: 모든 워크스페이스 멤버 확인
* **비활성 계정 관리**: 장기 미사용 계정 비활성화
* **게스트 관리**: 게스트 권한 및 접근 채널 제어
* **벌크 작업**: 여러 사용자에게 동시에 권한 변경

---

## 12. 데이터베이스 스키마 설계 (확장판)

### 12.1 핵심 테이블

| 테이블명 | 설명 | 주요 컬럼 |
|---------|------|-----------|
| **workspaces** | 워크스페이스 정보 | id, name, slug, icon_url, created_at, owner_id |
| **channels** | 채널 정보 | id, workspace_id, name, type(public/private), description, topic, created_at, created_by |
| **members** | 워크스페이스 멤버 | id, workspace_id, user_id, role(owner/admin/member/guest), joined_at |
| **channel_members** | 채널 참여자 | channel_id, user_id, joined_at, notification_level |
| **messages** | 메시지 | id, channel_id, user_id, content, parent_id(thread), created_at, updated_at, deleted_at |
| **reactions** | 메시지 반응 | id, message_id, user_id, emoji, created_at |
| **threads** | 스레드 메타데이터 | parent_message_id, reply_count, participant_count, last_reply_at |
| **attachments** | 파일 첨부 | id, message_id, file_url, file_name, file_size, mime_type, uploaded_at |
| **presences** | 사용자 상태 | user_id, workspace_id, status(active/away/dnd/offline), status_message, status_emoji, last_seen_at |
| **pins** | 고정 메시지 | channel_id, message_id, pinned_by, pinned_at |
| **saves** | 저장된 메시지 | user_id, message_id, saved_at |
| **reminders** | 리마인더 | user_id, message_id, remind_at, completed |
| **drafts** | 임시 저장 메시지 | user_id, channel_id, content, updated_at |
| **read_receipts** | 읽음 확인 | user_id, channel_id, last_read_message_id, last_read_at |
| **invitations** | 초대 링크 | id, workspace_id, code, created_by, expires_at, max_uses, used_count |
| **custom_emojis** | 커스텀 이모지 | id, workspace_id, name, image_url, created_by |
| **webhooks** | 웹훅 | id, workspace_id, channel_id, url, secret, created_by |
| **workflow_automations** | 자동화 워크플로우 | id, workspace_id, name, trigger_type, actions, enabled |

### 12.2 인덱스 전략
* `messages`: (channel_id, created_at), (user_id, created_at), (parent_id)
* `reactions`: (message_id, emoji), (user_id)
* `channel_members`: (channel_id, user_id), (user_id, workspace_id)
* `read_receipts`: (user_id, channel_id)
* Full-text search를 위한 GIN 인덱스: `messages(to_tsvector('english', content))`

### 12.3 파티셔닝
* `messages` 테이블: created_at 기준 월별 파티셔닝 (성능 최적화)
* `attachments` 테이블: created_at 기준 분기별 파티셔닝

---

## 13. 보안 및 정책 (Security - RLS 확장)

### 13.1 Row Level Security (RLS) 정책

#### Messages 테이블
```sql
-- 읽기: 채널 멤버만 메시지 조회 가능
CREATE POLICY "Members can view channel messages"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_members.channel_id = messages.channel_id
    AND channel_members.user_id = auth.uid()
  )
);

-- 쓰기: 채널 멤버만 메시지 작성 가능
CREATE POLICY "Members can insert messages"
ON messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_members.channel_id = messages.channel_id
    AND channel_members.user_id = auth.uid()
  )
  AND messages.user_id = auth.uid()
);

-- 수정: 본인 메시지만 수정 가능
CREATE POLICY "Users can update own messages"
ON messages FOR UPDATE
USING (user_id = auth.uid());

-- 삭제: 본인 메시지 또는 관리자만 삭제 가능
CREATE POLICY "Users can delete own messages or admins can delete any"
ON messages FOR DELETE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM members
    WHERE members.workspace_id = (
      SELECT workspace_id FROM channels WHERE channels.id = messages.channel_id
    )
    AND members.user_id = auth.uid()
    AND members.role IN ('owner', 'admin')
  )
);
```

### 13.2 추가 보안 기능
* **API Rate Limiting**: Supabase Edge Functions에서 요청 빈도 제한
* **IP 화이트리스트**: 특정 IP에서만 접근 허용 (엔터프라이즈)
* **감사 로그**: 모든 중요한 작업 (채널 생성, 멤버 추가/제거) 로깅
* **데이터 암호화**: 
  * 전송 중 암호화 (TLS 1.3)
  * 저장 데이터 암호화 (AES-256)
* **세션 타임아웃**: 일정 시간 비활동 시 자동 로그아웃
* **CSRF 보호**: 토큰 기반 요청 검증
* **XSS 방지**: 사용자 입력 sanitization

---

## 14. 성능 최적화

### 14.1 프론트엔드 최적화
* **가상 스크롤링**: 수천 개의 메시지를 부드럽게 렌더링
* **이미지 레이지 로딩**: 뷰포트에 진입할 때만 이미지 로드
* **코드 스플리팅**: 라우트별 번들 분리
* **Service Worker**: 오프라인 캐싱 및 백그라운드 동기화
* **WebP 이미지 포맷**: 더 작은 파일 크기

### 14.2 백엔드 최적화
* **Connection Pooling**: 데이터베이스 연결 재사용
* **쿼리 최적화**: N+1 문제 방지, JOIN 최소화
* **Redis 캐싱**: 자주 조회되는 데이터 (채널 목록, 사용자 프로필)
* **CDN**: Supabase Storage의 정적 파일을 CDN으로 배포
* **Debouncing**: 타이핑 인디케이터 등 빈번한 이벤트 제어

### 14.3 실시간 최적화
* **Presence 최적화**: 상태 변경만 브로드캐스트 (heartbeat 최소화)
* **메시지 배칭**: 여러 메시지를 한 번에 전송
* **선택적 구독**: 현재 보고 있는 채널만 실시간 구독

---

## 15. 접근성 (Accessibility)

* **키보드 네비게이션**: 모든 기능을 키보드만으로 사용 가능
* **스크린 리더 지원**: ARIA 라벨 및 의미론적 HTML
* **고대비 모드**: 시각 장애인을 위한 테마
* **폰트 크기 조절**: 사용자 맞춤 텍스트 크기
* **포커스 인디케이터**: 명확한 포커스 상태 표시
* **대체 텍스트**: 모든 이미지에 alt 속성

---

## 16. 국제화 (i18n)

* **다국어 UI**: 한국어, 영어, 일본어, 중국어 등
* **날짜/시간 현지화**: 사용자의 타임존에 맞게 표시
* **RTL 지원**: 아랍어, 히브리어 등 우측에서 좌측으로 읽는 언어
* **통화 표시**: 지역별 통화 기호

---

## 17. 모니터링 및 에러 핸들링

* **에러 트래킹**: Sentry 연동으로 실시간 에러 모니터링
* **성능 모니터링**: 페이지 로드 시간, API 응답 시간 추적
* **사용자 피드백**: 앱 내에서 버그 리포트 및 기능 제안
* **헬스 체크**: 주요 서비스의 상태 대시보드

---

## 18. 마이그레이션 및 백업

* **데이터 가져오기**: Slack, Discord, Teams에서 데이터 이전
* **자동 백업**: 매일 전체 데이터베이스 백업
* **Point-in-Time Recovery**: 특정 시점으로 복원
* **재해 복구 계획**: Multi-region 배포

---

## 19. 추가 예정 기능 (Roadmap)

### Phase 1 (MVP)
- 인증, 워크스페이스, 채널, DM, 기본 메시징

### Phase 2
- 스레드, 파일 공유, 검색, 알림

### Phase 3
- 허들, 통화, 앱 통합, 워크플로우

### Phase 4
- 고급 분석, 엔터프라이즈 기능, AI 어시스턴트

### Future Considerations
* **AI 기반 기능**:
  * 메시지 요약
  * 스마트 답장 제안
  * 자동 번역
  * 감정 분석
* **캔버스(Canvas)**: 공동 편집 문서 도구 (노션 스타일)
* **클립(Clips)**: 짧은 비디오 메시지 녹화 및 공유
* **리스트(Lists)**: 프로젝트 관리 도구 통합

---
