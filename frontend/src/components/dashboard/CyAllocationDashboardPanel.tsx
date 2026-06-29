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
import type { CyAllocation } from '../../services/api'
import { cyUtilizationPctByCount, getCapacityDisplayLabel } from '../../utils/cyAllocation'

const primaryDark = '#0B3D91'

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

function YardCapacityRow({ row }: { row: CyAllocation }) {
  const pct = cyUtilizationPctByCount(row.preAdvisedCount, row.contractCount)
  const sizeChips = row.breakdown.filter((r) => r.contractCount > 0)

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: row.hasCapacity ? 'rgba(46, 125, 50, 0.25)' : 'rgba(211, 47, 47, 0.25)',
        bgcolor: row.hasCapacity ? 'rgba(46, 125, 50, 0.03)' : 'rgba(211, 47, 47, 0.03)',
        minWidth: 0,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1, sm: 1.25, md: 1.5 },
          px: { xs: 1.25, sm: 1.5 },
          py: { xs: 1.25, sm: 1.5 },
          flexWrap: 'nowrap',
          minWidth: { xs: 520, sm: 'auto' },
        }}
      >
      <Box
        sx={{
          flex: '0 0 auto',
          minWidth: { xs: 88, sm: 100, md: 120 },
          maxWidth: 160,
        }}
      >
        <Typography
          sx={{
            fontWeight: 700,
            color: primaryDark,
            lineHeight: 1.25,
            fontSize: { xs: '0.9rem', sm: '0.95rem' },
          }}
        >
          {row.depotName}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: 'block',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: { xs: 'normal', lg: 'nowrap' },
          }}
        >
          {row.depotAddress}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'nowrap',
          gap: 0.5,
          flex: '0 0 auto',
          alignItems: 'center',
        }}
      >
        {sizeChips.map((r) => (
          <Chip
            key={r.sizeLabel}
            size="small"
            label={`${getCapacityDisplayLabel(r.sizeLabel)}: ${r.availableCount}/${r.contractCount}`}
            variant="outlined"
            sx={{
              fontWeight: 600,
              height: 26,
              '& .MuiChip-label': { px: 1, fontSize: '0.75rem' },
            }}
          />
        ))}
      </Box>

      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          flex: '0 0 auto',
          whiteSpace: 'nowrap',
          fontSize: { xs: '0.75rem', sm: '0.875rem' },
          lineHeight: 1.35,
        }}
      >
        <Box component="span" sx={{ color: '#2E7D32' }}>
          {row.availableCount} avail
        </Box>
        {' · '}
        <Box component="span" sx={{ color: '#ED6C02' }}>
          {row.preAdvisedCount} pre-forecasted
        </Box>
        {' · '}
        <Box component="span" sx={{ color: '#6A1B9A' }}>
          {row.bookingCount} booking
        </Box>
      </Typography>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          flex: { xs: '0 0 72px', sm: '1 1 100px' },
          minWidth: { xs: 72, sm: 100 },
          maxWidth: 140,
        }}
      >
        <LinearProgress
          variant="determinate"
          value={pct}
          color={pct >= 90 ? 'error' : pct >= 70 ? 'warning' : 'primary'}
          sx={{ flex: 1, height: 6, borderRadius: 3 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, flexShrink: 0 }}>
          {pct}%
        </Typography>
      </Box>

      <Chip
        size="small"
        label={row.hasCapacity ? 'Space available' : 'Limited capacity'}
        color={row.hasCapacity ? 'success' : 'error'}
        sx={{
          fontWeight: 600,
          flexShrink: 0,
          height: 26,
          '& .MuiChip-label': { px: 1, fontSize: '0.75rem' },
        }}
      />
      </Box>
    </Box>
  )
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

  const totalContract = items.reduce((sum, i) => sum + i.contractCount, 0)
  const totalPreAdvised = items.reduce((sum, i) => sum + i.preAdvisedCount, 0)
  const totalBooking = items.reduce((sum, i) => sum + i.bookingCount, 0)
  const totalAvailable = items.reduce((sum, i) => sum + i.availableCount, 0)
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
            Container slots by yard — pre-forecasted · booking (see full view for size/type breakdown).
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
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(3, minmax(0, 1fr))',
            md: 'repeat(5, minmax(0, 1fr))',
          },
          gap: { xs: 1, sm: 1.5 },
          mb: 2,
        }}
      >
        <SummaryPill label="Available slots" value={String(totalAvailable)} color="#2E7D32" />
        <SummaryPill label="Pre-advised" value={String(totalPreAdvised)} color="#ED6C02" />
        <SummaryPill label="Booking" value={String(totalBooking)} color="#6A1B9A" />
        <SummaryPill label="Contract slots" value={String(totalContract)} color={primaryDark} />
        <SummaryPill label="Yards with space" value={`${yardsWithSpace}/${items.length}`} color="#0088B5" />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {items.map((row) => (
          <YardCapacityRow key={row.depotId} row={row} />
        ))}
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
