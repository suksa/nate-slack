import { test, expect } from '@playwright/test';

// User credentials provided
const TEST_EMAIL = 'zori@natecorp.com';
const TEST_PASSWORD = '123123';

test.describe('Channel Creation Flow (Existing User)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('h2:has-text("Nate Slack")', { timeout: 30000 });
  });

  test('Login -> Create/Select Workspace -> Create Channel', async ({ page }) => {
    test.setTimeout(120000); 

    // --- 1. Login ---
    console.log('Step 1: Logging in...');
    
    // Fill credentials
    await page.fill('input[id="email"]', TEST_EMAIL);
    await page.fill('input[id="password"]', TEST_PASSWORD);
    
    // Click submit button specifically (avoiding tab button)
    await page.click('button[type="submit"]');

    // Wait for redirect to Workspace Select
    console.log('Waiting for workspace select page...');
    // Increase timeout and wait for URL or header
    await page.waitForURL('**/workspace-select', { timeout: 30000 });
    await expect(page.locator('h1:has-text("워크스페이스 선택")')).toBeVisible();

    // --- 2. Select or Create Workspace ---
    // Check if there are existing workspaces
    const workspaceButton = page.locator('button:has-text("/")').first(); // Workspaces usually show slug starting with /
    const isExisting = await workspaceButton.isVisible().catch(() => false);
    
    if (isExisting) {
        console.log('Step 2: Selecting existing workspace...');
        await workspaceButton.click();
    } else {
        console.log('Step 2: Creating new workspace...');
        await page.click('button:has-text("새 워크스페이스 만들기")');
        const workspaceName = `Test Workspace ${Date.now()}`;
        await page.fill('input[placeholder*="우리 회사"]', workspaceName);
        await page.click('button:has-text("만들기")');
    }

    // Wait for redirect to Workspace (Sidebar visible)
    console.log('Waiting for workspace page...');
    await page.waitForSelector('text=Channels', { timeout: 30000 });
    
    // --- 3. Create Public Channel ---
    console.log('Step 3: Creating public channel...');
    const addChannelBtn = page.locator('div.flex:has-text("Channels") button');
    await addChannelBtn.click();

    // Modal should appear
    await expect(page.locator('h2:has-text("채널 생성")')).toBeVisible();

    const channelName = `test-${Date.now()}`;
    await page.fill('input[placeholder*="기획"]', channelName);
    await page.fill('input[placeholder*="설명"]', 'Automation test channel');

    // Submit
    await page.click('button:has-text("채널 생성")');

    // Verify it appears in the list
    await expect(page.locator(`a:has-text("${channelName}")`)).toBeVisible({ timeout: 10000 });
    console.log(`✅ Channel '${channelName}' created successfully`);
  });
});
