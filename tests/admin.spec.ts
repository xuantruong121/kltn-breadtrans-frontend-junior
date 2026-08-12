import { test, expect } from '@playwright/test';

test.describe('Admin Flow', () => {
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
            access_token: 'fake-token-admin',
            refresh_token: 'fake-refresh-admin',
            user: { id: 2, email: 'admin@gmail.com', role: 'ADMIN' }
          }
        })
      });
    });

    await page.goto('/');
    await page.getByTestId('login-email').fill('admin@gmail.com');
    await page.getByTestId('login-password').fill('123456');
    await page.getByTestId('login-submit').click();
    
    await expect(page).toHaveURL(/.*\/admin\/users/);
  });

  test('Admin can view the user management page', async ({ page }) => {
    // Should already be on /admin/users
    await expect(page.locator('text=Quản lý người dùng').first()).toBeVisible();
    
    // Check if the add user button exists (assuming it says "Thêm người dùng" or "Tạo tài khoản")
    // Because we might not know the exact text, we just verify the table or header exists.
    await expect(page.locator('table')).toBeVisible();
  });
});
