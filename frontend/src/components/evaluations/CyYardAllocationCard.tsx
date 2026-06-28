import { Box, Chip, IconButton, LinearProgress, Paper, Switch, Typography } from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PowerSettingsNewOutlinedIcon from '@mui/icons-material/PowerSettingsNewOutlined'
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined'
import { hexToRgba, ICS_PRIMARY } from '../layout/DetailPagePrimitives'
import type { CyAllocation } from '../../services/api'
import type { CyAllocationEditMode } from './CyAllocationLimitEditDialog'
import {
  cyUtilizationPctUncapped,
  depotMonogram,
  getAllocationHoldLabel,
  getAllocationReturnsLabel,
  getAllocationSizeLabel,
  getGroupBreakdownRow,
  progressBarColor,
} from '../../utils/cyAllocation'

interface CyYardAllocationCardProps {
  allocation: CyAllocation
  shippingLineCode: string
  shippingLineName: string
  onEdit: (mode: CyAllocationEditMode) => void
}

const primaryDark = ICS_PRIMARY
const cardBorderOk = 'divider'
const cardBorderOver = '#EF5350'

function MetricProgressBar({ pct }: { pct: number }) {
  const color = progressBarColor(pct)
  return (
    <LinearProgress
      variant="determinate"
      value={Math.min(100, pct)}
      sx={{
        height: 12,
        borderRadius: 6,
        bgcolor: hexToRgba(primaryDark, 0.08),
        '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 6 },
      }}
    />
  )
}

function EditButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <IconButton
      size="small"
      aria-label={label}
      onClick={onClick}
      sx={{
        p: 0.25,
        ml: 0.5,
        color: 'text.secondary',
        '&:hover': { color: primaryDark, bgcolor: hexToRgba(primaryDark, 0.06) },
      }}
    >
      <EditOutlinedIcon sx={{ fontSize: 16 }} />
    </IconButton>
  )
}

function UnitLimitBlock({
  label,
  used,
  pending,
  limit,
  showAuto,
  onEdit,
}: {
  label: string
  used: number
  pending: number
  limit: number
  showAuto: boolean
  onEdit: () => void
}) {
  const pct = cyUtilizationPctUncapped(used, limit)
  const pctDisplay = Math.min(100, Math.round(pct))
  const over = limit > 0 && used >= limit

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.75 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {label}
        </Typography>
        {showAuto && (
          <Chip
            label="AUTO"
            size="small"
            sx={{
              ml: 1,
              height: 22,
              fontWeight: 800,
              fontSize: '0.68rem',
              bgcolor: '#FFEBEE',
              color: '#C62828',
              borderRadius: 1.5,
            }}
          />
        )}
        <EditButton onClick={onEdit} label={`Edit ${label}`} />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 0.75 }}>
        <Typography sx={{ fontWeight: 800, color: 'text.primary', fontSize: '1.05rem' }}>
          <Box component="span" sx={{ fontSize: '1.35rem' }}>
            {used}
          </Box>
          {pending > 0 && (
            <Box component="span" sx={{ color: '#ED6C02', fontWeight: 700, fontSize: '0.95rem' }}>
              {' '}
              +{pending} pending
            </Box>
          )}
          {' / '}
          {limit}
        </Typography>
        <Typography sx={{ fontWeight: 800, color: over ? '#C62828' : 'text.primary', fontSize: '1.05rem' }}>
          {pctDisplay}%
        </Typography>
      </Box>
      <MetricProgressBar pct={pct} />
    </Box>
  )
}

function HoldControlRow({ label, active, showAuto }: { label: string; active: boolean; showAuto?: boolean }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 0.75,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Switch
          size="small"
          checked={active}
          disabled
          sx={{
            ml: -0.5,
            '& .MuiSwitch-switchBase.Mui-checked': {
              color: '#EF5350',
              '& + .MuiSwitch-track': { bgcolor: '#FFCDD2', opacity: 1 },
            },
            '& .MuiSwitch-switchBase.Mui-checked.Mui-disabled': {
              color: '#EF5350',
            },
          }}
        />
        <Typography variant="body2" sx={{ fontWeight: 600, color: active ? '#EF5350' : 'text.primary' }}>
          {label}
        </Typography>
        {showAuto && (
          <Chip
            label="AUTO"
            size="small"
            sx={{
              height: 22,
              fontWeight: 800,
              fontSize: '0.68rem',
              bgcolor: '#FFEBEE',
              color: '#C62828',
              borderRadius: 1.5,
            }}
          />
        )}
      </Box>
      <IconButton
        size="small"
        disabled
        aria-label="Hold control"
        sx={{
          color: active ? '#EF5350' : 'text.secondary',
          '&.Mui-disabled': { color: active ? '#EF5350' : 'text.secondary', opacity: 0.9 },
        }}
      >
        <PowerSettingsNewOutlinedIcon fontSize="small" />
      </IconButton>
    </Box>
  )
}

