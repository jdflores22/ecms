import { Box, Chip, LinearProgress, Paper, Typography } from '@mui/material'
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined'
import { hexToRgba, ICS_PRIMARY } from '../layout/DetailPagePrimitives'
import type { CyAllocation } from '../../services/api'
import {
  breakdownAtYardTeu,
  breakdownCommittedTeu,
  breakdownConfirmedTeu,
  breakdownContractTeu,
  breakdownPreForecastTeu,
  cyUtilizationPctCapped,
  depotMonogram,
  formatCyPipelineTeuSuffix,
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

function PipelineRow({
  label,
  atYardTeu,
  confirmedTeu,
  preForecastTeu,
  limitTeu,
  atLimit = false,
}: {
  label: string
  atYardTeu: number
  confirmedTeu: number
  preForecastTeu: number
  limitTeu: number
  atLimit?: boolean
}) {
  if (limitTeu <= 0) return null

  const committedTeu = atYardTeu + confirmedTeu + preForecastTeu
  const pct = cyUtilizationPctCapped(committedTeu, limitTeu)
  const over = committedTeu > limitTeu
  const pipelineSuffix = formatCyPipelineTeuSuffix(confirmedTeu, preForecastTeu)

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
          {formatUtilizationPctLabel(committedTeu, limitTeu)}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ mb: 0.75 }}>
        <Box component="span" sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
          {atYardTeu}
        </Box>
        {pipelineSuffix && (
          <Box component="span" sx={{ color: '#ED6C02', fontWeight: 600, ml: 0.5 }}>
            {pipelineSuffix}
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
  const teuAtYard = Math.round(allocation.atYardTeu)
  const teuConfirmed = Math.round(allocation.confirmedTeu)
  const teuPreForecast = Math.round(allocation.preForecastTeu)
  const teuCommitted = Math.round(allocation.preAdvisedTeu)
  const teuLimit = allocation.contractTeu
  const teuAtYard20 = breakdownAtYardTeu(row20)
  const teuAtYard40 = breakdownAtYardTeu(row40)
  const teuLimit20 = breakdownContractTeu(row20)
  const teuLimit40 = breakdownContractTeu(row40)
  const teuPct = cyUtilizationPctCapped(teuCommitted, teuLimit)
  const teuOver = teuLimit > 0 && teuCommitted > teuLimit
  const pipelineSuffix = formatCyPipelineTeuSuffix(teuConfirmed, teuPreForecast)

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
                {teuAtYard}
              </Box>
              {pipelineSuffix && (
                <Box component="span" sx={{ color: '#ED6C02', fontWeight: 700, fontSize: '0.95rem', ml: 0.75 }}>
                  {pipelineSuffix}
                </Box>
              )}
              <Typography component="span" color="text.secondary" sx={{ fontWeight: 600 }}>
                {' '}
                / {teuLimit} TEU
              </Typography>
            </Typography>
            <Typography sx={{ fontWeight: 800, color: teuOver ? '#C62828' : 'text.primary' }}>
              {formatUtilizationPctLabel(teuCommitted, teuLimit)}
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
              {getAllocationSizeLabel('20')}: {teuAtYard20} TEU
              {formatCyPipelineTeuSuffix(breakdownConfirmedTeu(row20), breakdownPreForecastTeu(row20))
                ? ` (${formatCyPipelineTeuSuffix(breakdownConfirmedTeu(row20), breakdownPreForecastTeu(row20))})`
                : ''}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {getAllocationSizeLabel('40')}: {teuAtYard40} TEU
              {formatCyPipelineTeuSuffix(breakdownConfirmedTeu(row40), breakdownPreForecastTeu(row40))
                ? ` (${formatCyPipelineTeuSuffix(breakdownConfirmedTeu(row40), breakdownPreForecastTeu(row40))})`
                : ''}
            </Typography>
          </Box>
        </Box>

        {row20 && (
          <PipelineRow
            label={getAllocationReturnsLabel('20')}
            atYardTeu={breakdownAtYardTeu(row20)}
            confirmedTeu={breakdownConfirmedTeu(row20)}
            preForecastTeu={breakdownPreForecastTeu(row20)}
            limitTeu={teuLimit20}
            atLimit={teuLimit20 > 0 && breakdownCommittedTeu(row20) >= teuLimit20}
          />
        )}
        {row40 && (
          <PipelineRow
            label={getAllocationReturnsLabel('40')}
            atYardTeu={breakdownAtYardTeu(row40)}
            confirmedTeu={breakdownConfirmedTeu(row40)}
            preForecastTeu={breakdownPreForecastTeu(row40)}
            limitTeu={teuLimit40}
            atLimit={teuLimit40 > 0 && breakdownCommittedTeu(row40) >= teuLimit40}
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
