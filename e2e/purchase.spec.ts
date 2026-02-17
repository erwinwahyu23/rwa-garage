import { test, expect } from '@playwright/test';

test('full purchase flow: header gating, inline create, submit', async ({ page }) => {
  // seed session and sign in automatically (only available in test mode)
  await page.goto('/api/test/signin');
  // landing page should be redirected after sign-in; ensure auth done
  await page.waitForURL('/');

  // then navigate to the purchase page
  await page.goto('/inventory/purchases/new');

  // wait for page to be ready and ensure the header is visible
  await page.getByText('Tambah Pembelian').waitFor();
  const tambahBtn = page.getByText('Tambah Item');
  await expect(tambahBtn).toBeVisible();
  await expect(tambahBtn).toBeDisabled();

  // fill header: date, supplier, ref
  const dateInput = page.getByLabel('Tanggal Pembelian');
  await dateInput.fill('2026-01-01');

  const supplierInput = page.locator('#supplier-combobox');
  await supplierInput.fill('Supplier 1');
  // wait for suggestion and click
  await page.getByText('Supplier 1').click();

  const refInput = page.getByLabel('Nomor Referensi');
  await refInput.fill('REF-E2E-1');

  // now the add item button should be enabled
  await expect(tambahBtn).toBeEnabled();
  await tambahBtn.click();

  // inline create should show inputs
  await page.locator('#new-code').fill('E2E-CODE-1');
  await page.locator('#new-name').fill('E2E Item Name');
  await page.getByRole('button', { name: 'Buat & Tambah' }).click();

  // After creation, an item row should be added and prefilled
  await expect(page.getByText('Item #1')).toBeVisible();
  await expect(page.locator('#items-0-code')).toHaveValue('E2E-CODE-1');
  await expect(page.locator('#items-0-name')).toHaveValue('E2E Item Name');

  // Fill quantity and cost
  await page.locator('input[name="items.0.quantity"]').fill('2').catch(() => {});
  await page.locator('input[name="items.0.costPrice"]').fill('50000').catch(() => {});

  // submit
  await page.getByRole('button', { name: 'Simpan Semua Pembelian' }).click();

  // expect success toast (text from UI)
  await expect(page.getByText('Pembelian tercatat')).toBeVisible({ timeout: 10000 });
});