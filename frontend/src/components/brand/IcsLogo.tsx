import { Box } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import { ICS_BRAND } from '../../config/brandCopy'

type IcsLogoProps = {
  height?: number | { xs?: number; sm?: number; md?: number }
  maxWidth?: number | string | { xs?: number | string; sm?: number | string; md?: number | string }
  sx?: SxProps<Theme>
}

export default function IcsLogo({ height = 40, maxWidth = 160, sx }: IcsLogoProps) {
  return (
    <Box
      component="img"
      src={ICS_BRAND.logoSrc}
      alt={ICS_BRAND.logoAlt}
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
