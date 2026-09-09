import { test, expect } from '@playwright/test';

test.describe('OBSTAT Clearance Operations Flow', () => {

  test('should verify landing page header and navigation surfaces', async ({ page }) => {
    await page.goto('/');
    
    // Check main Header brand text
    await expect(page.getByText('OBSTAT', { exact: true })).toBeVisible();
    await expect(page.locator('h1')).toContainText('Clearance evidence that keeps up with the script.');
  });

  test('should render responsive mobile navigation at 390px viewport', async ({ page }) => {

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await expect(page.getByText('OBSTAT', { exact: true })).toBeVisible();

    // Mobile menu toggle button should be visible
    const toggleBtn = page.getByRole('button', { name: 'Toggle mobile menu' });
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    // Mobile navigation items should appear
    await expect(page.getByRole('button', { name: 'Revision Invalidation Engine' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assurance & Egress Audit' })).toBeVisible();

    // Click Revision Invalidation from mobile drawer
    await page.getByRole('button', { name: 'Revision Invalidation Engine' }).click();
    await expect(page.getByText('Revision Invalidation Engine')).toBeVisible();
  });

  test('should support responsive tablet layout at 768px and desktop at 1024px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.getByText('OBSTAT', { exact: true })).toBeVisible();

    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(page.getByRole('button', { name: 'Revision Invalidation', exact: true })).toBeVisible();
  });

});

