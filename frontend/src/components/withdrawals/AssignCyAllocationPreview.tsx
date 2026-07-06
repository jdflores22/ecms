import { Alert, Box, Button, Chip, LinearProgress, Typography } from '@mui/material'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { Link as RouterLink } from 'react-router-dom'
import CyAllocationBreakdownGrid from '../evaluations/CyAllocationBreakdownGrid'
import { hexToRgba, ICS_PRIMARY } from '../layout/DetailPagePrimitives'
import type { CyAllocation, Withdrawal } from '../../services/api'
import {
  breakdownAvailableTeu,
  breakdownContractTeu,
  breakdownUsedTeu,
  countWithdrawalLinesBySizeGroup,
  cyUtilizationPctUncapped,
  depotHasCapacityForWithdrawal,
  formatCyTeuSplit,
  getAllocationSizeLabel,
  getCapacityDisplayLabel,
  getGroupBreakdownRow,
  progressBarColor,
} from '../../utils/cyAllocation'

interface AssignCyAllocationPreviewProps {
  allocation: CyAllocation
  item: Withdrawal
}

export default function AssignCyAllocationPreview({ allocation, item }: AssignCyAllocationPreviewProps) {
  const capacity = depotHasCapacityForWithdrawal(allocation, item.lines)
  const needed = countWithdrawalLinesBySizeGroup(item.lines)
  const teuUsed = Math.round(allocation.preAdvisedTeu)
  const teuPct = cyUtilizationPctUncapped(teuUsed, allocation.contractTeu)

  return (
    <Box
      sx={{
        mt: 2,
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: capacity.ok ? 'divider' : '#EF5350',
        bgcolor: capacity.ok ? 'grey.50' : hexToRgba('#EF5350', 0.04),
      }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          CY allocation · {allocation.depotName}
        </Typography>
        <Button
          component={RouterLink}
          to="/evaluations/cy-allocation"
          target="_blank"
          size="small"
          endIcon={<OpenInNewIcon />}
          sx={{ fontWeight: 600 }}
        >
          Full allocation board
        </Button>
      </Box>

      {!capacity.ok && capacity.reason && (
        <Alert severity="warning" sx={{ mb: 1.5, borderRadius: 2 }}>
          {capacity.reason}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
        <Chip
          size="small"
          label={`This batch: ${item.containerCount} unit${item.containerCount === 1 ? '' : 's'}`}
          sx={{ fontWeight: 600 }}
        />
        {needed['20'] > 0 && (
          <Chip size="small" color="primary" variant="outlined" label={`Needs ${needed['20']} × ${getCapacityDisplayLabel('20')}`} />
        )}
        {needed['40'] > 0 && (
          <Chip size="small" color="primary" variant="outlined" label={`Needs ${needed['40']} × ${getCapacityDisplayLabel('40')}`} />
        )}
        <Chip
          size="small"
          color={capacity.ok ? 'success' : 'warning'}
          label={capacity.ok ? 'Fits this batch' : 'Insufficient slots'}
          sx={{ fontWeight: 700 }}
        />
      </Box>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            TEU capacity
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {teuUsed} / {allocation.contractTeu} TEU ({Number.isInteger(teuPct) ? teuPct : teuPct.toFixed(1)}%)
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, teuPct)}
          sx={{
            height: 10,
            borderRadius: 5,
            bgcolor: hexToRgba(ICS_PRIMARY, 0.08),
            '& .MuiLinearProgress-bar': { bgcolor: progressBarColor(teuPct), borderRadius: 5 },
          }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
          Yard total: {formatCyTeuSplit(allocation.preAdvisedTeu, allocation.bookingTeu)}
        </Typography>
      </Box>

      {(['20', '40'] as const).map((group) => {
        const row = getGroupBreakdownRow(allocation, group)
        if (!row || row.contractCount <= 0) return null
        const need = needed[group]
        const usedTeu = breakdownUsedTeu(row)
        const limitTeu = breakdownContractTeu(row)
        const availableTeu = breakdownAvailableTeu(row)
        const needTeu = need * row.teuPerContainer
        const fits = availableTeu >= needTeu
        const pct = cyUtilizationPctUncapped(usedTeu, limitTeu)
        return (
          <Box key={group} sx={{ mb: 1.25 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              {getAllocationSizeLabel(group)} — {availableTeu} TEU available / {limitTeu} TEU contract
              {need > 0 ? ` · batch needs ${needTeu} TEU` : ''}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, pct)}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: hexToRgba(ICS_PRIMARY, 0.08),
                '& .MuiLinearProgress-bar': {
                  bgcolor: fits ? progressBarColor(pct) : '#D32F2F',
                  borderRadius: 4,
                },
              }}
            />
          </Box>
        )
      })}

      <Box sx={{ mt: 2 }}>
        <CyAllocationBreakdownGrid rows={allocation.breakdown} compact />
      </Box>
    </Box>
  )
}
