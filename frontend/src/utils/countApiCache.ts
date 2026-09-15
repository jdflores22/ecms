import { demurrageBillingApi, evaluationApi, paymentApi, scheduleApi, withdrawalApi } from '../services/api'
import { createCachedFetcher } from './listApiCache'

const COUNT_TTL_MS = 60_000
export const COUNT_POLL_MS = COUNT_TTL_MS

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

const cachedPendingEvaluationCount = createCachedFetcher(
  () => evaluationApi.pendingCount().then(({ data }) => data.count),
  COUNT_TTL_MS,
)

const cachedAwaitingCyCount = createCachedFetcher(
  () => withdrawalApi.awaitingCyCount().then(({ data }) => data.count),
  COUNT_TTL_MS,
)

const cachedDepotWithdrawalReviewCount = createCachedFetcher(
  () => withdrawalApi.pendingReviewCount().then(({ data }) => data.count),
  COUNT_TTL_MS,
)

const cachedWaitingScheduleCount = createCachedFetcher(
  () => scheduleApi.waitingCount().then(({ data }) => data.count),
  COUNT_TTL_MS,
)

const cachedAdminPendingPaymentCount = createCachedFetcher(
  () => paymentApi.pendingCount().then(({ data }) => data.count),
  COUNT_TTL_MS,
)

export function fetchCachedPendingEvaluationCount(force = false): Promise<number> {
  return cachedPendingEvaluationCount.fetch(force)
}

export function fetchCachedAwaitingCyCount(force = false): Promise<number> {
  return cachedAwaitingCyCount.fetch(force)
}

export function fetchCachedDepotWithdrawalReviewCount(force = false): Promise<number> {
  return cachedDepotWithdrawalReviewCount.fetch(force)
}

export function fetchCachedWaitingScheduleCount(force = false): Promise<number> {
  return cachedWaitingScheduleCount.fetch(force)
}

export function fetchCachedAdminPendingPaymentCount(force = false): Promise<number> {
  return cachedAdminPendingPaymentCount.fetch(force)
}
