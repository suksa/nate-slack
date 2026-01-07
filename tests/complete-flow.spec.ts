import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';

test.describe('NATE SLACK 완전 통합 테스트', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    // Electron 앱 실행
    electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        VITE_SUPABASE_URL: 'https://akohiqpoxvemfdixtmnv.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'sb_publishable_pEjOoPqO4UNcGW5OtKSvzQ_lMMflDfj',
        NODE_ENV: 'development'
      },
      timeout: 60000
    });

    // 첫 번째 윈도우 가져오기
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  });

  test.afterAll(async () => {
    await electronApp?.close();
  });

  test('suksa_@naver.com 계정으로 전체 플로우 테스트', async () => {
    console.log('\n🎬 테스트 시작: 로그인 → 워크스페이스 → 채널 → 메시지\n');

    // ==================== 1. 로그인 ====================
    console.log('📱 Step 1: 로그인 페이지 확인');
    
    // 로그인 페이지 대기
    await page.waitForSelector('h2:has-text("Nate Slack")', { timeout: 15000 });
    console.log('   ✅ 로그인 페이지 로드됨');

    // 로그인 탭이 선택되어 있는지 확인
    const loginTab = page.locator('button:text("로그인")').first();
    await loginTab.click();
    console.log('   ✅ 로그인 탭 선택됨');

    // 이메일 입력
    const emailInput = page.locator('input#email');
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill('suksa_@naver.com');
    console.log('   ✅ 이메일 입력: suksa_@naver.com');

    // 비밀번호 입력
    const passwordInput = page.locator('input#password');
    await passwordInput.fill('123123');
    console.log('   ✅ 비밀번호 입력: 123123');

    // 로그인 버튼 클릭
    const loginButton = page.locator('button[type="submit"]').filter({ hasText: '로그인' }).last();
    await loginButton.click();
    console.log('   ✅ 로그인 버튼 클릭');

    // ==================== 2. 워크스페이스 선택 ====================
    console.log('\n📂 Step 2: 워크스페이스 선택');
    
    // 워크스페이스 선택 페이지 대기
    await page.waitForSelector('h1:text("Select Workspace")', { timeout: 20000 });
    console.log('   ✅ 워크스페이스 선택 페이지 도달');

    // 사용자 ID 표시 확인
    const userIdText = await page.locator('text=/User ID:.*/').first().textContent();
    console.log(`   ✅ 사용자 정보 표시: ${userIdText}`);

    // 워크스페이스 확인
    const createButton = page.locator('button:text("Create New Workspace")');
    await createButton.waitFor({ state: 'visible' });

    // 기존 워크스페이스 있는지 확인
    const workspaceButtons = page.locator('button').filter({ hasText: /Test|Workspace/i });
    const count = await workspaceButtons.count();

    if (count > 0) {
      console.log(`   ℹ️  기존 워크스페이스 ${count}개 발견`);
      await workspaceButtons.first().click();
      console.log('   ✅ 첫 번째 워크스페이스 선택');
    } else {
      console.log('   ➕ 새 워크스페이스 생성');
      const workspaceName = `PlaywrightTest_${Date.now()}`;
      
      // 대화상자 핸들러 설정
      page.once('dialog', async dialog => {
        await dialog.accept(workspaceName);
      });
      
      await createButton.click();
      await page.waitForTimeout(2000);
      
      // 생성된 워크스페이스 클릭
      await page.locator(`text=${workspaceName}`).click();
      console.log(`   ✅ 워크스페이스 생성: ${workspaceName}`);
    }

    // ==================== 3. 메인 화면 ====================
    console.log('\n🏠 Step 3: 메인 화면 진입');
    
    await page.waitForSelector('text=Channels', { timeout: 15000 });
    console.log('   ✅ 메인 화면 로드 (사이드바 표시)');

    // 사용자 정보 확인
    const userInfo = await page.locator('text=조찬형').first();
    await expect(userInfo).toBeVisible({ timeout: 5000 });
    console.log('   ✅ 사용자 프로필 표시: 조찬형');

    // ==================== 4. 채널 ====================
    console.log('\n📺 Step 4: 채널 접근');
    
    // 채널 링크 확인
    const channelLinks = page.locator('a[href*="/channel/"]');
    const channelCount = await channelLinks.count();
    console.log(`   ℹ️  기존 채널 ${channelCount}개`);

    if (channelCount > 0) {
      await channelLinks.first().click();
      const channelName = await channelLinks.first().textContent();
      console.log(`   ✅ 채널 선택: ${channelName}`);
    } else {
      console.log('   ➕ 새 채널 생성');
      const channelName = `test-${Date.now()}`;
      
      // 채널 생성 버튼 클릭
      const addChannelBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
      
      page.once('dialog', async dialog => {
        await dialog.accept(channelName);
      });
      
      await addChannelBtn.click();
      await page.waitForTimeout(2000);
      console.log(`   ✅ 채널 생성: ${channelName}`);
    }

    // ==================== 5. 메시지 ====================
    console.log('\n💬 Step 5: 메시지 전송');
    
    const messageText = `Playwright 테스트 메시지 ${new Date().toLocaleTimeString()} 🚀`;
    
    // 메시지 입력 필드 찾기
    const messageInput = page.locator('textarea[placeholder*="Message"]');
    await messageInput.waitFor({ state: 'visible', timeout: 10000 });
    await messageInput.fill(messageText);
    console.log(`   ✅ 메시지 입력: ${messageText}`);

    // 전송 버튼 클릭
    const sendButton = page.locator('button[type="submit"]').last();
    await sendButton.click();
    console.log('   ✅ 전송 버튼 클릭');

    // 메시지 표시 확인
    await page.waitForSelector(`text=${messageText}`, { timeout: 10000 });
    console.log('   ✅ 메시지 화면에 표시됨');

    // ==================== 6. 스크린샷 ====================
    console.log('\n📸 Step 6: 최종 상태 캡처');
    
    await page.screenshot({ path: 'test-results/playwright-success.png' });
    console.log('   ✅ 스크린샷 저장: test-results/playwright-success.png');

    // ==================== 완료 ====================
    console.log('\n🎉 모든 테스트 통과!');
    console.log('=' .repeat(50));
    console.log('✅ 로그인 성공 (suksa_@naver.com)');
    console.log('✅ 워크스페이스 접근');
    console.log('✅ 채널 접근');
    console.log('✅ 메시지 전송 및 표시');
    console.log('=' .repeat(50) + '\n');
  });
});

