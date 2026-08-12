import { test, expect } from '@playwright/test';

test.describe('TOEIC Examination Flow', () => {
  // Use a simulated student session
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PATCH, DELETE',
          'Access-Control-Allow-Headers': '*'
        },
        body: JSON.stringify({
          data: {
            access_token: 'fake-token',
            refresh_token: 'fake-refresh',
            user: { id: 1, email: 'student@gmail.com', role: 'STUDENT' }
          }
        })
      });
    });

    await page.goto('/');
    await page.getByTestId('login-email').fill('student@gmail.com');
    await page.getByTestId('login-password').fill('123456');
    await page.getByTestId('login-submit').click();
    
    // Ensure we are logged in before proceeding
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('Student can take a TOEIC practice exam', async ({ page }) => {
    // Navigate to TOEIC area
    await page.route('**/toeic/exams', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PATCH, DELETE',
          'Access-Control-Allow-Headers': '*'
        },
        body: JSON.stringify({
          data: [
            { id: 1, title: 'Mock Exam', description: 'Test', difficulty: 'easy' }
          ]
        })
      });
    });

    await page.goto('/toeic');
    
    // We expect the exam list to load. Since backend might be mocked, we'll wait for the buttons.
    // Ensure practice button for exam 1 exists (from our mock fallback if backend fails, or real data)
    // We use a generic locator or wait for any practice button
    const practiceBtn = page.locator('[data-testid^="btn-practice-"]').first();
    await expect(practiceBtn).toBeVisible({ timeout: 10000 });
    
    // Click Practice
    await practiceBtn.click();
    
    // Should navigate to exam page. E.g. /toeic/exam/1?attemptId=...
    await expect(page).toHaveURL(/.*\/toeic\/exam\/\d+/);
    
    // Wait for questions to load
    await expect(page.locator('text=Câu hỏi 1').first()).toBeVisible({ timeout: 10000 });
    
    // Answer the first question (Option B - idx 1)
    const option1 = page.locator('[data-testid^="option-"]').nth(1);
    await option1.click();
    
    // Go to next question
    await page.getByTestId('btn-next-question').click();
    
    // Answer the second question (Option C - idx 2)
    const option2 = page.locator('[data-testid^="option-"]').nth(2);
    await option2.click();
    
    // Submit exam
    // We need to bypass the JS confirm dialog!
    page.once('dialog', dialog => dialog.accept());
    
    await page.getByTestId('btn-submit-exam').click();
    
    // Verify redirect to result page
    await expect(page).toHaveURL(/.*\/toeic\/result\/\d+/, { timeout: 15000 });
    
    // Verify score is shown
    await expect(page.locator('text=Kết quả bài làm')).toBeVisible();
    await expect(page.locator('text=Total Score')).toBeVisible();
  });
});
