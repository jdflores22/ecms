/** Warm DNS/TLS to the API host before the first XHR (production direct-to-Railway). */
export function installApiPreconnect() {
  const apiBase = import.meta.env.VITE_API_BASE_URL
  if (!apiBase?.startsWith('http')) return

  const origin = apiBase.replace(/\/api\/?$/, '')
  if (!origin || document.querySelector(`link[data-ecms-api-preconnect="${origin}"]`)) return

  const mark = (link: HTMLLinkElement) => {
    link.dataset.ecmsApiPreconnect = origin
  }

  const dns = document.createElement('link')
  dns.rel = 'dns-prefetch'
  dns.href = origin
  mark(dns)
  document.head.appendChild(dns)

  const preconnect = document.createElement('link')
  preconnect.rel = 'preconnect'
  preconnect.href = origin
  preconnect.crossOrigin = 'anonymous'
  mark(preconnect)
  document.head.appendChild(preconnect)
}
