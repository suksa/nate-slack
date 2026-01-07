import { test, expect, _electron as electron } from '@playwright/test';

test.describe('NATE SLACK E2E Tests', () => {
  test.setTimeout(120000); // 2분 타임아웃

  test('Complete user flow: signup -> workspace -> channel -> message', async () => {
    // Launch Electron app
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

    console.log('App launched, waiting for login page...');

    // ============================================
    // 1. 회원가입 테스트
    // ============================================
    
    // 회원가입 탭으로 전환
    const signupTab = window.locator('button:has-text("회원가입")');
    await expect(signupTab).toBeVisible({ timeout: 10000 });
    await signupTab.click();
    
    console.log('Switched to signup tab');

    // 랜덤 이메일 생성
    const randomEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'test123456';
    const testUsername = `TestUser${Date.now()}`;

    // 회원가입 폼 입력
    await window.locator('input#username').fill(testUsername);
    await window.locator('input#email').fill(randomEmail);
    await window.locator('input#password').fill(testPassword);
    
    console.log(`Signing up with: ${randomEmail}`);

    // 회원가입 버튼 클릭
    await window.locator('button:has-text("회원가입")').last().click();

    // 워크스페이스 선택 화면 대기 (회원가입 성공 후 자동 로그인)
    await expect(window.locator('h1:has-text("Select Workspace")')).toBeVisible({ timeout: 15000 });
    console.log('Signup successful, on workspace select page');

    // ============================================
    // 2. 워크스페이스 생성 테스트
    // ============================================
    
    const workspaceName = `TestWorkspace_${Date.now()}`;
    
    // "Create New Workspace" 버튼 클릭
    await window.locator('button:has-text("Create New Workspace")').click();
    
    // 프롬프트 대화상자 처리
    window.once('dialog', async dialog => {
      console.log(`Dialog message: ${dialog.message()}`);
      await dialog.accept(workspaceName);
    });
    
    // 프롬프트가 나타날 때까지 잠시 대기
    await window.waitForTimeout(1000);
    
    // 워크스페이스 카드가 나타날 때까지 대기
    await expect(window.locator(`text=${workspaceName}`)).toBeVisible({ timeout: 10000 });
    console.log('Workspace created successfully');

    // 워크스페이스 클릭하여 입장
    await window.locator(`text=${workspaceName}`).click();

    // 메인 레이아웃 대기 (사이드바 확인)
    await expect(window.locator('text=Channels')).toBeVisible({ timeout: 10000 });
    console.log('Entered workspace, sidebar visible');

    // ============================================
    // 3. 채널 생성 테스트
    // ============================================
    
    const channelName = `test-channel-${Date.now()}`;
    
    // 채널 생성 버튼 클릭 (Channels 섹션의 + 버튼)
    await window.locator('button').filter({ has: window.locator('svg') }).first().click();
    
    // 프롬프트 대화상자 처리
    window.once('dialog', async dialog => {
      console.log(`Dialog message: ${dialog.message()}`);
      await dialog.accept(channelName);
    });
    
    await window.waitForTimeout(1000);
    
    // 채널이 사이드바에 나타날 때까지 대기
    await expect(window.locator(`text=${channelName}`)).toBeVisible({ timeout: 10000 });
    console.log('Channel created successfully');

    // ============================================
    // 4. 메시지 전송 테스트
    // ============================================
    
    const testMessage = `Hello from Playwright test! ${Date.now()}`;
    
    // 메시지 입력 필드 찾기
    const messageInput = window.locator('textarea[placeholder*="Message"]');
    await expect(messageInput).toBeVisible({ timeout: 5000 });
    
    // 메시지 입력
    await messageInput.fill(testMessage);
    console.log(`Typed message: ${testMessage}`);
    
    // 전송 버튼 클릭 (Send 아이콘 버튼)
    await window.locator('button[type="submit"]').last().click();
    
    // 메시지가 화면에 나타날 때까지 대기
    await expect(window.locator(`text=${testMessage}`)).toBeVisible({ timeout: 10000 });
    console.log('Message sent and displayed successfully');

    // ============================================
    // 5. 이모지 반응 테스트
    // ============================================
    
    // 메시지에 마우스 오버하여 액션 버튼 표시
    const messageElement = window.locator(`text=${testMessage}`).locator('..');
    await messageElement.hover();
    
    // 이모지 버튼 클릭 (Smile 아이콘)
    const emojiButton = window.locator('button[title="Add reaction"]').first();
    await emojiButton.click({ timeout: 5000 });
    
    // 이모지 피커에서 첫 번째 이모지 선택
    await window.locator('button:has-text("👍")').first().click();
    
    // 반응이 표시될 때까지 대기
    await expect(window.locator('text=👍')).toBeVisible({ timeout: 5000 });
    console.log('Emoji reaction added successfully');

    // ============================================
    // 6. 스레드 테스트
    // ============================================
    
    // 스레드 버튼 클릭 (MessageSquare 아이콘)
    await messageElement.hover();
    const threadButton = window.locator('button[title="Reply in thread"]').first();
    await threadButton.click({ timeout: 5000 });
    
    // 스레드 사이드바가 나타날 때까지 대기
    await expect(window.locator('text=Thread')).toBeVisible({ timeout: 5000 });
    console.log('Thread sidebar opened');
    
    // 스레드에 답글 작성
    const threadInput = window.locator('textarea[placeholder*="Reply"]');
    const threadReply = `Thread reply ${Date.now()}`;
    await threadInput.fill(threadReply);
    await window.locator('button[type="submit"]').last().click();
    
    // 답글이 표시될 때까지 대기
    await expect(window.locator(`text=${threadReply}`)).toBeVisible({ timeout: 10000 });
    console.log('Thread reply sent successfully');

    // ============================================
    // 테스트 완료
    // ============================================
    
    console.log('All tests passed! 🎉');
    
    // 스크린샷 저장
    await window.screenshot({ path: 'test-results/final-state.png' });
    
    // 앱 종료
    await electronApp.close();
  });
});
