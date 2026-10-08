import { test, expect } from '@playwright/test';
test('entry presents worker and admin login choices', async ({ page }) => { await page.goto('/'); await expect(page.getByText('Login as Worker')).toBeVisible(); await expect(page.getByText('Login as Admin')).toBeVisible(); });
