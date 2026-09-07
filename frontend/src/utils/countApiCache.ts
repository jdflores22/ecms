import { demurrageBillingApi, paymentApi, withdrawalApi } from '../services/api'
import { createCachedFetcher } from './listApiCache'

const COUNT_TTL_MS = 60_000

const cachedPaymentDueCount = createCachedFetcher(
  () => paymentApi.dueCount().then(({ data }) => data.count),
  COUNT_TTL_MS,
)

const cachedDemurrageDueCount = createCachedFetcher(
  () => demurrageBillingApi.paymentDueCount().then(({ data }) => data.count),
  COUNT_TTL_MS,
)

const cachedWithdrawalActionCount = createCachedFetcher(
  () => withdrawalApi.pendingActionCount().then(({ data }) => data.count),
  COUNT_TTL_MS,
)

export function fetchCachedPaymentDueCount(force = false): Promise<number> {
  return cachedPaymentDueCount.fetch(force)
}

export function fetchCachedDemurrageDueCount(force = false): Promise<number> {
  return cachedDemurrageDueCount.fetch(force)
}

export function fetchCachedWithdrawalActionCount(force = false): Promise<number> {
  return cachedWithdrawalActionCount.fetch(force)
}
