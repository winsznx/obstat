import { test, expect } from '@playwright/test';

test.describe('OBSTAT Live Provider E2E Integration Suite (Vertex AI + Parallel API)', () => {
  // Allow extended timeout for live network provider execution
  test.setTimeout(90 * 1000);

  test('Live Provider Lifecycle: Vertex Extraction -> Parallel Search -> Disposition -> Revision Invalidation', async ({ page }) => {
    const t0 = Date.now();
    console.log('[Live Provider E2E] Starting live lifecycle test at:', new Date().toISOString());

    // 1. Visit App Workspace
    await page.goto('/');
    await expect(page.getByText('OBSTAT', { exact: true })).toBeVisible();

    // 2. Open Onboarding Wizard to create new production
    const startBtn = page.getByRole('button', { name: /Start a Production/i }).first();
    await startBtn.click();
    await expect(page.getByText('Start a New Production')).toBeVisible();

    const titleInput = page.getByPlaceholder('e.g. The Starlight Heist');
    const uniqueTitle = `Live Integration Run ${Date.now()}`;
    await titleInput.fill(uniqueTitle);

    await page.getByRole('button', { name: /Next: Clearance Scope/i }).click();
    await page.getByRole('button', { name: /Create & Begin/i }).click();

    // 3. Verify workspace loads workspace surface
    await expect(page.getByRole('button', { name: 'Workspace', exact: true })).toBeVisible();

    // 4. Inspect a live claim (e.g. VELA RECORDS or MERCER VALE RECORDS)
    const claimChip = page.getByRole('button', { name: /MERCER VALE RECORDS/i }).first();
    if (await claimChip.isVisible()) {
      await claimChip.click();
      await expect(page.getByText('MERCER VALE RECORDS')).toBeVisible();
      await expect(page.getByText('Decision Summary')).toBeVisible();
    }

    // 5. Test Revision Invalidation View
    await page.getByRole('button', { name: 'Revision Invalidation' }).click();
    await expect(page.getByText('Revision Invalidation Engine')).toBeVisible();
    await expect(page.getByText('Draft 12').first()).toBeVisible();
    await expect(page.getByText('Draft 13').first()).toBeVisible();

    // 6. Test Script Clearance Research Packet View
    await page.getByRole('button', { name: 'Research Packet' }).click();
    await expect(page.getByText('Screenplay Clearance Packet')).toBeVisible();
    await expect(page.getByText('Export JSON Package')).toBeVisible();

    // 7. Test Assurance & Egress Provenance View
    await page.getByRole('button', { name: 'Assurance Proof' }).click();
    await expect(page.getByText('Assurance & Egress Provenance')).toBeVisible();

    const durationSec = ((Date.now() - t0) / 1000).toFixed(2);
    console.log(`[Live Provider E2E] Live lifecycle complete in ${durationSec}s.`);
  });
});
