import { Box, type SxProps, type Theme } from '@mui/material'
import { useAssetUrlState } from '../../hooks/useAssetUrl'
import { AssetPreviewSkeleton } from './SkeletonPrimitives'

interface AssetImageProps {
  path: string | null | undefined
  alt: string
  sx?: SxProps<Theme>
  skeletonHeight?: number
  skeletonMaxHeight?: number
  onClick?: () => void
}

/** Renders an image from an asset path with skeleton while the URL resolves. */
export default function AssetImage({
  path,
  alt,
  sx,
  skeletonHeight = 320,
  skeletonMaxHeight,
  onClick,
}: AssetImageProps) {
  const { url, loading } = useAssetUrlState(path)

  if (!path) return null

  if (loading || !url) {
    return <AssetPreviewSkeleton height={skeletonHeight} maxHeight={skeletonMaxHeight} />
  }

  return (
    <Box
      component="img"
      src={url}
      alt={alt}
      onClick={onClick}
      sx={onClick ? { cursor: 'pointer', ...sx } : sx}
    />
  )
}
