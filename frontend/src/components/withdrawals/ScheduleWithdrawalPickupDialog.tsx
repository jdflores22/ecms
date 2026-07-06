import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { ChipRowSkeleton } from '../layout/SkeletonPrimitives'
import { scheduleApi, withdrawalApi, type SlotAvailability, type Withdrawal } from '../../services/api'
import { formatScheduleDate, formatScheduleTime, todayIsoDate } from '../../utils/datetime'

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

interface ScheduleWithdrawalPickupDialogProps {
  open: boolean
  item: Withdrawal | null
  onClose: () => void
  onScheduled: (item: Withdrawal) => void
}

export default function ScheduleWithdrawalPickupDialog({
  open,
  item,
  onClose,
  onScheduled,
}: ScheduleWithdrawalPickupDialogProps) {
  const [date, setDate] = useState(todayIsoDate())
  const [time, setTime] = useState('08:00')
  const [slotNo, setSlotNo] = useState<number | ''>('')
  const [depotRemarks, setDepotRemarks] = useState('')
  const [capacity, setCapacity] = useState<SlotAvailability | null>(null)
  const [capacityLoading, setCapacityLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadCapacity = useCallback(() => {
    if (!item) return
    setCapacityLoading(true)
    scheduleApi
      .slots(item.currentDepotId, date)
      .then(({ data }) => setCapacity(data))
      .catch(() => setCapacity(null))
      .finally(() => setCapacityLoading(false))
  }, [item, date])

  useEffect(() => {
    if (open && item) {
      setDate(todayIsoDate())
      setTime('08:00')
      setSlotNo('')
      setDepotRemarks('')
      setError('')
    }
  }, [open, item])

  useEffect(() => {
    if (open && item) loadCapacity()
  }, [open, item, loadCapacity])

  const handleSchedule = async () => {
    if (!item || slotNo === '') return
    setSubmitting(true)
    setError('')
    try {
      const { data } = await withdrawalApi.schedulePickup(item.id, {
        date,
        time,
        slotNo: slotNo as number,
        depotRemarks: depotRemarks.trim() || undefined,
      })
      onScheduled(data)
      onClose()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to schedule pick-up.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Schedule pick-up</DialogTitle>
      <DialogContent>
        {item && (
          <>
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              {item.referenceNo} · {item.containerSummary} · {item.currentDepotName}
            </Alert>
            <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
              <TextField
                type="date"
                label="Pick-up date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <TextField
                type="time"
                label="Pick-up time"
                slotProps={{ inputLabel: { shrink: true } }}
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Slot · {formatScheduleDate(date)}
                </Typography>
                {capacityLoading ? (
                  <ChipRowSkeleton chips={4} />
                ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {(capacity?.slots ?? []).map((slot) => (
                    <Chip
                      key={slot.slotNo}
                      label={`Slot ${slot.slotNo}${slot.referenceNo ? ` · ${slot.referenceNo}` : ''}`}
                      color={slotNo === slot.slotNo ? 'primary' : slot.available ? 'default' : 'warning'}
                      variant={slotNo === slot.slotNo ? 'filled' : 'outlined'}
                      disabled={!slot.available}
                      onClick={() => slot.available && setSlotNo(slot.slotNo)}
                      sx={{ fontWeight: 600 }}
                    />
                  ))}
                </Box>
                )}
                {capacity && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {capacity.bookedCount}/{capacity.dailyLimit} slots used at {capacity.depotName}
                  </Typography>
                )}
              </Box>
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Depot remarks (optional)"
                value={depotRemarks}
                onChange={(e) => setDepotRemarks(e.target.value)}
              />
            </Box>
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
          onClick={() => void handleSchedule()}
          disabled={submitting || slotNo === '' || !time}
        >
          {submitting ? 'Scheduling…' : `Schedule ${formatScheduleTime(time)}`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
