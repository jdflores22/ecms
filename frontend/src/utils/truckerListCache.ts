import { paymentApi, preAdviceApi, scheduleApi, type Payment, type PreAdvice, type Schedule } from '../services/api'
import { createCachedFetcher } from './listApiCache'

const LIST_TTL_MS = 60_000

const cachedScheduleList = createCachedFetcher(
  () => scheduleApi.list().then(({ data }) => data),
  LIST_TTL_MS,
)

const cachedPaymentMine = createCachedFetcher(
  () => paymentApi.mine().then(({ data }) => data),
  LIST_TTL_MS,
)

const cachedPreAdviceList = createCachedFetcher(
  () => preAdviceApi.list().then(({ data }) => data),
  LIST_TTL_MS,
)

export function fetchCachedScheduleList(force = false): Promise<Schedule[]> {
  return cachedScheduleList.fetch(force)
}

export function fetchCachedPaymentMine(force = false): Promise<Payment[]> {
  return cachedPaymentMine.fetch(force)
}

export function fetchCachedPreAdviceList(force = false): Promise<PreAdvice[]> {
  return cachedPreAdviceList.fetch(force)
}

export function invalidateTruckerListCaches() {
  cachedScheduleList.clear()
  cachedPaymentMine.clear()
}

export function invalidatePreAdviceListCache() {
  cachedPreAdviceList.clear()
}
