import {
  Alert,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { InlineLoadingSkeleton } from '../layout/SkeletonPrimitives'
import { cyAllocationApi, withdrawalApi, type CyAllocation, type Withdrawal } from '../../services/api'
import { depotHasCapacityForWithdrawal, formatWithdrawalDepotOptionLabel } from '../../utils/cyAllocation'
import AssignCyAllocationPreview from './AssignCyAllocationPreview'

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

interface AssignCyDialogProps {
  open: boolean
  item: Withdrawal | null
  depots: { id: number; name: string }[]
  onClose: () => void
  onAssigned: (item: Withdrawal) => void
}

export default function AssignCyDialog({ open, item, depots, onClose, onAssigned }: AssignCyDialogProps) {
  const [depotId, setDepotId] = useState<number | ''>('')
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showAllocation, setShowAllocation] = useState(true)
  const [allocations, setAllocations] = useState<CyAllocation[]>([])
  const [allocationsLoading, setAllocationsLoading] = useState(false)
  const [allocationsError, setAllocationsError] = useState('')

  useEffect(() => {
    if (open && item) {
      setDepotId(item.requestedDepotId ?? item.currentDepotId ?? '')
      setRemarks('')
      setError('')
      setShowAllocation(true)
    }
  }, [open, item])

  useEffect(() => {
    if (!open) return
    setAllocationsLoading(true)
    setAllocationsError('')
    cyAllocationApi
      .list()
      .then(({ data }) => setAllocations(data))
      .catch(() => setAllocationsError('Could not load CY allocation data.'))
      .finally(() => setAllocationsLoading(false))
  }, [open])

  const depotOptions = useMemo(() => {
    if (allocations.length > 0) {
      return allocations.map((row) => ({ id: row.depotId, name: row.depotName, allocation: row }))
    }
    return depots.map((d) => ({ id: d.id, name: d.name, allocation: null as CyAllocation | null }))
  }, [allocations, depots])

  const selectedAllocation = useMemo(
    () => allocations.find((row) => row.depotId === depotId) ?? null,
    [allocations, depotId],
  )

  const selectedCapacity = useMemo(() => {
    if (!item || !selectedAllocation) return { ok: true as const }
    return depotHasCapacityForWithdrawal(selectedAllocation, item.lines)
  }, [item, selectedAllocation])

  const handleAssign = async () => {
    if (!item || depotId === '') return
    setSubmitting(true)
    setError('')
    try {
      const { data } = await withdrawalApi.assignCy(item.id, {
        assignedDepotId: depotId as number,
        remarks: remarks.trim() || undefined,
      })
      onAssigned(data)
      onClose()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to assign container yard.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth={showAllocation ? 'md' : 'sm'} fullWidth>
      <DialogTitle>Assign container yard</DialogTitle>
      <DialogContent>
        {item && (
          <>
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              {item.referenceNo} · Booking {item.bookingNumber ?? '—'} · {item.containerSummary}
            </Alert>
            {!item.hasAtwDocument && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                ATW certificate is not attached yet. CY assignment may fail until the trucker uploads it.
              </Alert>
            )}

            {allocationsError && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                {allocationsError} You can still assign a yard, but capacity hints may be unavailable.
              </Alert>
            )}

            <FormControl fullWidth sx={{ mt: 1, mb: 1 }} disabled={allocationsLoading}>
              <InputLabel>Container yard</InputLabel>
              <Select
                label="Container yard"
                value={depotId}
                onChange={(e) => setDepotId(e.target.value as number)}
              >
                {depotOptions.map((d) => {
                  const allocation = d.allocation
                  const disabled =
                    allocation && item.lines.length > 0
                      ? !depotHasCapacityForWithdrawal(allocation, item.lines).ok
                      : false
                  return (
                    <MenuItem key={d.id} value={d.id} disabled={disabled}>
                      {allocation
                        ? formatWithdrawalDepotOptionLabel(allocation, item.lines)
                        : d.name}
                    </MenuItem>
                  )
                })}
              </Select>
            </FormControl>

            {allocationsLoading && <InlineLoadingSkeleton rows={2} />}

            <FormControlLabel
              control={
                <Switch
                  checked={showAllocation}
                  onChange={(e) => setShowAllocation(e.target.checked)}
                  disabled={!selectedAllocation}
                />
              }
              label="Show CY allocation for selected yard"
              sx={{ mb: 1, ml: 0 }}
            />

            <Collapse in={showAllocation && Boolean(selectedAllocation && item)}>
              {selectedAllocation && item && (
                <AssignCyAllocationPreview allocation={selectedAllocation} item={item} />
              )}
            </Collapse>

            {!selectedCapacity.ok && selectedCapacity.reason && (
              <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                {selectedCapacity.reason}
              </Alert>
            )}

            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Remarks (optional)"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              sx={{ mt: 2 }}
            />
            {error && (
              <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleAssign()}
          disabled={submitting || depotId === '' || !selectedCapacity.ok || !item?.hasAtwDocument}
        >
          {submitting ? 'Assigning…' : 'Assign CY'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
