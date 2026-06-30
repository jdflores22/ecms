import { ensureSignedAssetUrl } from './assetUrl'

export async function openSignedAsset(path: string | null | undefined) {
  const url = await ensureSignedAssetUrl(path)
  if (url) window.open(url, '_blank', 'noopener,noreferrer')
}
