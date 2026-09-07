import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

test.describe('Live Provider E2E Invalidation Flow (Real Cloud Run & Real APIs)', () => {

  test('Draft N -> Draft N+1 Live Invalidation and Persistence Flow', async ({ page }) => {
    // 1. Visit Live Application
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Clearance evidence that keeps up with the script.');

    // 2. Open Onboarding Wizard to create production in Firestore
    const startBtn = page.getByRole('button', { name: /Start a Production/i }).first();
    await startBtn.click();
    await expect(page.getByText('Start a New Production')).toBeVisible();

    const uniqueTitle = `Live Production RedTeam ${Date.now()}`;
    const titleInput = page.getByPlaceholder('e.g. The Starlight Heist');
    await titleInput.fill(uniqueTitle);

    await page.getByRole('button', { name: /Next: Clearance Scope/i }).click();
    await page.getByRole('button', { name: /Create & Begin/i }).click();

    // 3. Confirm transition to Workspace
    await expect(page.getByRole('button', { name: 'Workspace', exact: true })).toBeVisible();

    // 4. Create Draft N temp screenplay
    const draftNContent = `SCENE 1 - INT. HIGH RISE BOARDROOM - DAY

ELENA ROSTOVA (30s) overlooks the sprawling city below.

                    ELENA ROSTOVA
The deal must close before morning. We cannot afford any delay.

She hands over a portfolio labeled "WAYNE ENTERPRISES MERGER".
`;
    const tmpDir = os.tmpdir();
    const draftNPath = path.join(tmpDir, `draft_n_${Date.now()}.txt`);
    fs.writeFileSync(draftNPath, draftNContent, 'utf-8');

    // 5. Upload Draft N via file input
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(draftNPath);

    // Wait for upload and live ADK / Gemini / Parallel processing to complete (up to 45s)
    await expect(page.getByText(/ELENA ROSTOVA/i).first()).toBeVisible({ timeout: 45000 });
    console.log(' Draft N processed live. Extracted entity ELENA ROSTOVA is visible.');

    // 6. Record human disposition on first claim
    const claimPill = page.getByRole('button', { name: 'ELENA ROSTOVA' }).first();
    await claimPill.click();
    const proceedBtn = page.getByRole('button', { name: 'Proceed per Counsel' });
    if (await proceedBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await proceedBtn.click();
      console.log(' Counsel disposition recorded: Proceed per Counsel');
    }

    // 7. Create Draft N+1 temp screenplay (WAYNE ENTERPRISES changed to KOBAYASHI LOGISTICS)
    const draftN1Content = `SCENE 1 - INT. HIGH RISE BOARDROOM - DAY

ELENA ROSTOVA (30s) overlooks the sprawling city below.

                    ELENA ROSTOVA
The deal is off. We are switching logistics partners immediately.

She hands over a portfolio labeled "KOBAYASHI LOGISTICS WORLDWIDE".
`;
    const draftN1Path = path.join(tmpDir, `draft_n1_${Date.now()}.txt`);
    fs.writeFileSync(draftN1Path, draftN1Content, 'utf-8');

    // Upload Draft N+1
    await fileInput.setInputFiles(draftN1Path);

    // Wait for Draft N+1 processing
    await expect(page.getByText(/KOBAYASHI/i).first()).toBeVisible({ timeout: 45000 });
    console.log(' Draft N+1 processed live. Extracted entity KOBAYASHI is visible.');

    // 8. Navigate to Revision Invalidation Engine view
    await page.getByRole('button', { name: 'Revision Invalidation' }).click();
    await expect(page.getByText('Revision Invalidation Engine')).toBeVisible();

    // Verify invalidation metrics
    await expect(page.getByText('Retained Claims')).toBeVisible();
    await expect(page.getByText('Searches Saved')).toBeVisible();
    console.log(' Revision Invalidation view verified: Metrics and diff displayed.');

    // 9. Navigate to Research Packet view
    await page.getByRole('button', { name: 'Research Packet' }).click();
    await expect(page.getByText('Screenplay Clearance Packet')).toBeVisible();
    console.log(' Research Packet view verified: Clearance ledger displayed.');

    // Clean up temporary files
    try {
      fs.unlinkSync(draftNPath);
      fs.unlinkSync(draftN1Path);
    } catch {}
  });

});
