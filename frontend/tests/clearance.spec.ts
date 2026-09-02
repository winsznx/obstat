import { test, expect } from '@playwright/test';

test.describe('OBSTAT Clearance Operations Flow', () => {

  test('should verify landing page header and navigation surfaces', async ({ page }) => {
    await page.goto('/');
    
    // Check main Header brand text
    await expect(page.getByText('OBSTAT', { exact: true })).toBeVisible();
    await expect(page.locator('h1')).toContainText('Clearance evidence that keeps up with the script.');
  });

});
