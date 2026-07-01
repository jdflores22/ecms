import type { WithdrawalFormValues } from '../components/withdrawals/WithdrawalForm'

const STORAGE_KEY = 'ecms.withdrawal.new.draft'

export function loadWithdrawalDraft(): WithdrawalFormValues | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as WithdrawalFormValues
  } catch {
    return null
  }
}

export function saveWithdrawalDraft(values: WithdrawalFormValues): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values))
  } catch {
    // ignore quota errors
  }
}

export function clearWithdrawalDraft(): void {
  localStorage.removeItem(STORAGE_KEY)
}
