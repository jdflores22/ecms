import { useEffect, useMemo, useState } from 'react'
import { ensureSignedAssetUrl, resolveAssetUrl } from '../utils/assetUrl'

export function useAssetUrl(path: string | null | undefined): string {
  const [url, setUrl] = useState(() => {
    if (!path) return ''
    return resolveAssetUrl(path)
  })

  useEffect(() => {
    if (!path) {
      setUrl('')
      return undefined
    }

    let cancelled = false
    ensureSignedAssetUrl(path)
      .then((signed) => {
        if (!cancelled) setUrl(signed)
      })
      .catch(() => {
        if (!cancelled) setUrl(resolveAssetUrl(path))
      })

    return () => {
      cancelled = true
    }
  }, [path])

  return url
}

export function useAssetUrls(paths: (string | null | undefined)[]): Record<string, string> {
  const key = useMemo(
    () =>
      [...new Set(paths.filter((p): p is string => Boolean(p)))].sort().join('\0'),
    [paths],
  )
  const [urls, setUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    const unique = key ? key.split('\0') : []
    if (unique.length === 0) {
      setUrls({})
      return undefined
    }

    let cancelled = false
    Promise.all(
      unique.map(async (path) => [path, await ensureSignedAssetUrl(path)] as const),
    )
      .then((entries) => {
        if (!cancelled) setUrls(Object.fromEntries(entries))
      })
      .catch(() => {
        if (!cancelled) {
          setUrls(Object.fromEntries(unique.map((path) => [path, resolveAssetUrl(path)])))
        }
      })

    return () => {
      cancelled = true
    }
  }, [key])

  return urls
}
