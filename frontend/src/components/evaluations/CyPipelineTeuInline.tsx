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
  /** 'hero' for main yard total; 'inline' for size rows */
  variant?: 'hero' | 'inline' | 'caption'
}

export default function CyPipelineTeuInline({
  confirmedTeu,
  preForecastTeu,
  variant = 'inline',
}: CyPipelineTeuInlineProps) {
  const confirmed = Math.round(confirmedTeu)
  const preForecast = Math.round(preForecastTeu)
  if (confirmed <= 0 && preForecast <= 0) return null

  const fontSize = variant === 'hero' ? '0.8125rem' : variant === 'caption' ? '0.6875rem' : '0.75rem'

  return (
    <Box
      component="span"
      sx={{
        display: 'inline',
        ml: variant === 'hero' ? 0.75 : 0.35,
        fontSize,
        fontWeight: 600,
        lineHeight: 1.35,
        whiteSpace: 'normal',
      }}
    >
      {confirmed > 0 && (
        <Box component="span" sx={{ color: CY_PIPELINE_COLORS.confirmed, mr: preForecast > 0 ? 0.5 : 0 }}>
          +{confirmed} TEU confirmed
        </Box>
      )}
      {confirmed > 0 && preForecast > 0 && (
        <Box component="span" sx={{ color: 'text.disabled', mx: 0.35 }}>·</Box>
      )}
      {preForecast > 0 && (
        <Box component="span" sx={{ color: CY_PIPELINE_COLORS.preForecast }}>
          +{preForecast} TEU pre-forecast
        </Box>
      )}
    </Box>
  )
}
