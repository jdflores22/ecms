import { preAdviceApi, type PreAdviceLookups } from '../services/api'

const TTL_MS = 10 * 60 * 1000

let cached: { data: PreAdviceLookups; expiresAt: number } | null = null
let inflight: Promise<PreAdviceLookups> | null = null

/** Cached pre-forecast lookups (shipping lines, sizes, types). */
export function fetchPreAdviceLookups(force = false): Promise<PreAdviceLookups> {
  const now = Date.now()
  if (!force && cached && now < cached.expiresAt) {
    return Promise.resolve(cached.data)
  }

  if (!force && inflight) {
    return inflight
  }

  inflight = preAdviceApi
    .lookups()
    .then(({ data }) => {
      cached = { data, expiresAt: Date.now() + TTL_MS }
      return data
    })
    .finally(() => {
      inflight = null
    })

  return inflight
}

export function clearPreAdviceLookupsCache() {
  cached = null
  inflight = null
}
