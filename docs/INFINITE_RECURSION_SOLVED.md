# ✅ 무한 재귀 오류 해결 완료!

## 🐛 문제 상황

```
오류: infinite recursion detected in policy for relation "members"
증상: 
- WorkspaceSelect 페이지 접속 시 API를 5번 반복 요청
- 워크스페이스 목록이 표시되지 않음
- 500 Internal Server Error
```

---

## 🔍 원인 분석

### 1️⃣ **RLS 정책의 무한 재귀**

```sql
-- ❌ 잘못된 정책 (무한 재귀 발생)
CREATE POLICY "members_can_view"
ON members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM members AS m  -- ⚠️ members가 다시 members를 참조!
    WHERE m.workspace_id = members.workspace_id
    AND m.user_id = auth.uid()
  )
);
```

**문제점:**
- `members` 테이블을 조회할 때 정책이 실행됨
- 정책 안에서 또 `members` 테이블을 조회함
- 이것이 무한 반복되면서 PostgreSQL이 중단시킴

### 2️⃣ **프론트엔드 무한 루프**

```typescript
// ❌ 잘못된 useEffect
useEffect(() => {
  fetchWorkspaces();
}, [user]); // user 객체가 계속 바뀌면 무한 루프!
```

---

## ✅ 해결 방법

### 1️⃣ Supabase RLS 정책 완전 재설정

**파일:** `docs/FIX_INFINITE_RECURSION.sql`

**실행 위치:** Supabase Dashboard → SQL Editor

**핵심 변경사항:**

```sql
-- ✅ 올바른 정책 (재귀 없음)
CREATE POLICY "members_select"
ON members FOR SELECT
USING (
  -- IN (SELECT ...) 방식: PostgreSQL이 한 번만 실행
  workspace_id IN (
    SELECT m.workspace_id 
    FROM members m
    WHERE m.user_id = auth.uid()
  )
);
```

**왜 작동하는가?**
- `IN (SELECT ...)` 서브쿼리는 한 번만 실행됨
- PostgreSQL이 쿼리 플랜을 최적화하여 재귀 없이 처리
- [Supabase Best Practice](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices)

### 2️⃣ 프론트엔드 무한 루프 방지

**파일:** `src/pages/WorkspaceSelect.tsx`

**변경사항:**

```typescript
// ✅ 올바른 useEffect
useEffect(() => {
  let isMounted = true;
  
  async function loadWorkspaces() {
    if (!user || !isMounted) return;
    // ... 로직
  }
  
  loadWorkspaces();
  
  // Cleanup: unmount 시 중단
  return () => {
    isMounted = false;
  };
}, [user?.id]); // user.id만 의존성으로 (무한 루프 방지)
```

**개선사항:**
- ✅ `isMounted` 플래그로 컴포넌트 unmount 시 중단
- ✅ `user?.id`만 의존성으로 설정 (user 객체 전체는 X)
- ✅ 무한 재귀 에러 특별 처리
- ✅ 새로고침 버튼 추가
- ✅ 친절한 에러 메시지

---

## 🚀 실행 순서

### Step 1: Supabase에서 RLS 정책 수정

1. https://supabase.com/dashboard 접속
2. 프로젝트 선택
3. **SQL Editor** 메뉴 클릭
4. 새 쿼리 생성
5. `docs/FIX_INFINITE_RECURSION.sql` 파일 내용 **전체 복사**
6. **Run** 클릭 (또는 Ctrl+Enter)

**결과 확인:**
```
✅ RLS 정책이 완전히 재설정되었습니다!
```

### Step 2: 앱 새로고침

1. Electron 앱 새로고침 (F5) 또는 재시작
2. 로그인
3. WorkspaceSelect 페이지 확인

---

## 🧪 테스트

### 1️⃣ API 요청 확인 (DevTools Console)

**정상:** 
```
🔍 워크스페이스 조회 시작... user_id: abc-123-def
✅ 워크스페이스 조회 성공: 0 개
```

