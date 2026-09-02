import { test, expect } from '@playwright/test';

test.describe('OBSTAT End-to-End Clearance Workflow', () => {

  test('Public Landing Page displays hero and interactive invalidation widget', async ({ page }) => {
    await page.goto('/');
    
    // Check Landing Hero Title
    await expect(page.locator('h1')).toContainText('Clearance evidence that keeps up with the script.');

    // Check Toggle Widget
    const d12Btn = page.getByRole('button', { name: /Draft 12 \(Locked\)/i });
    const d13Btn = page.getByRole('button', { name: /Draft 13 \(Revised\)/i });

    await expect(d12Btn).toBeVisible();
    await expect(d13Btn).toBeVisible();

    // Click Draft 13 and check state change
    await d13Btn.click();
    await expect(page.getByText('STALE EVIDENCE · RE-RESEARCH REQUIRED')).toBeVisible();
  });

  test('Complete Clearance Workflow: Onboarding -> Workspace -> Invalidation -> Packet', async ({ page }) => {
    await page.goto('/');

    // 1. Open Onboarding Wizard
    const startBtn = page.getByRole('button', { name: /Start a Production/i }).first();
    await startBtn.click();

    await expect(page.getByText('Start a New Production')).toBeVisible();

    // Fill Title
    const titleInput = page.getByPlaceholder('e.g. The Starlight Heist');
    await titleInput.fill('Playwright E2E Feature');

    // Click Next
    await page.getByRole('button', { name: /Next: Clearance Scope/i }).click();

    // Click Create & Begin
    await page.getByRole('button', { name: /Create & Begin/i }).click();

    // Verify transition to Workspace
    await expect(page.getByRole('button', { name: 'Workspace', exact: true })).toBeVisible();

    // Navigate to Revision Invalidation
    await page.getByRole('button', { name: 'Revision Invalidation' }).click();
    await expect(page.getByText('Revision Invalidation Engine')).toBeVisible();

    // Navigate to Research Packet
    await page.getByRole('button', { name: 'Research Packet' }).click();
    await expect(page.getByText('Screenplay Clearance Packet')).toBeVisible();

    // Navigate to Assurance Proof
    await page.getByRole('button', { name: 'Assurance Proof' }).click();
    await expect(page.getByText('Assurance & Egress Provenance')).toBeVisible();
  });

});
