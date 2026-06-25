import { expect, type Page } from '@playwright/test'

export const users = {
  trucker: { username: 'trucker1', password: 'Trucker@123' },
  evaluator: { username: 'evaluator1', password: 'Evaluator@123' },
  depot: { username: 'depot1', password: 'Depot@123' },
}

export async function login(page: Page, username: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page.getByRole('heading', { name: /Welcome/i })).toBeVisible()
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Logout' }).click()
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
}

export async function openNav(page: Page, label: string) {
  await page.locator('nav').getByRole('button', { name: label, exact: true }).click()
}

import { shiftIsoDate, todayIsoDate } from '../src/utils/datetime'

export function tomorrowIso() {
  return shiftIsoDate(todayIsoDate(), 1)
}