export default function CyYardAllocationCard({
  allocation,
  shippingLineCode,
  shippingLineName,
  onEdit,
}: CyYardAllocationCardProps) {
  const row20 = getGroupBreakdownRow(allocation, '20')
  const row40 = getGroupBreakdownRow(allocation, '40')
  const teuUsed = Math.round(allocation.preAdvisedTeu)
  const teuLimit = allocation.contractTeu
  const teuPct = cyUtilizationPctUncapped(teuUsed, teuLimit)
  const teuOver = teuLimit > 0 && teuUsed >= teuLimit
  const hold20 = (row20?.preAdvisedCount ?? 0) >= (row20?.contractCount ?? 0) && (row20?.contractCount ?? 0) > 0
  const hold40 = (row40?.preAdvisedCount ?? 0) >= (row40?.contractCount ?? 0) && (row40?.contractCount ?? 0) > 0
  const cardOver = teuOver || hold20 || hold40

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '16px',
        border: '1px solid',
        borderColor: cardOver ? cardBorderOver : cardBorderOk,
        bgcolor: '#fff',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header — matches ASL / KGP card title block */}
      <Box
        sx={{
          px: 2.5,
          pt: 2.25,
          pb: 2,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '1.65rem',
              lineHeight: 1.1,
              color: 'text.primary',
              letterSpacing: '-0.02em',
            }}
          >
            {depotMonogram(allocation.depotName)}
          </Typography>
          <Typography
            sx={{
              mt: 0.5,
              fontWeight: 500,
              fontSize: '0.95rem',
              color: '#52606D',
              lineHeight: 1.35,
            }}
          >
            {allocation.depotName}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary', fontWeight: 600 }}>
            {shippingLineCode} · {shippingLineName}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: '#FAFBFC',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <WarehouseOutlinedIcon sx={{ color: '#78909C', fontSize: 28 }} />
        </Box>
      </Box>

      {/* TEU Capacity */}
      <Box sx={{ px: 2.5, pb: 2, borderBottom: '1px solid', borderColor: '#EEF1F4' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.25 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            TEU Capacity
          </Typography>
          <EditButton onClick={() => onEdit('teu')} label="Edit TEU capacity" />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1 }}>
          <Typography sx={{ fontWeight: 800, color: 'text.primary' }}>
            <Box component="span" sx={{ fontSize: '1.75rem' }}>{teuUsed}</Box>
            {' / '}
            {teuLimit} TEUs
          </Typography>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '1.15rem',
              color: teuOver ? '#C62828' : 'text.primary',
            }}
          >
            {Number.isInteger(teuPct) ? teuPct : teuPct.toFixed(1)}%
          </Typography>
        </Box>
        <MetricProgressBar pct={teuPct} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {getAllocationSizeLabel('20')}:{' '}
            <Box component="span" sx={{ fontWeight: 800 }}>
              {row20?.preAdvisedCount ?? 0}
            </Box>
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {getAllocationSizeLabel('40')}:{' '}
            <Box component="span" sx={{ fontWeight: 800 }}>
              {row40?.preAdvisedCount ?? 0}
            </Box>
          </Typography>
        </Box>
      </Box>

      {/* Unit limits */}
      <Box sx={{ px: 2.5, pt: 2, pb: 1, flex: 1 }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '0.72rem',
            letterSpacing: '0.08em',
            color: 'text.secondary',
            mb: 1.5,
          }}
        >
          UNIT LIMITS
        </Typography>

        {row20 && (
          <UnitLimitBlock
            label={getAllocationReturnsLabel('20')}
            used={row20.preAdvisedCount}
            pending={row20.bookingCount}
            limit={row20.contractCount}
            showAuto={hold20}
            onEdit={() => onEdit('20')}
          />
        )}

        {row40 && (
          <UnitLimitBlock
            label={getAllocationReturnsLabel('40')}
            used={row40.preAdvisedCount}
            pending={row40.bookingCount}
            limit={row40.contractCount}
            showAuto={hold40}
            onEdit={() => onEdit('40')}
          />
        )}

        {!row20 && !row40 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            No unit limits configured.
          </Typography>
        )}
      </Box>

      {/* Hold controls — footer like reference */}
      <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid', borderColor: '#EEF1F4' }}>
        {row20 && <HoldControlRow label={getAllocationHoldLabel('20')} active={hold20} showAuto={hold20} />}
        {row40 && <HoldControlRow label={getAllocationHoldLabel('40')} active={hold40} showAuto={hold40 && !hold20} />}
      </Box>
    </Paper>
  )
}
