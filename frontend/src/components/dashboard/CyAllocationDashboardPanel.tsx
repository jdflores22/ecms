import {
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Typography,
} from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined'
import { Link as RouterLink } from 'react-router-dom'
import CyAllocationBreakdownGrid from '../evaluations/CyAllocationBreakdownGrid'
import type { CyAllocation } from '../../services/api'

const primaryDark = '#0B3D91'

function utilizationPct(used: number, contract: number) {
  if (contract <= 0) return 0
  return Math.min(100, Math.round((used / contract) * 100))
}

interface CyAllocationDashboardPanelProps {
  items: CyAllocation[]
}

const panelPaperSx = {
  p: { xs: 1.5, sm: 2.5 },
  mb: 3,
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: '#fff',
  boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
  minWidth: 0,
  overflow: 'hidden',
}

export default function CyAllocationDashboardPanel({ items }: CyAllocationDashboardPanelProps) {
  if (items.length === 0) {
    return (
      <Paper elevation={0} sx={panelPaperSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <WarehouseOutlinedIcon sx={{ color: primaryDark, flexShrink: 0 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            CY contract capacity
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          No container yard contracts are configured for your shipping line yet.
        </Typography>
      </Paper>
    )
  }

  const totalContract = items.reduce((sum, i) => sum + i.contractTeu, 0)
  const totalUsed = items.reduce((sum, i) => sum + i.usedTeu, 0)
  const totalAvailable = items.reduce((sum, i) => sum + i.availableTeu, 0)
  const yardsWithSpace = items.filter((i) => i.hasCapacity).length

  return (
    <Paper elevation={0} sx={panelPaperSx}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'flex-start' },
          justifyContent: 'space-between',
          gap: 1.5,
          mb: 2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <WarehouseOutlinedIcon sx={{ color: primaryDark, flexShrink: 0 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              CY contract capacity
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            TEU space across your container yards. Check usage before approving a pre-advice.
          </Typography>
        </Box>
        <Button
          component={RouterLink}
          to="/evaluations/cy-allocation"
          variant="outlined"
          size="small"
          fullWidth
          endIcon={<ArrowForwardIcon />}
          sx={{
            fontWeight: 600,
            borderRadius: 2,
            flexShrink: 0,
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          Full view
        </Button>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, 1fr)' },
          gap: { xs: 1, sm: 1.5 },
          mb: 2,
        }}
      >
        <SummaryPill label="Available TEU" value={totalAvailable.toFixed(1)} color="#2E7D32" />
        <SummaryPill label="Used TEU" value={totalUsed.toFixed(1)} color="#ED6C02" />
        <SummaryPill label="Contract TEU" value={String(totalContract)} color={primaryDark} />
        <SummaryPill label="Yards with space" value={`${yardsWithSpace}/${items.length}`} color="#0088B5" />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 } }}>
        {items.map((row) => {
          const pct = utilizationPct(row.usedTeu, row.contractTeu)
          return (
            <Box
              key={row.depotId}
              sx={{
                p: { xs: 1.25, sm: 2 },
                borderRadius: 2,
                border: '1px solid',
                borderColor: row.hasCapacity ? 'rgba(46, 125, 50, 0.25)' : 'rgba(211, 47, 47, 0.25)',
                bgcolor: row.hasCapacity ? 'rgba(46, 125, 50, 0.03)' : 'rgba(211, 47, 47, 0.03)',
                minWidth: 0,
              }}
            >
              {/* Mobile: title + chip on one row, metrics in 2 columns */}
              <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 1.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, color: primaryDark, lineHeight: 1.3 }}>
                      {row.depotName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {row.depotAddress}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={row.hasCapacity ? 'Available' : 'Limited'}
                    color={row.hasCapacity ? 'success' : 'error'}
                    sx={{ fontWeight: 600, flexShrink: 0, height: 24, '& .MuiChip-label': { px: 1, fontSize: '0.7rem' } }}
                  />
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
                  <MetricLine
                    primary={`${row.availableTeu.toFixed(1)} TEU free`}
                    secondary={`${row.usedTeu.toFixed(1)}/${row.contractTeu} used`}
                    compact
                  />
                  <MetricLine
                    primary={`${row.activeReturns} returns`}
                    secondary={`${pct}% used`}
                    compact
                  />
                </Box>
              </Box>

              {/* Desktop: single horizontal row */}
              <Box
                sx={{
                  display: { xs: 'none', md: 'flex' },
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 2,
                  mb: 1.25,
                }}
              >
                <Box sx={{ flex: '1 1 160px', minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, color: primaryDark }}>
                    {row.depotName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {row.depotAddress}
                  </Typography>
                </Box>

                <Chip
                  size="small"
                  label={row.hasCapacity ? 'Space available' : 'Limited capacity'}
                  color={row.hasCapacity ? 'success' : 'error'}
                  sx={{
                    fontWeight: 600,
                    flexShrink: 0,
                    height: 'auto',
                    '& .MuiChip-label': { whiteSpace: 'nowrap', py: 0.5 },
                  }}
                />

                <Box sx={{ display: 'flex', gap: 2.5, flexShrink: 0, ml: 'auto' }}>
                  <MetricLine
                    primary={`${row.availableTeu.toFixed(1)} TEU free`}
                    secondary={`${row.usedTeu.toFixed(1)} / ${row.contractTeu} used`}
                    align="right"
                  />
                  <MetricLine
                    primary={`${row.activeReturns} active return${row.activeReturns === 1 ? '' : 's'}`}
                    secondary={`${pct}% utilized`}
                    align="right"
                  />
                </Box>
              </Box>

              <LinearProgress
                variant="determinate"
                value={pct}
                color={pct >= 90 ? 'error' : pct >= 70 ? 'warning' : 'primary'}
                sx={{ height: 8, borderRadius: 4, mb: row.breakdown?.length ? 1.5 : 0 }}
              />

              {row.breakdown && row.breakdown.length > 0 && (
                <CyAllocationBreakdownGrid rows={row.breakdown} compact />
              )}
            </Box>
          )
        })}
      </Box>
    </Paper>
  )
}

function SummaryPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Box
      sx={{
        p: { xs: 1.25, sm: 1.5 },
        borderRadius: 2,
        bgcolor: 'rgba(11, 61, 145, 0.04)',
        border: '1px solid',
        borderColor: 'divider',
        minWidth: 0,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, display: 'block', lineHeight: 1.3, wordBreak: 'break-word' }}
      >
        {label}
      </Typography>
      <Typography
        variant="h6"
        sx={{ fontWeight: 800, color, lineHeight: 1.2, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
      >
        {value}
      </Typography>
    </Box>
  )
}

function MetricLine({
  primary,
  secondary,
  align = 'left',
  compact = false,
}: {
  primary: string
  secondary: string
  align?: 'left' | 'right'
  compact?: boolean
}) {
  return (
    <Box sx={{ minWidth: 0, textAlign: compact ? 'left' : { xs: 'left', md: align } }}>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          fontSize: compact ? '0.8125rem' : undefined,
          lineHeight: 1.3,
          wordBreak: 'break-word',
          whiteSpace: compact ? 'normal' : { md: 'nowrap' },
        }}
      >
        {primary}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          wordBreak: 'break-word',
          whiteSpace: compact ? 'normal' : { md: 'nowrap' },
          display: 'block',
        }}
      >
        {secondary}
      </Typography>
    </Box>
  )
}
