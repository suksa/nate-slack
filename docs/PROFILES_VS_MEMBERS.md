# 📚 profiles vs members 테이블 차이점

## 왜 두 개의 테이블이 필요한가?

Slack 같은 멀티 워크스페이스 앱에서는 **한 사용자가 여러 워크스페이스에 동시에 속할 수 있습니다**.

---

## 📋 테이블 비교

| 항목 | **profiles** | **members** |
|------|-------------|-------------|
| **목적** | 전역 사용자 프로필 | 워크스페이스별 멤버십 |
| **범위** | 전체 시스템 | 특정 워크스페이스 |
| **개수** | 사용자당 **1개** | 사용자당 **N개** (워크스페이스 수만큼) |
| **연결** | `auth.users` (1:1) | `workspaces` (N:M) |
| **역할** | 없음 (전역) | owner/admin/member/guest |
| **예시 데이터** | 이름, 아바타, 상태 | 어느 워크스페이스의 어느 역할 |

---

## 🎯 실제 예시

### 사용자: `나타리` (user_id: `abc-123`)

#### profiles 테이블 (1개)
```
id: abc-123
username: 나타리
full_name: 김나타
avatar_url: https://...
status: active
```

#### members 테이블 (3개)
```
1. workspace_id: A회사, user_id: abc-123, role: owner
2. workspace_id: B회사, user_id: abc-123, role: member  
3. workspace_id: C회사, user_id: abc-123, role: guest
```

---

## 💡 왜 분리했나?

### ❌ 만약 하나의 테이블만 사용한다면?

```sql
-- 나쁜 예: 하나의 테이블에 모든 정보
users
  - id
  - username
  - avatar_url
  - workspace_id  ← 문제! 여러 워크스페이스는?
  - role          ← 문제! 워크스페이스마다 다른 역할은?
```

**문제점:**
- 한 사용자가 여러 워크스페이스에 속할 수 없음
- 워크스페이스마다 다른 역할을 가질 수 없음
- 데이터 중복 (username, avatar_url을 여러 번 저장)

### ✅ 두 개로 분리한 경우

```sql
-- profiles: 전역 정보 (1회만 저장)
profiles
  - id
  - username
  - avatar_url
  - status

-- members: 관계 정보 (워크스페이스마다 1개)
members
  - workspace_id
  - user_id
  - role  ← 워크스페이스마다 다른 역할!
```

**장점:**
- ✅ 한 사용자가 무제한 워크스페이스에 참여 가능
- ✅ 워크스페이스마다 다른 역할 (A에선 owner, B에선 member)
- ✅ 전역 정보(username, avatar)는 한 곳에만 저장
- ✅ 정규화된 데이터베이스 설계

---

## 🔍 실제 사용 예시

### 1. 사용자 프로필 조회
```typescript
// profiles 테이블 사용
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();
// → 나타리의 전역 프로필 (이름, 아바타)
```

### 2. 워크스페이스 멤버 목록 조회
```typescript
// members 테이블 사용
const { data } = await supabase
  .from('members')
  .select('*, profiles(username, avatar_url)')  // JOIN!
  .eq('workspace_id', workspaceId);
// → A회사의 모든 멤버 + 각 멤버의 프로필 정보
```

### 3. 내가 속한 워크스페이스 목록
```typescript
// members 테이블 사용
const { data } = await supabase
  .from('members')
  .select('workspace_id, workspaces(*)')  // JOIN!
  .eq('user_id', myUserId);
// → 나타리가 속한 모든 워크스페이스 목록
```

---

## 🏗️ 데이터베이스 설계 패턴

이것은 **Many-to-Many (N:M) 관계**를 표현하는 표준 패턴입니다.

```
profiles (사용자)
    ↕ (N:M 관계)
members (중간 테이블 = Junction Table)
    ↕
workspaces (워크스페이스)
```

**유명 서비스들도 동일한 구조 사용:**
- Slack: users ↔ memberships ↔ workspaces
- Discord: users ↔ guild_members ↔ guilds
- Notion: users ↔ workspace_users ↔ workspaces

---

## 📌 요약

| 질문 | 답변 |
|------|------|
| profiles는 뭐야? | **전역 사용자 프로필** (이름, 아바타, 상태) |
| members는 뭐야? | **워크스페이스별 멤버십** (어느 워크스페이스에 어느 역할로) |
| 왜 둘 다 필요해? | 한 사용자가 **여러 워크스페이스**에 **다른 역할**로 참여하기 위해 |
| 몇 개씩 있어? | profiles: 1개, members: 워크스페이스 수만큼 |

---

## 🎓 더 알아보기

- [Database Normalization](https://en.wikipedia.org/wiki/Database_normalization)
- [Many-to-Many Relationships](https://en.wikipedia.org/wiki/Many-to-many_(data_model))
- [Supabase Join Tables](https://supabase.com/docs/guides/database/joins-and-nesting)


