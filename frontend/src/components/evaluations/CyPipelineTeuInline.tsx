import { Box } from '@mui/material'

/** CY allocation pipeline colors — at-yard vs confirmed vs pre-forecast. */
export const CY_PIPELINE_COLORS = {
  atYard: '#0B3D91',
  confirmed: '#0288D1',
  preForecast: '#C2410C',
} as const

interface CyPipelineTeuInlineProps {
  confirmedTeu: number
  preForecastTeu: number
  /** hero = yard card header; inline = size rows; caption = compact footnotes */
  variant?: 'hero' | 'inline' | 'caption'
}

function pipelinePillSx(color: string, compact: boolean) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    px: compact ? 0.65 : 0.85,
    py: compact ? 0.1 : 0.2,
    borderRadius: 1,
    fontSize: compact ? '0.625rem' : '0.6875rem',
    fontWeight: 700,
    lineHeight: 1.35,
    bgcolor: `${color}14`,
    color,
    border: `1px solid ${color}33`,
    whiteSpace: 'nowrap',
  } as const
}

export default function CyPipelineTeuInline({
  confirmedTeu,
  preForecastTeu,
  variant = 'inline',
}: CyPipelineTeuInlineProps) {
  const confirmed = Math.round(confirmedTeu)
  const preForecast = Math.round(preForecastTeu)
  if (confirmed <= 0 && preForecast <= 0) return null

  const compact = variant === 'caption'

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: compact ? 0.35 : 0.5,
        mt: variant === 'hero' ? 0.75 : variant === 'inline' ? 0.5 : 0.35,
      }}
    >
      {confirmed > 0 && (
        <Box component="span" sx={pipelinePillSx(CY_PIPELINE_COLORS.confirmed, compact)}>
          +{confirmed} confirmed
        </Box>
      )}
      {preForecast > 0 && (
        <Box component="span" sx={pipelinePillSx(CY_PIPELINE_COLORS.preForecast, compact)}>
          +{preForecast} pre-forecast
        </Box>
      )}
    </Box>
  )
}
