import { Tooltip, Typography } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'

type TruncatedTooltipProps = {
  text: string
  maxWidth?: number | string
  mono?: boolean
  sx?: SxProps<Theme>
}

/** Single-line ellipsis with full text on hover. */
export default function TruncatedTooltip({ text, maxWidth = 160, mono, sx }: TruncatedTooltipProps) {
  const display = text?.trim() ? text : '—'
  if (display === '—') {
    return (
      <Typography component="span" variant="body2" color="text.secondary" sx={sx}>
        —
      </Typography>
    )
  }

  return (
    <Tooltip title={display} enterDelay={400}>
      <Typography
        component="span"
        variant="body2"
        sx={{
          display: 'block',
          maxWidth,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          ...(mono && { fontFamily: 'monospace' }),
          ...sx,
        }}
      >
        {display}
      </Typography>
    </Tooltip>
  )
}
