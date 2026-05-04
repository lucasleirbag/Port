const { test, expect } = require('@playwright/test');

test.describe('Portfolio', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Lucas Gabriel/);
  });

  test('shows developer name in h1', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Lucas Gabriel');
  });

  test('has exactly 5 demo buttons', async ({ page }) => {
    await expect(page.locator('[data-demo-open]')).toHaveCount(5);
  });

  test('all 5 demo IDs are present', async ({ page }) => {
    for (const id of ['face-detection', 'ocr', 'omr', 'docorient', 'plates']) {
      await expect(page.locator(`[data-demo-open="${id}"]`)).toHaveCount(1);
    }
  });
});

test.describe('Modal open / close', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('opens modal when OMR demo button is clicked', async ({ page }) => {
    await page.locator('[data-demo-open="omr"]').click();
    await expect(page.locator('.demo-modal')).toBeVisible();
    await expect(page.locator('.demo-modal__title')).toContainText('omr');
  });

  test('opens modal when plates demo button is clicked', async ({ page }) => {
    await page.locator('[data-demo-open="plates"]').click();
    await expect(page.locator('.demo-modal')).toBeVisible();
    await expect(page.locator('.demo-modal__title')).toContainText('placas');
  });

  test('opens modal when docorient demo button is clicked', async ({ page }) => {
    await page.locator('[data-demo-open="docorient"]').click();
    await expect(page.locator('.demo-modal')).toBeVisible();
    await expect(page.locator('.demo-modal__title')).toContainText('docorient');
  });

  test('closes modal via close button', async ({ page }) => {
    await page.locator('[data-demo-open="omr"]').click();
    await expect(page.locator('.demo-modal')).toBeVisible();
    await page.locator('.demo-modal__close').click();
    await expect(page.locator('.demo-modal')).toHaveCount(0);
  });

  test('closes modal via Escape key', async ({ page }) => {
    await page.locator('[data-demo-open="omr"]').click();
    await expect(page.locator('.demo-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.demo-modal')).toHaveCount(0);
  });

  test('closes modal via backdrop click', async ({ page }) => {
    await page.locator('[data-demo-open="omr"]').click();
    await expect(page.locator('.demo-modal')).toBeVisible();
    // Click the backdrop in the top-left corner (outside the centered panel)
    await page.mouse.click(5, 5);
    await expect(page.locator('.demo-modal')).toHaveCount(0);
  });

  test('can open two different demos sequentially', async ({ page }) => {
    await page.locator('[data-demo-open="omr"]').click();
    await expect(page.locator('.demo-modal')).toBeVisible();
    await page.locator('.demo-modal__close').click();
    await expect(page.locator('.demo-modal')).toHaveCount(0);

    await page.locator('[data-demo-open="plates"]').click();
    await expect(page.locator('.demo-modal')).toBeVisible();
    await page.locator('.demo-modal__close').click();
  });

  test('engine.open() switches demo without stacking modals', async ({ page }) => {
    await page.locator('[data-demo-open="omr"]').click();
    await expect(page.locator('.demo-modal')).toHaveCount(1);
    // Trigger a second demo via the JS API (backdrop blocks normal clicks)
    await page.evaluate(() => window._demoEngine.open('docorient'));
    await expect(page.locator('.demo-modal')).toHaveCount(1);
    await expect(page.locator('.demo-modal__title')).toContainText('docorient');
    await page.locator('.demo-modal__close').click();
  });
});

test.describe('OMR demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-demo-open="omr"]').click();
  });

  test.afterEach(async ({ page }) => {
    await page.locator('.demo-modal__close').click();
  });

  test('renders canvas and terminal', async ({ page }) => {
    await expect(page.locator('#omr-canvas')).toBeVisible();
    await expect(page.locator('#omr-log')).toBeVisible();
  });

  test('loads sample gabarito when button is clicked', async ({ page }) => {
    await page.locator('#omr-sample-btn').click();
    await expect(page.locator('#omr-log')).toContainText('gabarito de amostra carregado');
  });

  test('runs detection and prints results after loading sample', async ({ page }) => {
    await page.locator('#omr-sample-btn').click();
    await expect(page.locator('#omr-log')).toContainText('detecção concluída', { timeout: 3000 });
  });
});

test.describe('docorient demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-demo-open="docorient"]').click();
  });

  test.afterEach(async ({ page }) => {
    await page.locator('.demo-modal__close').click();
  });

  test('renders two canvases (original and corrected)', async ({ page }) => {
    await expect(page.locator('#doc-orig')).toBeVisible();
    await expect(page.locator('#doc-fixed')).toBeVisible();
  });

  test('loads sample document and shows angle info', async ({ page }) => {
    await page.locator('#doc-sample-btn').click();
    await expect(page.locator('#doc-log')).toContainText('documento carregado');
    await expect(page.locator('#doc-log')).toContainText('ângulo');
  });

  test('shows correction complete message', async ({ page }) => {
    await page.locator('#doc-sample-btn').click();
    await expect(page.locator('#doc-log')).toContainText('alinhado', { timeout: 3000 });
  });
});

test.describe('plates demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-demo-open="plates"]').click();
  });

  test.afterEach(async ({ page }) => {
    await page.locator('.demo-modal__close').click();
  });

  test('renders canvas and terminal', async ({ page }) => {
    await expect(page.locator('#plates-canvas')).toBeVisible();
    await expect(page.locator('#plates-log')).toBeVisible();
  });

  test('shows pipeline info on mount', async ({ page }) => {
    await expect(page.locator('#plates-log')).toContainText('YOLOv8');
  });

  test('detects plate and logs result', async ({ page }) => {
    await expect(page.locator('#plates-log')).toContainText('placa detectada', { timeout: 3000 });
  });

  test('loads next sample when button is clicked', async ({ page }) => {
    const initialText = await page.locator('#plates-log').innerText();
    await page.locator('#plates-next').click();
    await expect(page.locator('#plates-log')).not.toContainText(initialText);
  });
});
