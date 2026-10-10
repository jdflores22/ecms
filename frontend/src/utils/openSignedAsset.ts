import { ensureSignedAssetUrl } from './assetUrl'

export async function openSignedAsset(path: string | null | undefined): Promise<boolean> {
  const url = await ensureSignedAssetUrl(path)
  if (!url) return false
  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}
