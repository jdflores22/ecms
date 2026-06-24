import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { login, logout, openNav, tomorrowIso, users } from './helpers'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const proofFile = path.join(__dirname, 'fixtures', 'payment-proof.png')

test.describe('ECMS happy path', () => {
  test.beforeAll(async ({ request }) => {
    const apiBase = process.env.ECMS_API_URL ?? 'http://localhost:5275'
    const health = await request.get(`${apiBase}/swagger/index.html`)
    expect(health.ok(), 'API must be running on port 5275').toBeTruthy()
  })

  test('broker through evaluator, depot, trucker to QR', async ({ page }) => {
    let referenceNo = ''

    // 1. Broker — create and submit pre-advice
    await login(page, users.broker.username, users.broker.password)
    await openNav(page, 'Pre-Advice')
    await expect(page.getByRole('heading', { name: 'Pre-Advice Requests' })).toBeVisible()
    await page.getByRole('button', { name: 'New Pre-Advice' }).click()
    await expect(page.getByRole('heading', { name: 'New Pre-Advice' })).toBeVisible()

    await page.getByLabel('Shipping line').click()
    await page.getByRole('option').first().click()
    await page.getByLabel('Container').click()
    await page.getByRole('option').first().click()
    await page.getByRole('button', { name: 'Create draft' }).click()

    await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible({ timeout: 15_000 })
    referenceNo = (await page.getByText(/^PA-\d{4}-\d{5}$/).first().innerText()).trim()
    expect(referenceNo).toBeTruthy()

    await page.getByRole('button', { name: 'Submit' }).click()
    await expect(page.getByText('Submitted')).toBeVisible({ timeout: 15_000 })
    await logout(page)

    // 2. Evaluator — approve and assign CY
    await login(page, users.evaluator.username, users.evaluator.password)
    await openNav(page, 'Evaluations')
    const evalRow = page.locator('tr').filter({ hasText: referenceNo })
    await expect(evalRow).toBeVisible()
    await evalRow.getByRole('button', { name: 'Approve' }).click()
    await expect(page.getByRole('heading', { name: 'Approve Pre-Advice' })).toBeVisible()
    await page.getByRole('button', { name: 'Approve & Assign CY' }).click()
    await expect(page.getByRole('heading', { name: 'Approve Pre-Advice' })).toBeHidden({ timeout: 10_000 })
    await logout(page)

    // 3. Depot — schedule return and assign trucker
    await login(page, users.depot.username, users.depot.password)
    await openNav(page, 'Schedules')
    const scheduleRow = page.locator('tr').filter({ hasText: referenceNo })
    await expect(scheduleRow).toBeVisible()
    await scheduleRow.getByRole('button', { name: /Assign|Edit/ }).click()
    const scheduleDialog = page.getByRole('dialog', { name: 'Assign Schedule & Trucker' })
    await expect(scheduleDialog).toBeVisible()
    await scheduleDialog.getByLabel('Date').fill(tomorrowIso())
    const truckerCombo = scheduleDialog.getByRole('combobox').nth(1)
    const truckerValue = await truckerCombo.innerText()
    if (!/trucker1|ABC Trucking/i.test(truckerValue)) {
      await truckerCombo.click()
      await page.getByRole('option', { name: /ABC Trucking|trucker1/i }).click()
    }
    await scheduleDialog.getByRole('button', { name: /Save & Notify Trucker/i }).click()
    await expect(page.getByRole('dialog', { name: 'Assign Schedule & Trucker' })).toBeHidden({
      timeout: 15_000,
    })
    await logout(page)

    // 4. Trucker — upload payment proof
    await login(page, users.trucker.username, users.trucker.password)
    await openNav(page, 'Payments')
    const payRow = page.locator('tr').filter({ hasText: referenceNo })
    await expect(payRow).toBeVisible()
    await payRow.getByRole('button', { name: 'Upload Proof' }).click()
    await page.locator('input[type="file"]').setInputFiles(proofFile)
    await page.getByRole('button', { name: 'Submit' }).click()
    await expect(page.getByRole('heading', { name: 'Upload Payment Proof' })).toBeHidden({ timeout: 10_000 })
    await logout(page)

    // 5. Depot — verify payment (issues QR)
    await login(page, users.depot.username, users.depot.password)
    await openNav(page, 'Verify Payments')
    await expect(page.getByRole('button', { name: 'Approve' }).first()).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Approve' }).first().click()
    await expect(page.getByText(/Payment approved/i)).toBeVisible({ timeout: 10_000 })
    await logout(page)

    // 6. Trucker — QR available
    await login(page, users.trucker.username, users.trucker.password)
    await openNav(page, 'QR Codes')
    const qrCard = page.locator('.MuiCard-root').filter({ hasText: referenceNo })
    await expect(qrCard.getByRole('button', { name: 'Download' })).toBeVisible()
  })
})
