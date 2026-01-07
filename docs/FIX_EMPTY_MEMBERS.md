# 🔧 members 테이블이 비어있는 문제 해결

## 문제 상황

`members` 테이블이 비어있어서 WorkspaceSelect 화면에 워크스페이스가 표시되지 않습니다.

---

## 왜 비어있나?

### 1️⃣ 새로 가입한 사용자
- 회원가입만 했고 워크스페이스를 아직 생성하지 않음
- **정상 상태입니다!** → 새 워크스페이스를 만들면 됩니다.

### 2️⃣ RLS 정책 문제
- 워크스페이스는 있지만 RLS 정책 때문에 조회가 안됨
- Supabase SQL Editor에서 `docs/FIX_RLS_MEMBERS.sql` 실행 필요

### 3️⃣ 기존 워크스페이스가 있지만 members에 추가 안됨
- 과거에 워크스페이스를 만들었지만 members 테이블에 레코드가 없는 경우
- **마이그레이션 필요** (아래 참고)

---

## 해결 방법

### ✅ 방법 1: 새 워크스페이스 만들기 (추천)

1. 로그인
2. **"+ 새 워크스페이스 만들기"** 버튼 클릭
3. 워크스페이스 이름 입력 (예: "우리 회사", "개발팀")
4. **"만들기"** 클릭

→ 자동으로 `members` 테이블에 추가되고 워크스페이스로 이동!

---

### ✅ 방법 2: 기존 워크스페이스에 본인 추가 (마이그레이션)

만약 **이미 워크스페이스가 있는데** members 테이블에만 없다면?

#### Supabase SQL Editor에서 실행:

```sql
-- 1. 현재 상황 확인
SELECT 
  w.id as workspace_id,
  w.name as workspace_name,
  w.owner_id,
  p.username
FROM workspaces w
LEFT JOIN profiles p ON w.owner_id = p.id
LEFT JOIN members m ON w.id = m.workspace_id AND w.owner_id = m.user_id
WHERE m.id IS NULL;  -- members에 없는 워크스페이스 찾기

-- 2. 소유자를 members에 자동 추가 (마이그레이션)
INSERT INTO members (workspace_id, user_id, role)
SELECT id, owner_id, 'owner'
FROM workspaces
WHERE NOT EXISTS (
  SELECT 1 FROM members
  WHERE members.workspace_id = workspaces.id
  AND members.user_id = workspaces.owner_id
);

-- 3. 결과 확인
SELECT 
  w.name as workspace_name,
  p.username,
  m.role
FROM members m
JOIN workspaces w ON m.workspace_id = w.id
JOIN profiles p ON m.user_id = p.id
ORDER BY w.created_at DESC;
```

---

### ✅ 방법 3: 브라우저 콘솔에서 확인

1. Electron 앱에서 **DevTools 열기** (Ctrl+Shift+I 또는 F12)
2. **Console 탭** 이동
3. 다음 코드 실행:

```javascript
// 현재 로그인한 사용자 확인
const { data: { user } } = await supabase.auth.getUser();
console.log('현재 사용자:', user?.email, user?.id);

// members 테이블 확인
const { data: members, error } = await supabase
  .from('members')
  .select('*, workspaces(*)');
console.log('내 멤버십:', members, error);

// workspaces 테이블 확인
const { data: workspaces } = await supabase
  .from('workspaces')
  .select('*');
console.log('모든 워크스페이스:', workspaces);
```

---

## 🔍 디버깅 체크리스트

### 1. RLS 정책이 올바른가?

```sql
-- members 테이블의 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'members';

-- workspaces 테이블의 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'workspaces';
```

### 2. profiles 테이블에 내 정보가 있나?

```sql
-- 현재 로그인한 사용자의 프로필 확인
SELECT * FROM profiles WHERE id = auth.uid();
```

### 3. 워크스페이스가 실제로 있나?

```sql
-- 내가 소유한 워크스페이스 확인
SELECT * FROM workspaces WHERE owner_id = auth.uid();
```

### 4. members 테이블에 레코드가 있나?

```sql
-- 내 멤버십 확인
SELECT * FROM members WHERE user_id = auth.uid();
```

---

## 📊 정상 상태 확인

정상적으로 작동한다면 다음과 같아야 합니다:

### profiles 테이블
```
id                  | username | full_name | created_at
--------------------|----------|-----------|------------
abc-123-def-456     | 나타리    | 김나타     | 2025-01-06
```

### workspaces 테이블
```
id          | name      | slug       | owner_id
------------|-----------|------------|-------------
ws-001      | 우리회사   | uri-hoesa  | abc-123-def-456
```

### members 테이블 ⭐
```
id      | workspace_id | user_id          | role
--------|--------------|------------------|-------
mem-001 | ws-001       | abc-123-def-456  | owner
```

---

## 🚀 빠른 해결책 (개발 환경)

**테스트용으로 RLS를 임시로 비활성화**하고 싶다면:

```sql
-- ⚠️ 개발 환경에서만 사용! 프로덕션에서는 절대 금지!
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
```

문제가 해결되면 다시 활성화:

```sql
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
```

---

## ✅ 해결 확인

1. 앱 새로고침 (F5)
2. 로그인
3. WorkspaceSelect 화면에 워크스페이스가 보이면 성공! 🎉

---

## 📞 여전히 문제가 있다면?

Supabase Dashboard에서:
1. **Authentication** → **Users** → 본인 계정 확인
2. **Table Editor** → **profiles** → 레코드 확인
3. **Table Editor** → **workspaces** → 레코드 확인
4. **Table Editor** → **members** → 레코드 확인
5. **SQL Editor** → 위의 SQL 쿼리 실행

콘솔에 출력된 에러 메시지를 확인하세요!


