/**
 * Resolve API-relative asset paths (e.g. /uploads/photo.jpg) to a full URL.
 * Required in production when the React app is on Hostinger and the API is on Railway.
 */
export function resolveAssetUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL ?? ''
  if (apiBase.startsWith('http')) {
    const origin = apiBase.replace(/\/api\/?$/, '')
    const normalized = path.startsWith('/') ? path : `/${path}`
    const [pathname, query = ''] = normalized.split('?')
    return query ? `${origin}${pathname}?${query}` : `${origin}${pathname}`
  }

  return path
}

/** True when the resolved asset URL is on a different origin (e.g. Hostinger UI → Railway API). */
export function isCrossOriginAssetUrl(path: string | null | undefined): boolean {
  const url = resolveAssetUrl(path)
  if (!url.startsWith('http')) return false
  try {
    return new URL(url).origin !== window.location.origin
  } catch {
    return true
  }
}

function normalizeUploadPath(path: string): string {
  const trimmed = path.trim()
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

const signedCache = new Map<string, string>()
let batchTimer: ReturnType<typeof setTimeout> | null = null
let batchPromise: Promise<void> | null = null
const pendingPaths = new Set<string>()

async function flushSignBatch(): Promise<void> {
  const paths = [...pendingPaths]
  pendingPaths.clear()
  if (paths.length === 0) return

  const { default: api } = await import('../services/api')
  const { data } = await api.post<{ paths: Record<string, string> }>('/assets/sign-batch', { paths })
  for (const [path, signed] of Object.entries(data.paths ?? {})) {
    signedCache.set(normalizeUploadPath(path), signed)
  }
}

function scheduleSignBatch(): Promise<void> {
  if (batchPromise) return batchPromise

  batchPromise = new Promise((resolve, reject) => {
    if (batchTimer) clearTimeout(batchTimer)
    batchTimer = setTimeout(async () => {
      batchTimer = null
      batchPromise = null
      try {
        await flushSignBatch()
        resolve()
      } catch (err) {
        reject(err)
      }
    }, 0)
  })

  return batchPromise
}

/** Returns a URL that works for cross-origin <img> tags (adds HMAC sig query params when needed). */
export async function ensureSignedAssetUrl(path: string | null | undefined): Promise<string> {
  if (!path) return ''
  if (!isCrossOriginAssetUrl(path)) return resolveAssetUrl(path)

  const normalized = normalizeUploadPath(path.split('?')[0] ?? path)
  const cached = signedCache.get(normalized)
  if (cached) return resolveAssetUrl(cached)

  pendingPaths.add(normalized)
  await scheduleSignBatch()

  const signed = signedCache.get(normalized)
  return signed ? resolveAssetUrl(signed) : ''
}

function resolvedUrlForPath(path: string): string {
  const normalized = normalizeUploadPath(path.split('?')[0] ?? path)
  if (!isCrossOriginAssetUrl(path)) return resolveAssetUrl(path)
  const cached = signedCache.get(normalized)
  return cached ? resolveAssetUrl(cached) : ''
}

/** Eagerly sign and browser-prefetch document images (call when document list arrives). */
export async function prefetchSignedAssetUrls(paths: (string | null | undefined)[]): Promise<void> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))]
  if (unique.length === 0) return

  const needSign: string[] = []
  for (const path of unique) {
    const normalized = normalizeUploadPath(path.split('?')[0] ?? path)
    if (isCrossOriginAssetUrl(path) && !signedCache.has(normalized)) {
      needSign.push(normalized)
    }
  }

  if (needSign.length > 0) {
    needSign.forEach((path) => pendingPaths.add(path))
    await scheduleSignBatch()
  }

  warmAssetImages(unique.map(resolvedUrlForPath).filter(Boolean))
}

/** Start browser download/decoding for image URLs (no-op when empty). */
export function warmAssetImages(urls: string[]): void {
  for (const url of urls) {
    if (!url) continue
    const img = new Image()
    img.decoding = 'async'
    img.src = url
  }
}
