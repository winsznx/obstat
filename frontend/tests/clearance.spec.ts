import { test, expect } from '@playwright/test';

test.describe('OBSTAT Clearance Operations Flow', () => {

  test('should verify empty states and navigation surfaces', async ({ page }) => {
    await page.goto('/');
    
    // Check main Header title
    await expect(page.locator('h1')).toContainText('OBSTAT');

    // Verify empty state placeholders when no project is loaded
    await expect(page.locator('text=No production selected')).toBeVisible();
  });
});
