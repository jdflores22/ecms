/**
 * Resolve API-relative asset paths (e.g. /uploads/photo.jpg) to a full URL.
 * Required in production when the React app is on Hostinger and the API is on Railway.
 */
import { toHostingerProxyUrl, USE_HOSTINGER_API_PROXY } from './hostingerApiProxy'

const SIGNED_CACHE_KEY = 'ecms.signedAssetUrls.v1'
const SIGNED_CACHE_SKEW_MS = 60_000

export function resolveAssetUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path
  }

  if (USE_HOSTINGER_API_PROXY) {
    const normalized = path.startsWith('/') ? path.slice(1) : path
    const [pathname, query = ''] = normalized.split('?')
    if (pathname.startsWith('api/') || pathname.startsWith('uploads/')) {
      const proxied = toHostingerProxyUrl(pathname)
      return query ? `${proxied}&${query}` : proxied
    }
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

function isUploadPath(path: string | null | undefined): boolean {
  if (!path) return false
  const base = (path.split('?')[0] ?? path).trim()
  return base.startsWith('/uploads/') || base.startsWith('uploads/')
}

export function isAlreadySignedAssetPath(path: string | null | undefined): boolean {
  if (!path) return false
  return path.includes('sig=') && path.includes('exp=')
}

/** Uploads in <img> tags need HMAC sig when cross-origin or via Hostinger proxy (no JWT on image requests). */
export function requiresSignedAssetUrl(path: string | null | undefined): boolean {
  if (!path || isAlreadySignedAssetPath(path)) return false
  if (!isUploadPath(path)) return false
  if (USE_HOSTINGER_API_PROXY) return true
  return isCrossOriginAssetUrl(path)
}

function normalizeUploadPath(path: string): string {
  const trimmed = path.trim()
  const base = (trimmed.split('?')[0] ?? trimmed).trim()
  return base.startsWith('/') ? base : `/${base}`
}

function signedExpiryMs(path: string): number | null {
  try {
    const query = path.includes('?') ? path.split('?')[1] : ''
    const exp = new URLSearchParams(query).get('exp')
    if (!exp) return null
    const unix = Number(exp)
    return Number.isFinite(unix) ? unix * 1000 : null
  } catch {
    return null
  }
}

function isSignedCacheEntryValid(signedPath: string): boolean {
  const expiryMs = signedExpiryMs(signedPath)
  if (expiryMs === null) return false
  return Date.now() < expiryMs - SIGNED_CACHE_SKEW_MS
}

const signedCache = new Map<string, string>()

function loadPersistedSignedCache(): void {
  try {
    const raw = sessionStorage.getItem(SIGNED_CACHE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Record<string, string>
    for (const [path, signed] of Object.entries(parsed)) {
      if (isSignedCacheEntryValid(signed)) {
        signedCache.set(path, signed)
      }
    }
  } catch {
    /* ignore corrupt cache */
  }
}

function persistSignedCache(): void {
  try {
    const payload: Record<string, string> = {}
    for (const [path, signed] of signedCache.entries()) {
      if (isSignedCacheEntryValid(signed)) {
        payload[path] = signed
      }
    }
    sessionStorage.setItem(SIGNED_CACHE_KEY, JSON.stringify(payload))
  } catch {
    /* storage full or private mode */
  }
}

loadPersistedSignedCache()

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
  persistSignedCache()
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

export function readCachedSignedAssetUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (!requiresSignedAssetUrl(path)) return resolveAssetUrl(path)
  if (isAlreadySignedAssetPath(path)) return resolveAssetUrl(path)

  const normalized = normalizeUploadPath(path)
  const cached = signedCache.get(normalized)
  if (cached && isSignedCacheEntryValid(cached)) {
    return resolveAssetUrl(cached)
  }
  return ''
}

/** Returns a URL that works for cross-origin <img> tags (adds HMAC sig query params when needed). */
export async function ensureSignedAssetUrl(path: string | null | undefined): Promise<string> {
  if (!path) return ''
  if (!requiresSignedAssetUrl(path)) return resolveAssetUrl(path)
  if (isAlreadySignedAssetPath(path)) return resolveAssetUrl(path)

  const normalized = normalizeUploadPath(path)
  const cached = signedCache.get(normalized)
  if (cached && isSignedCacheEntryValid(cached)) {
    return resolveAssetUrl(cached)
  }

  pendingPaths.add(normalized)
  await scheduleSignBatch()

  const signed = signedCache.get(normalized)
  return signed && isSignedCacheEntryValid(signed) ? resolveAssetUrl(signed) : ''
}

function resolvedUrlForPath(path: string): string {
  return readCachedSignedAssetUrl(path) || resolveAssetUrl(path)
}

/** Eagerly sign and browser-prefetch document images (call when document list arrives). */
export async function prefetchSignedAssetUrls(paths: (string | null | undefined)[]): Promise<void> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))]
  if (unique.length === 0) return

  const needSign: string[] = []
  for (const path of unique) {
    if (!requiresSignedAssetUrl(path)) continue
    const normalized = normalizeUploadPath(path)
    const cached = signedCache.get(normalized)
    if (!cached || !isSignedCacheEntryValid(cached)) {
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
