# Supabase 데이터베이스 스키마 가이드

이 문서는 NATE SLACK 클론 프로젝트를 위해 설정된 Supabase PostgreSQL 데이터베이스의 스키마 및 정책을 설명합니다.

## 1. 개요
*   **플랫폼**: Supabase (PostgreSQL)
*   **목적**: 실시간 채팅, 워크스페이스 관리, 사용자 인증 및 상태 관리
*   **보안**: 모든 테이블에 RLS (Row Level Security) 적용

---

## 2. 데이터 타입 (Enums)

데이터의 무결성을 위해 다음과 같은 커스텀 Enum 타입을 사용합니다.

| 타입명 | 값 (Values) | 설명 |
| :--- | :--- | :--- |
| **`user_role`** | `owner`, `admin`, `member`, `guest` | 워크스페이스 내 사용자 권한 레벨 |
| **`channel_type`** | `public`, `private` | 채널 공개 범위 |
| **`user_status`** | `active`, `away`, `dnd`, `offline` | 사용자 현재 상태 |

---

## 3. 테이블 구조 (Schema)

### 3.1 사용자 및 인증
| 테이블명 | 설명 | 주요 컬럼 |
| :--- | :--- | :--- |
| **`profiles`** | 사용자 프로필 정보 (Auth 연동) | `id`(PK), `username`, `full_name`, `avatar_url`, `status`, `status_message` |

### 3.2 워크스페이스 및 멤버
| 테이블명 | 설명 | 주요 컬럼 |
| :--- | :--- | :--- |
| **`workspaces`** | 워크스페이스 메타데이터 | `id`(PK), `name`, `slug`(Unique), `owner_id`, `icon_url` |
| **`members`** | 워크스페이스별 멤버 및 권한 | `id`(PK), `workspace_id`, `user_id`, `role`, `joined_at` |
| **`invitations`** | 워크스페이스 초대 링크 관리 | `id`(PK), `code`, `workspace_id`, `expires_at`, `max_uses`, `used_count` |

### 3.3 채널 및 메시지
| 테이블명 | 설명 | 주요 컬럼 |
| :--- | :--- | :--- |
| **`channels`** | 채팅 채널 정보 | `id`(PK), `workspace_id`, `name`, `type`, `description`, `topic` |
| **`channel_members`** | 채널 참여 정보 및 읽음 상태 | `channel_id`(PK), `user_id`(PK), `notification_level`, `last_read_at` |
| **`messages`** | 채팅 메시지 (스레드 포함) | `id`(PK), `channel_id`, `user_id`, `content`, `parent_id`(스레드), `is_edited` |
| **`threads`** | 스레드 메타데이터 (답글 수 등) | `parent_message_id`(PK), `reply_count`, `participant_count`, `last_reply_at` |
| **`reactions`** | 메시지 이모지 반응 | `id`(PK), `message_id`, `user_id`, `emoji` |
| **`attachments`** | 파일 첨부 메타데이터 | `id`(PK), `message_id`, `user_id`, `file_url`, `file_name`, `file_size` |

### 3.4 사용자 기능 및 편의성
| 테이블명 | 설명 | 주요 컬럼 |
| :--- | :--- | :--- |
| **`presences`** | 사용자 실시간 접속 상태 | `user_id`(PK), `workspace_id`, `status`, `status_message`, `last_seen_at` |
| **`pins`** | 채널 고정 메시지 | `channel_id`(PK), `message_id`(PK), `pinned_by` |
| **`saves`** | 북마크(저장됨) 메시지 | `user_id`(PK), `message_id`(PK), `saved_at` |
| **`reminders`** | 메시지 리마인더 | `id`(PK), `user_id`, `message_id`, `remind_at`, `completed` |
| **`drafts`** | 메시지 임시 저장 | `user_id`(PK), `channel_id`(PK), `content` |
| **`read_receipts`** | 상세 읽음 확인 (동기화용) | `user_id`(PK), `channel_id`(PK), `last_read_message_id` |

### 3.5 확장 기능
| 테이블명 | 설명 | 주요 컬럼 |
| :--- | :--- | :--- |
| **`custom_emojis`** | 워크스페이스 커스텀 이모지 | `id`(PK), `workspace_id`, `name`, `image_url` |
| **`webhooks`** | 외부 연동 웹훅 설정 | `id`(PK), `workspace_id`, `channel_id`, `url`, `secret` |
| **`workflow_automations`** | 워크플로우 자동화 설정 | `id`(PK), `workspace_id`, `trigger_type`, `actions`(JSONB) |

---

## 4. 보안 정책 (RLS Policies)

모든 테이블에는 **Row Level Security (RLS)**가 활성화되어 있습니다.

### 주요 정책 예시

1.  **Profiles**
    *   **SELECT**: 누구나 조회 가능 (공개 프로필)
    *   **UPDATE**: 본인(`auth.uid() = id`)만 수정 가능

2.  **Workspaces**
    *   **SELECT**: 해당 워크스페이스의 멤버(`members` 테이블 확인)만 조회 가능
    *   **UPDATE**: 워크스페이스 소유자(`owner_id`)만 수정 가능

3.  **Messages**
    *   **SELECT**: 해당 채널의 멤버(`channel_members` 테이블 확인)만 조회 가능
    *   **INSERT**: 해당 채널의 멤버이면서 본인 아이디로만 작성 가능
    *   **UPDATE/DELETE**: 본인이 작성한 메시지만 수정/삭제 가능 (관리자 권한 별도)

---

## 5. 트리거 및 자동화 (Triggers & Functions)

### 5.1 `handle_new_user`
*   **작동 시점**: Supabase Auth에 새로운 사용자가 가입(`auth.users` INSERT)될 때
*   **기능**: `public.profiles` 테이블에 해당 사용자의 프로필 행을 자동으로 생성합니다.

### 5.2 `update_modified_column`
*   **작동 시점**: `profiles`, `messages` 테이블 등의 행이 수정(UPDATE)될 때
*   **기능**: `updated_at` 컬럼의 값을 현재 시간(`NOW()`)으로 자동 갱신합니다.

---

## 6. 클라이언트 사용 예시 (TypeScript)

```typescript
// 1. 워크스페이스의 채널 목록 가져오기
const { data: channels, error } = await supabase
  .from('channels')
  .select('*')
  .eq('workspace_id', 'YOUR_WORKSPACE_ID');

// 2. 새 메시지 보내기
const { data: message, error } = await supabase
  .from('messages')
  .insert({
    channel_id: 'CHANNEL_ID',
    user_id: supabase.auth.user()?.id,
    content: '안녕하세요!'
  });

// 3. 실시간 메시지 수신 (Realtime)
const subscription = supabase
  .channel('public:messages')
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'messages',
    filter: 'channel_id=eq.CHANNEL_ID' 
  }, (payload) => {
    console.log('새 메시지 도착:', payload.new);
  })
  .subscribe();
```

