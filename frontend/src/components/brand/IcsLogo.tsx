import { Box } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import { useState } from 'react'
import { ICS_BRAND } from '../../config/brandCopy'

type IcsLogoProps = {
  height?: number | { xs?: number; sm?: number; md?: number }
  maxWidth?: number | string | { xs?: number | string; sm?: number | string; md?: number | string }
  sx?: SxProps<Theme>
}

export default function IcsLogo({ height = 40, maxWidth = 160, sx }: IcsLogoProps) {
  const [src, setSrc] = useState<string>(ICS_BRAND.logoSrc)

  return (
    <Box
      component="img"
      src={src}
      alt={ICS_BRAND.logoAlt}
      onError={() => {
        if (src !== ICS_BRAND.logoPngSrc) setSrc(ICS_BRAND.logoPngSrc)
      }}
      sx={{
        height,
        width: 'auto',
        maxWidth,
        display: 'block',
        objectFit: 'contain',
        flexShrink: 0,
        ...sx,
      }}
    />
  )
}
