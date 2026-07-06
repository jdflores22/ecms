import { useEffect, useMemo, useState } from 'react'
import { ensureSignedAssetUrl, isCrossOriginAssetUrl, resolveAssetUrl, warmAssetImages } from '../utils/assetUrl'

function initialAssetUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (isCrossOriginAssetUrl(path)) return ''
  return resolveAssetUrl(path)
}

function initialAssetLoading(path: string | null | undefined): boolean {
  return Boolean(path && isCrossOriginAssetUrl(path))
}

export function useAssetUrlState(path: string | null | undefined): { url: string; loading: boolean } {
  const [url, setUrl] = useState(() => initialAssetUrl(path))
  const [loading, setLoading] = useState(() => initialAssetLoading(path))

  useEffect(() => {
    if (!path) {
      setUrl('')
      setLoading(false)
      return undefined
    }

    if (!isCrossOriginAssetUrl(path)) {
      setUrl(resolveAssetUrl(path))
      setLoading(false)
      return undefined
    }

    let cancelled = false
    setLoading(true)
    setUrl('')
    ensureSignedAssetUrl(path)
      .then((signed) => {
        if (!cancelled) {
          setUrl(signed)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUrl('')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [path])

  return { url, loading }
}

export function useAssetUrl(path: string | null | undefined): string {
  return useAssetUrlState(path).url
}

export function useAssetUrls(paths: (string | null | undefined)[]): Record<string, string> {
  return useAssetUrlsState(paths).urls
}

export function useAssetUrlsState(paths: (string | null | undefined)[]): {
  urls: Record<string, string>
  loading: boolean
} {
  const key = useMemo(
    () =>
      [...new Set(paths.filter((p): p is string => Boolean(p)))].sort().join('\0'),
    [paths],
  )
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const unique = key ? key.split('\0') : []
    if (unique.length === 0) {
      setUrls({})
      setLoading(false)
      return undefined
    }

    const sameOrigin: Record<string, string> = {}
    const crossOrigin: string[] = []
    for (const path of unique) {
      if (isCrossOriginAssetUrl(path)) crossOrigin.push(path)
      else sameOrigin[path] = resolveAssetUrl(path)
    }
    setUrls(sameOrigin)
    setLoading(crossOrigin.length > 0)

    if (crossOrigin.length === 0) return undefined

    let cancelled = false
    Promise.all(
      crossOrigin.map(async (path) => [path, await ensureSignedAssetUrl(path)] as const),
    )
      .then((entries) => {
        if (!cancelled) {
          const resolved = Object.fromEntries(entries.filter(([, signed]) => Boolean(signed)))
          setUrls((prev) => ({ ...prev, ...resolved }))
          warmAssetImages(Object.values(resolved))
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [key])

  return { urls, loading }
}
