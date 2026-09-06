/** Hostinger CDN only forwards explicit .php files; route API calls through ecms-api-proxy.php. */
export const USE_HOSTINGER_API_PROXY = import.meta.env.VITE_USE_HOSTINGER_API_PROXY === 'true'

export function toHostingerProxyUrl(ecmsPath: string): string {
  const path = ecmsPath.replace(/^\//, '')
  return `/ecms-api-proxy.php?ecms_path=${encodeURIComponent(path)}`
}

export function applyHostingerProxyRequest(config: { baseURL?: string; url?: string }) {
  if (!USE_HOSTINGER_API_PROXY) return

  const url = config.url ?? ''
  if (!url || url.startsWith('/ecms-api-proxy.php')) return

  const path = url.replace(/^\//, '')
  config.baseURL = ''
  config.url = toHostingerProxyUrl(`api/${path}`)
}
