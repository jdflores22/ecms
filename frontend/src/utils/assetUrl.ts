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
    return `${origin}${normalized}`
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
