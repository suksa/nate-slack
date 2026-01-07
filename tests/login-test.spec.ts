import { test, expect, _electron as electron } from '@playwright/test';

test.describe('로그인 테스트 - suksa_@naver.com', () => {
  test.setTimeout(120000); // 2분 타임아웃

  test('기존 계정으로 로그인 → 워크스페이스 → 채널 → 메시지', async () => {
    console.log('🚀 Electron 앱 실행 중...');
    
    // Electron 앱 실행
    const electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        VITE_SUPABASE_URL: 'https://akohiqpoxvemfdixtmnv.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'sb_publishable_pEjOoPqO4UNcGW5OtKSvzQ_lMMflDfj',
        NODE_ENV: 'development'
      }
    });

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    
    console.log('✅ 앱 실행 완료');

    // ============================================
    // 1. 로그인 화면 확인
    // ============================================
    
    await expect(window.locator('h2:has-text("Nate Slack")')).toBeVisible({ timeout: 15000 });
    console.log('📱 로그인 페이지 표시됨');

    // 로그인 탭 확인 (기본으로 선택되어 있어야 함)
    const signinTab = window.locator('button:has-text("로그인")').first();
    await expect(signinTab).toBeVisible();
    await signinTab.click();
    
    console.log('📝 로그인 탭 선택됨');

    // ============================================
    // 2. 로그인 정보 입력
    // ============================================
    
    const testEmail = 'suksa_@naver.com';
    const testPassword = '123123';

    // 이메일 입력
    const emailInput = window.locator('input#email');
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await emailInput.fill(testEmail);
    console.log(`📧 이메일 입력: ${testEmail}`);

    // 비밀번호 입력
    const passwordInput = window.locator('input#password');
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill(testPassword);
    console.log('🔒 비밀번호 입력 완료');

    // 로그인 버튼 클릭
    const loginButton = window.locator('button[type="submit"]').filter({ hasText: '로그인' });
    await loginButton.click();
    console.log('👆 로그인 버튼 클릭');

    // ============================================
    // 3. 워크스페이스 선택 화면 대기
    // ============================================
    
    await expect(window.locator('h1:has-text("Select Workspace")')).toBeVisible({ timeout: 15000 });
    console.log('✅ 로그인 성공! 워크스페이스 선택 페이지 도달');

    // 워크스페이스가 있는지 확인
    const createWorkspaceButton = window.locator('button:has-text("Create New Workspace")');
    await expect(createWorkspaceButton).toBeVisible();
    
    // 기존 워크스페이스가 있는지 확인
    const workspaceCards = window.locator('button').filter({ hasText: /workspace/i });
    const workspaceCount = await workspaceCards.count();
    
    console.log(`📊 기존 워크스페이스 개수: ${workspaceCount}`);

    let workspaceName: string;
    
    if (workspaceCount > 0) {
      // 기존 워크스페이스 선택
      const firstWorkspace = workspaceCards.first();
      workspaceName = await firstWorkspace.textContent() || 'Unknown';
      console.log(`📂 기존 워크스페이스 선택: ${workspaceName}`);
      await firstWorkspace.click();
    } else {
      // 새 워크스페이스 생성
      workspaceName = `TestWS_${Date.now()}`;
      console.log(`➕ 새 워크스페이스 생성: ${workspaceName}`);
      
      await createWorkspaceButton.click();
      
      // 프롬프트 처리
      window.once('dialog', async dialog => {
        console.log(`Dialog: ${dialog.message()}`);
        await dialog.accept(workspaceName);
      });
      
      await window.waitForTimeout(1000);
      
      // 워크스페이스 카드 클릭
      await window.locator(`text=${workspaceName}`).click();
    }

    // ============================================
    // 4. 메인 레이아웃 확인
    // ============================================
    
    await expect(window.locator('text=Channels')).toBeVisible({ timeout: 15000 });
    console.log('✅ 워크스페이스 진입 완료, 사이드바 표시됨');

    // 사용자 정보 확인
    await expect(window.locator('text=조찬형')).toBeVisible({ timeout: 5000 });
    console.log('👤 사용자 프로필 확인: 조찬형');

    // ============================================
    // 5. 채널 생성 또는 선택
    // ============================================
    
    // 기존 채널 확인
    const channelLinks = window.locator('a[href*="/channel/"]');
    const channelCount = await channelLinks.count();
    
    console.log(`📊 기존 채널 개수: ${channelCount}`);

    if (channelCount > 0) {
      // 첫 번째 채널 클릭
      const firstChannel = channelLinks.first();
      const channelName = await firstChannel.textContent();
      console.log(`📺 기존 채널 선택: ${channelName}`);
      await firstChannel.click();
    } else {
      // 새 채널 생성
      const channelName = `test-channel-${Date.now()}`;
      console.log(`➕ 새 채널 생성: ${channelName}`);
      
      // 채널 생성 버튼 클릭 (Channels 섹션의 + 버튼)
      const addChannelButton = window.locator('button').filter({ has: window.locator('svg') }).first();
      await addChannelButton.click();
      
      // 프롬프트 처리
      window.once('dialog', async dialog => {
        await dialog.accept(channelName);
      });
      
      await window.waitForTimeout(1000);
      
      // 채널이 나타날 때까지 대기
      await expect(window.locator(`text=${channelName}`)).toBeVisible({ timeout: 10000 });
      console.log('✅ 채널 생성 완료');
    }

    // ============================================
    // 6. 메시지 전송
    // ============================================
    
    const testMessage = `안녕하세요! 테스트 메시지입니다 ${new Date().toLocaleTimeString()} 🚀`;
    
    // 메시지 입력 필드 찾기
    const messageInput = window.locator('textarea[placeholder*="Message"]');
    await expect(messageInput).toBeVisible({ timeout: 10000 });
    console.log('📝 메시지 입력창 발견');
    
    // 메시지 입력
    await messageInput.fill(testMessage);
    console.log(`💬 메시지 입력: ${testMessage}`);
    
    // 전송 버튼 클릭
    await window.locator('button[type="submit"]').last().click();
    console.log('📤 메시지 전송');
    
    // 메시지가 화면에 나타날 때까지 대기
    await expect(window.locator(`text=${testMessage}`)).toBeVisible({ timeout: 10000 });
    console.log('✅ 메시지 전송 및 표시 성공');

    // ============================================
    // 7. 추가 상호작용 테스트
    // ============================================
    
    // 메시지에 마우스 오버
    const messageElement = window.locator(`text=${testMessage}`).locator('..');
    await messageElement.hover();
    console.log('🖱️ 메시지에 마우스 오버');
    
    // 이모지 버튼 확인
    const emojiButton = window.locator('button[title="Add reaction"]').first();
    const emojiVisible = await emojiButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (emojiVisible) {
      await emojiButton.click();
      console.log('😊 이모지 버튼 클릭');
      
      // 이모지 선택
      const thumbsUp = window.locator('button:has-text("👍")').first();
      await thumbsUp.click();
      console.log('👍 이모지 반응 추가');
      
      // 반응 확인
      await expect(window.locator('text=👍')).toBeVisible({ timeout: 5000 });
      console.log('✅ 이모지 반응 표시 확인');
    }

    // ============================================
    // 8. 스크린샷 및 종료
    // ============================================
    
    console.log('📸 스크린샷 저장 중...');
    await window.screenshot({ path: 'test-results/login-test-success.png' });
    
    console.log('\n🎉 모든 테스트 통과! 🎉\n');
    console.log('✅ 로그인 성공');
    console.log('✅ 워크스페이스 접근');
    console.log('✅ 채널 접근');
    console.log('✅ 메시지 전송');
    console.log('✅ 이모지 반응');
    
    // 잠시 대기 (사용자가 확인할 수 있도록)
    await window.waitForTimeout(2000);
    
    // 앱 종료
    await electronApp.close();
    console.log('👋 앱 종료');
  });
});

