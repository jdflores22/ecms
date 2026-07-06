import { Box, Chip, LinearProgress, Paper, Typography } from '@mui/material'
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined'
import { hexToRgba, ICS_PRIMARY } from '../layout/DetailPagePrimitives'
import type { CyAllocation } from '../../services/api'
import {
  breakdownBookingTeu,
  breakdownContractTeu,
  breakdownUsedTeu,
  cyUtilizationPctCapped,
  depotMonogram,
  formatUtilizationPctLabel,
  getAllocationReturnsLabel,
  getAllocationSizeLabel,
  getGroupBreakdownRow,
  progressBarColor,
} from '../../utils/cyAllocation'

interface CyYardAllocationCardProps {
  allocation: CyAllocation
  shippingLineCode: string
  shippingLineName: string
}

const primaryDark = ICS_PRIMARY

function UtilizationRow({
  label,
  usedTeu,
  limitTeu,
  pendingTeu = 0,
  atLimit = false,
}: {
  label: string
  usedTeu: number
  limitTeu: number
  pendingTeu?: number
  atLimit?: boolean
}) {
  if (limitTeu <= 0) return null
  const pct = cyUtilizationPctCapped(usedTeu, limitTeu)
  const over = usedTeu > limitTeu

  return (
    <Box sx={{ mb: 1.75 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {label}
          </Typography>
          {atLimit && (
            <Chip
              label="AT LIMIT"
              size="small"
              sx={{
                height: 20,
                fontWeight: 800,
                fontSize: '0.65rem',
                bgcolor: '#FFEBEE',
                color: '#C62828',
              }}
            />
          )}
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 700, color: over ? '#C62828' : 'text.primary' }}>
          {formatUtilizationPctLabel(usedTeu, limitTeu)}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ mb: 0.75 }}>
        <Box component="span" sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
          {usedTeu}
        </Box>
        {pendingTeu > 0 && (
          <Box component="span" sx={{ color: '#ED6C02', fontWeight: 600, ml: 0.5 }}>
            +{pendingTeu} pending
          </Box>
        )}
        <Box component="span" color="text.secondary">
          {' '}
          / {limitTeu} TEU
        </Box>
      </Typography>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: hexToRgba(primaryDark, 0.08),
          '& .MuiLinearProgress-bar': {
            bgcolor: over ? '#D32F2F' : progressBarColor(pct),
            borderRadius: 4,
          },
        }}
      />
    </Box>
  )
}

export default function CyYardAllocationCard({
  allocation,
  shippingLineCode,
  shippingLineName,
}: CyYardAllocationCardProps) {
  const row20 = getGroupBreakdownRow(allocation, '20')
  const row40 = getGroupBreakdownRow(allocation, '40')
  const teuUsed = Math.round(allocation.preAdvisedTeu)
  const teuLimit = allocation.contractTeu
  const teuUsed20 = breakdownUsedTeu(row20)
  const teuUsed40 = breakdownUsedTeu(row40)
  const teuLimit20 = breakdownContractTeu(row20)
  const teuLimit40 = breakdownContractTeu(row40)
  const teuPct = cyUtilizationPctCapped(teuUsed, teuLimit)
  const teuOver = teuLimit > 0 && teuUsed > teuLimit

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: teuOver ? '#EF5350' : 'divider',
        bgcolor: '#fff',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          px: 2.5,
          pt: 2,
          pb: 1.5,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', lineHeight: 1.1 }}>
            {depotMonogram(allocation.depotName)}
          </Typography>
          <Typography sx={{ mt: 0.5, color: 'text.secondary', fontWeight: 500 }}>
            {allocation.depotName}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary', fontWeight: 600 }}>
            {shippingLineCode} · {shippingLineName}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: '#FAFBFC',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <WarehouseOutlinedIcon sx={{ color: '#78909C' }} />
        </Box>
      </Box>

      <Box sx={{ px: 2.5, py: 2, flex: 1, borderTop: '1px solid', borderColor: '#EEF1F4' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.06em' }}>
          YARD UTILIZATION
        </Typography>

        <Box sx={{ mt: 1.25, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.75 }}>
            <Typography sx={{ fontWeight: 800 }}>
              <Box component="span" sx={{ fontSize: '1.5rem' }}>
                {teuUsed}
              </Box>
              <Typography component="span" color="text.secondary" sx={{ fontWeight: 600 }}>
                {' '}
                / {teuLimit} TEU
              </Typography>
            </Typography>
            <Typography sx={{ fontWeight: 800, color: teuOver ? '#C62828' : 'text.primary' }}>
              {formatUtilizationPctLabel(teuUsed, teuLimit)}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={teuPct}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: hexToRgba(primaryDark, 0.08),
              '& .MuiLinearProgress-bar': {
                bgcolor: teuOver ? '#D32F2F' : progressBarColor(teuPct),
                borderRadius: 5,
              },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {getAllocationSizeLabel('20')}: {teuUsed20} TEU
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {getAllocationSizeLabel('40')}: {teuUsed40} TEU
            </Typography>
          </Box>
        </Box>

        {row20 && (
          <UtilizationRow
            label={getAllocationReturnsLabel('20')}
            usedTeu={teuUsed20}
            limitTeu={teuLimit20}
            pendingTeu={breakdownBookingTeu(row20)}
            atLimit={teuLimit20 > 0 && teuUsed20 >= teuLimit20}
          />
        )}
        {row40 && (
          <UtilizationRow
            label={getAllocationReturnsLabel('40')}
            usedTeu={teuUsed40}
            limitTeu={teuLimit40}
            pendingTeu={breakdownBookingTeu(row40)}
            atLimit={teuLimit40 > 0 && teuUsed40 >= teuLimit40}
          />
        )}
      </Box>

      <Box sx={{ px: 2.5, py: 1.25, borderTop: '1px solid', borderColor: '#EEF1F4' }}>
        <Chip
          size="small"
          label={allocation.hasCapacity ? 'Space available' : 'At or over contract limit'}
          color={allocation.hasCapacity ? 'success' : 'error'}
          sx={{ fontWeight: 700 }}
        />
      </Box>
    </Paper>
  )
}
