type CacheEntry<T> = { data: T; expiresAt: number }

/** Small TTL cache with in-flight deduplication (matches Android list caches). */
export function createCachedFetcher<T>(fetcher: () => Promise<T>, ttlMs: number) {
  let cached: CacheEntry<T> | null = null
  let inflight: Promise<T> | null = null

  return {
    fetch(force = false): Promise<T> {
      const now = Date.now()
      if (!force && cached && now < cached.expiresAt) {
        return Promise.resolve(cached.data)
      }
      if (!force && inflight) {
        return inflight
      }

      inflight = fetcher()
        .then((data) => {
          cached = { data, expiresAt: Date.now() + ttlMs }
          return data
        })
        .finally(() => {
          inflight = null
        })

      return inflight
    },
    clear() {
      cached = null
      inflight = null
    },
  }
}
