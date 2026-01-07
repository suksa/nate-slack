# Supabase Storage 설정 가이드

프로필 사진 업로드 기능을 위한 Supabase Storage 버킷 설정 방법입니다.

## 📦 Storage Bucket 생성

### 1. Supabase Dashboard 접속
```
https://supabase.com/dashboard
```

### 2. Storage 섹션으로 이동
```
프로젝트 선택 → Storage → Create a new bucket
```

### 3. 버킷 생성
```
Bucket name: avatars
Public bucket: ✅ 체크 (공개 URL 사용)
File size limit: 5MB
Allowed MIME types: image/*
```

**생성 버튼 클릭!**

## 🔒 Storage Policies 설정

Storage 버킷이 생성되면 RLS(Row Level Security) 정책을 설정해야 합니다.

### SQL Editor에서 다음 쿼리 실행:

```sql
-- 1. 인증된 사용자가 자신의 프로필 사진 업로드 허용
CREATE POLICY "사용자는 자신의 아바타를 업로드할 수 있습니다"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND 
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (regexp_match(name, 'avatars/([^-]+)-'))[1]
);

-- 2. 인증된 사용자가 자신의 프로필 사진 업데이트 허용
CREATE POLICY "사용자는 자신의 아바타를 업데이트할 수 있습니다"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (regexp_match(name, 'avatars/([^-]+)-'))[1]
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (regexp_match(name, 'avatars/([^-]+)-'))[1]
);

-- 3. 인증된 사용자가 자신의 프로필 사진 삭제 허용
CREATE POLICY "사용자는 자신의 아바타를 삭제할 수 있습니다"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (regexp_match(name, 'avatars/([^-]+)-'))[1]
);

-- 4. 모든 사용자가 아바타 읽기 가능 (공개)
CREATE POLICY "아바타는 공개적으로 읽을 수 있습니다"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

## ✅ 설정 확인

### 1. Dashboard에서 확인
```
Storage → avatars → Policies 탭
```
4개의 정책이 생성되어 있어야 합니다:
- ✅ INSERT: 자신의 아바타 업로드
- ✅ UPDATE: 자신의 아바타 업데이트
- ✅ DELETE: 자신의 아바타 삭제
- ✅ SELECT: 공개 읽기

### 2. 버킷 설정 확인
```
Storage → avatars → Configuration
```
- Public: ✅ 활성화
- File size limit: 5242880 bytes (5MB)
- Allowed MIME types: image/*

## 🎨 프로필 설정 페이지 사용법

### 1. 프로필 사진 업로드
1. 좌측 하단 프로필 클릭
2. "프로필 설정" 클릭
3. "사진 변경" 버튼 클릭
4. 이미지 파일 선택 (JPG, PNG, GIF - 최대 5MB)
5. 자동으로 업로드 및 프로필 업데이트

### 2. 사용자 이름 변경
1. 프로필 설정 페이지에서 "사용자 이름" 입력
2. "전체 이름" 입력 (선택사항)
3. "저장하기" 버튼 클릭

## 🔍 파일 경로 구조

```
storage/
└── avatars/
    └── avatars/
        ├── {user_id}-{timestamp}.jpg
        ├── {user_id}-{timestamp}.png
        └── ...
```

예시:
```
avatars/avatars/123e4567-e89b-12d3-a456-426614174000-1704067200000.jpg
```

## 🚨 문제 해결

### "Failed to upload" 오류
1. Storage 버킷이 생성되었는지 확인
2. 버킷 이름이 정확히 `avatars`인지 확인
3. Public bucket이 활성화되어 있는지 확인
4. RLS 정책이 올바르게 설정되었는지 확인

### "403 Forbidden" 오류
1. RLS 정책이 올바르게 설정되었는지 확인
2. 사용자가 인증되었는지 확인
3. SQL Editor에서 위 정책들을 다시 실행

### 프로필 사진이 표시되지 않음
1. 버킷이 Public으로 설정되어 있는지 확인
2. Browser Console에서 이미지 URL 확인
3. Supabase Storage에서 파일이 실제로 업로드되었는지 확인

## 📚 참고 자료

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Storage Policies Guide](https://supabase.com/docs/guides/storage/security/access-control)
- [Image Upload Best Practices](https://supabase.com/docs/guides/storage/uploads/standard-uploads)

