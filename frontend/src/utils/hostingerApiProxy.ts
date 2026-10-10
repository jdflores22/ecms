/** Hostinger CDN only forwards explicit .php files; route API calls through ecms-api-proxy.php. */
export const USE_HOSTINGER_API_PROXY = import.meta.env.VITE_USE_HOSTINGER_API_PROXY === 'true'

/** Hostinger often blocks `%2F` in query strings; use `:` instead of `/` in ecms_path. */
export function toHostingerProxyUrl(ecmsPath: string): string {
  const path = ecmsPath.replace(/^\//, '').replace(/\//g, ':')
  return `/ecms-api-proxy.php?ecms_path=${encodeURIComponent(path)}`
}

/** Map /uploads paths (or http:// VPS upload URLs) to same-origin HTTPS proxy — fixes mixed content on Hostinger. */
export function proxiedUploadAssetUrl(pathOrUrl: string): string {
  if (!pathOrUrl || !USE_HOSTINGER_API_PROXY) return pathOrUrl
  if (pathOrUrl.startsWith('data:') || pathOrUrl.startsWith('blob:')) return pathOrUrl

  let pathname = ''
  let search = ''

  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    try {
      const u = new URL(pathOrUrl)
      if (!u.pathname.startsWith('/uploads/')) return pathOrUrl
      pathname = u.pathname
      search = u.search ? u.search.substring(1) : ''
    } catch {
      return pathOrUrl
    }
  } else {
    const parts = pathOrUrl.split('?')
    pathname = parts[0].startsWith('/') ? parts[0] : `/${parts[0]}`
    search = parts[1] || ''
    if (!pathname.startsWith('/uploads/')) return pathOrUrl
  }

  const onHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const insecureAbsolute = pathOrUrl.startsWith('http://')
  if (!onHttps && !insecureAbsolute) return pathOrUrl

  const ecmsPath = pathname.replace(/^\//, '').replace(/\//g, ':')
  const proxy = toHostingerProxyUrl(ecmsPath)
  return search ? `${proxy}&${search}` : proxy
}

export function applyHostingerProxyRequest(config: { baseURL?: string; url?: string }) {
  if (!USE_HOSTINGER_API_PROXY) return

  const url = config.url ?? ''
  if (!url || url.startsWith('/ecms-api-proxy.php')) return

  const path = url.replace(/^\//, '')
  config.baseURL = ''
  config.url = toHostingerProxyUrl(`api/${path}`)
}

/** Axios defaults to application/json; FormData must set multipart boundary in the browser. */
export function prepareFormDataUploadHeaders(
  config: { data?: unknown; headers?: unknown },
): void {
  if (typeof FormData === 'undefined' || !(config.data instanceof FormData)) return
  const headers = config.headers as
    | { delete?: (name: string) => void; set?: (name: string, value: string) => void }
    | Record<string, unknown>
    | undefined
  if (!headers) return
  if (typeof headers.delete === 'function') {
    headers.delete('Content-Type')
    headers.delete('content-type')
    return
  }
  const plain = headers as Record<string, unknown>
  delete plain['Content-Type']
  delete plain['content-type']
}