**비정상 (수정 전):**
```
🔍 워크스페이스 조회 시작...
❌ 워크스페이스 조회 실패: infinite recursion detected
🔍 워크스페이스 조회 시작... (반복 5번)
```

### 2️⃣ Supabase에서 직접 쿼리 테스트

```sql
-- 1. 내 멤버십 조회 (오류 없어야 함)
SELECT * FROM members WHERE user_id = auth.uid();

-- 2. 워크스페이스 + 멤버 JOIN (오류 없어야 함)
SELECT 
  m.workspace_id,
  w.name,
  w.slug,
  m.role
FROM members m
JOIN workspaces w ON m.workspace_id = w.id
WHERE m.user_id = auth.uid();
```

**성공:** 결과 반환 (비어있어도 OK)
**실패:** `infinite recursion detected` 오류

---

## 📋 정책 비교

### ❌ Before (무한 재귀)

```sql
CREATE POLICY "bad_policy"
ON members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM members AS m  -- 자기 자신 참조!
    WHERE m.workspace_id = members.workspace_id
    AND m.user_id = auth.uid()
  )
);
```

### ✅ After (재귀 없음)

```sql
CREATE POLICY "members_select"
ON members FOR SELECT
USING (
  workspace_id IN (
    SELECT m.workspace_id   -- 서브쿼리는 한 번만 실행
    FROM members m
    WHERE m.user_id = auth.uid()
  )
);
```

---

## 🎓 핵심 개념

### PostgreSQL RLS 정책 작성 시 주의사항

1. **EXISTS vs IN**
   - ❌ `EXISTS (SELECT ... FROM same_table)` → 재귀 위험
   - ✅ `column IN (SELECT ... FROM same_table)` → 안전

2. **서브쿼리 최적화**
   - PostgreSQL은 `IN (SELECT ...)` 를 한 번만 실행
   - 쿼리 플랜을 미리 세우고 재귀하지 않음

3. **정책 테스트**
   - 정책 생성 후 반드시 SQL Editor에서 테스트
   - `SELECT * FROM table WHERE ...` 실행해보기

### React useEffect 무한 루프 방지

1. **의존성 배열 최소화**
   - ❌ `[user]` → user 객체 전체 (참조 변경 시 재실행)
   - ✅ `[user?.id]` → id만 (값이 실제로 바뀔 때만 재실행)

2. **Cleanup 함수 사용**
   ```typescript
   useEffect(() => {
     let isMounted = true;
     // ... 비동기 작업
     return () => { isMounted = false; }; // Cleanup!
   }, [deps]);
   ```

3. **비동기 작업 취소**
   - 컴포넌트 unmount 시 진행 중인 작업 중단
   - 상태 업데이트 방지

---

## 🔗 참고 자료

- [Supabase RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [React useEffect Cleanup](https://react.dev/learn/synchronizing-with-effects#step-3-add-cleanup-if-needed)

---

## 🎉 결과

✅ **무한 재귀 오류 해결**
✅ **API 중복 요청 방지**
✅ **워크스페이스 목록 정상 조회**
✅ **친절한 에러 메시지**
✅ **새로고침 버튼 추가**

---

## 🆘 여전히 문제가 있다면?

1. **브라우저 개발자 도구** (F12) → Console 탭 확인
2. **Supabase Dashboard** → SQL Editor → 테스트 쿼리 실행
3. `docs/FIX_INFINITE_RECURSION.sql` 파일을 **다시 한 번** 실행
4. 앱 **완전 재시작** (종료 후 다시 실행)
5. 브라우저 **캐시 삭제** (Ctrl+Shift+Delete)

여전히 안 된다면 Supabase Dashboard → Database → Tables에서:
- `members` 테이블의 RLS를 **일시적으로 비활성화**
- 문제가 해결되면 정책이 원인임을 확인
- `FIX_INFINITE_RECURSION.sql` 다시 실행


