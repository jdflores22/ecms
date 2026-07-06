import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material'
import axios from 'axios'
import { useEffect, useMemo, useState } from 'react'
import type { ContainerSizeMaster, CyAllocation } from '../../services/api'
import {
  getAllocationSizeLabel,
  getCapacityGroupKey,
  getGroupBreakdownRow,
  isSecondaryCapacitySize,
} from '../../utils/cyAllocation'

export type CyAllocationEditMode = 'teu' | '20' | '40'

interface CyAllocationLimitEditDialogProps {
  open: boolean
  mode: CyAllocationEditMode | null
  allocation: CyAllocation | null
  containerSizes: ContainerSizeMaster[]
  onClose: () => void
  onSave: (allocation: CyAllocation, sizes: { containerSizeId: number; contractCount: number }[]) => Promise<void>
}

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string' && msg.trim()) return msg
  }
  return fallback
}

function buildSizeCounts(
  allocation: CyAllocation,
  overrides: Partial<Record<'20' | '40', number>>,
): Record<'20' | '40', number> {
  const counts: Record<'20' | '40', number> = {
    '20': getGroupBreakdownRow(allocation, '20')?.contractCount ?? 0,
    '40': getGroupBreakdownRow(allocation, '40')?.contractCount ?? 0,
  }
  if (overrides['20'] !== undefined) counts['20'] = overrides['20']!
  if (overrides['40'] !== undefined) counts['40'] = overrides['40']!
  return counts
}

function buildSizesPayload(
  containerSizes: ContainerSizeMaster[],
  counts: Record<'20' | '40', number>,
) {
  const activeSizes = containerSizes.filter((s) => s.isActive && !isSecondaryCapacitySize(s.label))
  return activeSizes
    .map((size) => {
      const groupKey = getCapacityGroupKey(size.label) as '20' | '40'
      const count = counts[groupKey] ?? 0
      return { containerSizeId: size.id, contractCount: count }
    })
    .filter((row) => row.contractCount > 0)
}

export default function CyAllocationLimitEditDialog({
  open,
  mode,
  allocation,
  containerSizes,
  onClose,
  onSave,
}: CyAllocationLimitEditDialogProps) {
  const [size20, setSize20] = useState<number | ''>('')
  const [size40, setSize40] = useState<number | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const activeSizes = useMemo(
    () =>
      containerSizes
        .filter((s) => s.isActive && !isSecondaryCapacitySize(s.label))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
    [containerSizes],
  )

  useEffect(() => {
    if (!open || !allocation) return
    setSize20(getGroupBreakdownRow(allocation, '20')?.contractCount ?? '')
    setSize40(getGroupBreakdownRow(allocation, '40')?.contractCount ?? '')
    setError('')
  }, [open, allocation])

  const title = useMemo(() => {
    if (!allocation || !mode) return 'Edit limit'
    if (mode === 'teu') return `Edit TEU capacity — ${allocation.depotName}`
    if (mode === '20') return `Edit ${getAllocationSizeLabel('20')} returns — ${allocation.depotName}`
    return `Edit ${getAllocationSizeLabel('40')} returns — ${allocation.depotName}`
  }, [allocation, mode])

  const min20 = getGroupBreakdownRow(allocation ?? { breakdown: [] }, '20')?.preAdvisedCount ?? 0
  const min40 = getGroupBreakdownRow(allocation ?? { breakdown: [] }, '40')?.preAdvisedCount ?? 0

  const handleSave = async () => {
    if (!allocation || !mode) return
    setError('')

    const counts = buildSizeCounts(allocation, {
      '20': mode === '20' || mode === 'teu' ? Number(size20 || 0) : undefined,
      '40': mode === '40' || mode === 'teu' ? Number(size40 || 0) : undefined,
    })

    if (mode === '20' && counts['20'] < min20) {
      setError(`20ft limit cannot be below current pre-forecasted count (${min20}).`)
      return
    }
    if (mode === '40' && counts['40'] < min40) {
      setError(`40ft limit cannot be below current pre-forecasted count (${min40}).`)
      return
    }

    const sizes = buildSizesPayload(containerSizes, counts)
    if (sizes.length === 0) {
      setError('Enter at least one size limit of 1 or more.')
      return
    }

    setSubmitting(true)
    try {
      await onSave(allocation, sizes)
      onClose()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save limit.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>{title}</DialogTitle>
      <DialogContent>
        {allocation && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {allocation.shippingLineName} · limits cannot be set below current pre-forecasted counts.
          </Typography>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {(mode === 'teu' || mode === '20') && (
          <TextField
            fullWidth
            margin="normal"
            label={`${getAllocationSizeLabel('20')} max containers`}
            type="number"
            value={size20}
            onChange={(e) => {
              const raw = e.target.value
              setSize20(raw === '' ? '' : Math.max(0, Number(raw)))
            }}
            slotProps={{ htmlInput: { min: min20 } }}
            helperText={min20 > 0 ? `Minimum ${min20} (pre-forecasted)` : undefined}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        )}

        {(mode === 'teu' || mode === '40') && (
          <TextField
            fullWidth
            margin="normal"
            label={`${getAllocationSizeLabel('40')} max containers`}
            type="number"
            value={size40}
            onChange={(e) => {
              const raw = e.target.value
              setSize40(raw === '' ? '' : Math.max(0, Number(raw)))
            }}
            slotProps={{ htmlInput: { min: min40 } }}
            helperText={min40 > 0 ? `Minimum ${min40} (pre-forecasted)` : undefined}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        )}

        {mode === 'teu' && activeSizes.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No active container sizes are configured.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={submitting || !allocation} sx={{ fontWeight: 700 }}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}
