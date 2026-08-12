import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('Student logs in and redirects to dashboard', async ({ page }) => {
    // Intercept login API
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
    
    // Fill credentials
    await page.getByTestId('login-email').fill('student@gmail.com');
    await page.getByTestId('login-password').fill('123456');
    
    // Submit
    await page.getByTestId('login-submit').click();
    
    // Verify redirect
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('text=BreadTrans').first()).toBeVisible();
  });

  test('Admin logs in and redirects to admin panel', async ({ page }) => {
    // Intercept login API
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

  test('Teacher logs in and redirects to teacher panel', async ({ page }) => {
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
            access_token: 'fake-token-teacher',
            refresh_token: 'fake-refresh-teacher',
            user: { id: 3, email: 'teacher@gmail.com', role: 'TEACHER' }
          }
        })
      });
    });

    await page.goto('/');
    
    await page.getByTestId('login-email').fill('teacher@gmail.com');
    await page.getByTestId('login-password').fill('123456');
    
    await page.getByTestId('login-submit').click();
    
    await expect(page).toHaveURL(/.*\/teacher\/classes/);
  });
});
