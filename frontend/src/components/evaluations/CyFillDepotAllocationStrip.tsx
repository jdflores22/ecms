import { Box, Chip, LinearProgress, Typography } from '@mui/material'
import type { CyAllocation } from '../../services/api'
import {
  cyUtilizationPctCapped,
  formatUtilizationPctLabel,
  progressBarColor,
} from '../../utils/cyAllocation'
import { hexToRgba, ICS_PRIMARY } from '../layout/DetailPagePrimitives'
import CyPipelineTeuInline, { CY_PIPELINE_COLORS } from './CyPipelineTeuInline'

const primaryDark = ICS_PRIMARY

interface CyFillDepotAllocationStripProps {
  allocation?: CyAllocation
}

export default function CyFillDepotAllocationStrip({ allocation }: CyFillDepotAllocationStripProps) {
  if (!allocation) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
        No contract allocation on file.
      </Typography>
    )
  }

  const atYard = Math.round(allocation.atYardTeu)
  const confirmed = Math.round(allocation.confirmedTeu)
  const preForecast = Math.round(allocation.preForecastTeu)
  const committed = Math.round(allocation.preAdvisedTeu)
  const limit = allocation.contractTeu
  const available = Math.round(allocation.availableTeu)
  const pct = cyUtilizationPctCapped(committed, limit)
  const over = limit > 0 && committed > limit

  return (
    <Box sx={{ width: '100%', mt: 0.75 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ lineHeight: 1.35 }}>
            <Box component="span" sx={{ fontWeight: 800, color: CY_PIPELINE_COLORS.atYard }}>
              {atYard}
            </Box>
            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600, ml: 0.5 }}>
              TEU at yard
            </Box>
            <Box component="span" sx={{ color: 'text.secondary', mx: 0.75 }}>·</Box>
            <Box component="span" sx={{ fontWeight: 700 }}>
              {available}
            </Box>
            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600, ml: 0.5 }}>
              TEU available
            </Box>
            <Box component="span" sx={{ color: 'text.secondary', mx: 0.75 }}>·</Box>
            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {limit} TEU contract
            </Box>
          </Typography>
          <CyPipelineTeuInline confirmedTeu={confirmed} preForecastTeu={preForecast} variant="inline" />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, color: over ? '#C62828' : 'text.primary', whiteSpace: 'nowrap' }}
          >
            {formatUtilizationPctLabel(committed, limit)}
          </Typography>
          <Chip
            size="small"
            label={allocation.hasCapacity ? 'Space available' : 'At limit'}
            color={allocation.hasCapacity ? 'success' : 'error'}
            sx={{ height: 22, fontWeight: 700, fontSize: '0.65rem' }}
          />
        </Box>
      </Box>
      {limit > 0 && (
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            mt: 0.75,
            height: 6,
            borderRadius: 3,
            bgcolor: hexToRgba(primaryDark, 0.08),
            '& .MuiLinearProgress-bar': {
              bgcolor: over ? '#D32F2F' : progressBarColor(pct),
              borderRadius: 3,
            },
          }}
        />
      )}
    </Box>
  )
}
