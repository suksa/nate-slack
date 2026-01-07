# GitHub 릴리즈 및 자동 업데이트 설정 가이드

## 개요

이 프로젝트는 GitHub Releases를 통한 자동 배포 및 업데이트 기능이 설정되어 있습니다.

## 설정된 기능

### 1. GitHub Publisher
- Electron Forge의 GitHub Publisher가 설정되어 있어, `npm run publish` 명령으로 자동으로 GitHub Releases에 업로드됩니다.

### 2. 자동 업데이트
- `electron-updater`를 사용하여 GitHub Releases에서 자동으로 업데이트를 확인하고 다운로드합니다.
- 앱 시작 시 및 1시간마다 자동으로 업데이트를 확인합니다.

## 사용 방법

### 첫 번째 릴리즈 배포

1. **GitHub Personal Access Token 생성**
   - GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
   - `repo` 권한이 있는 토큰 생성
   - **방법 1: .env 파일 사용 (권장)**
     ```bash
     # .env.example을 복사하여 .env 파일 생성
     cp .env.example .env
     
     # .env 파일을 열어서 토큰 입력
     GITHUB_TOKEN=your_token_here
     ```
   - **방법 2: 환경변수로 설정**
     ```bash
     # Windows (PowerShell)
     $env:GITHUB_TOKEN="your_token_here"
     
     # Windows (CMD)
     set GITHUB_TOKEN=your_token_here
     
     # macOS/Linux
     export GITHUB_TOKEN=your_token_here
     ```

2. **버전 업데이트**
   ```bash
   # package.json의 version을 업데이트 (예: 1.0.1 -> 1.0.2)
   ```

3. **빌드 및 배포**
   ```bash
   # 빌드 및 GitHub Releases에 자동 업로드
   npm run publish
   ```

### 자동 업데이트 동작

- 앱이 시작될 때 자동으로 업데이트를 확인합니다.
- 1시간마다 자동으로 업데이트를 확인합니다.
- 업데이트가 있으면 자동으로 다운로드하고 사용자에게 알립니다.
- 개발 환경에서는 자동 업데이트가 비활성화됩니다.

### 수동 업데이트 확인

렌더러 프로세스에서 IPC를 통해 수동으로 업데이트를 확인할 수 있습니다:

```typescript
// 렌더러 프로세스에서
window.electron?.ipcRenderer.invoke('check-for-updates');
```

### 업데이트 재시작

다운로드된 업데이트를 설치하려면:

```typescript
// 렌더러 프로세스에서
window.electron?.ipcRenderer.invoke('restart-and-install-update');
```

## 업데이트 이벤트 수신

렌더러 프로세스에서 업데이트 상태를 수신하려면:

```typescript
// 업데이트 상태 수신
window.electron?.ipcRenderer.on('update-status', (event, data) => {
  console.log('업데이트 상태:', data);
  // data.status: 'checking' | 'available' | 'not-available' | 'downloaded' | 'error'
  // data.version: 버전 정보
  // data.error: 에러 메시지 (에러 발생 시)
});

// 업데이트 진행률 수신
window.electron?.ipcRenderer.on('update-progress', (event, data) => {
  console.log('다운로드 진행률:', data.percent);
  // data.percent: 0-100
  // data.transferred: 전송된 바이트
  // data.total: 전체 바이트
});
```

## 주의사항

1. **GitHub Token**: `GITHUB_TOKEN` 환경변수가 설정되어 있어야 `npm run publish`가 작동합니다.

2. **버전 관리**: 
   - `package.json`의 `version` 필드가 GitHub Releases의 태그와 일치해야 합니다.
   - 시맨틱 버저닝(Semantic Versioning)을 권장합니다 (예: 1.0.0, 1.0.1, 1.1.0).

3. **릴리즈 파일**:
   - Electron Forge가 자동으로 플랫폼별 설치 파일을 생성하고 업로드합니다.
   - Windows: `.exe` (Squirrel)
   - macOS: `.zip`
   - Linux: `.deb`, `.rpm`

4. **개발 환경**:
   - 개발 환경(`npm start`)에서는 자동 업데이트가 비활성화됩니다.
   - 프로덕션 빌드에서만 자동 업데이트가 작동합니다.

## 문제 해결

### 업데이트가 확인되지 않는 경우

1. GitHub Releases에 올바른 형식의 파일이 업로드되었는지 확인
2. `package.json`의 `repository` 필드가 올바른지 확인
3. 네트워크 연결 확인
4. 개발 환경이 아닌 프로덕션 빌드인지 확인

### Publisher가 작동하지 않는 경우

1. `GITHUB_TOKEN` 환경변수가 설정되었는지 확인
2. 토큰에 `repo` 권한이 있는지 확인
3. GitHub 저장소에 대한 접근 권한이 있는지 확인

## 참고 자료

- [electron-updater 문서](https://www.electron.build/auto-update)
- [Electron Forge Publisher 문서](https://www.electronforge.io/config/publishers)

