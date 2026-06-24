import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import type { PreAdviceLookups } from '../../services/api'

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 2 },
}

export interface PreAdviceFormValues {
  shippingLineId: number | ''
  containerId: number | ''
  remarks: string
}

interface PreAdviceFormProps {
  lookups: PreAdviceLookups
  initial: PreAdviceFormValues
  onSubmit: (values: { shippingLineId: number; containerId: number; remarks?: string }) => void
  onCancel?: () => void
  submitLabel?: string
  submitting?: boolean
}

export default function PreAdviceForm({
  lookups,
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  submitting = false,
}: PreAdviceFormProps) {
  const [shippingLineId, setShippingLineId] = useState<number | ''>(initial.shippingLineId)
  const [containerId, setContainerId] = useState<number | ''>(initial.containerId)
  const [remarks, setRemarks] = useState(initial.remarks)

  useEffect(() => {
    setShippingLineId(initial.shippingLineId)
    setContainerId(initial.containerId)
    setRemarks(initial.remarks)
  }, [initial])

  const containersForLine = useMemo(
    () =>
      shippingLineId === ''
        ? []
        : lookups.containers.filter((c) => c.shippingLineId === shippingLineId),
    [lookups.containers, shippingLineId],
  )

  useEffect(() => {
    if (containerId !== '' && !containersForLine.some((c) => c.id === containerId)) {
      setContainerId('')
    }
  }, [containersForLine, containerId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (shippingLineId === '' || containerId === '') return
    onSubmit({
      shippingLineId,
      containerId,
      remarks: remarks.trim() || undefined,
    })
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
          Container information
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth required sx={fieldSx}>
            <InputLabel>Shipping line</InputLabel>
            <Select
              label="Shipping line"
              value={shippingLineId}
              onChange={(e) => setShippingLineId(e.target.value as number | '')}
            >
              {lookups.shippingLines.map((line) => (
                <MenuItem key={line.id} value={line.id}>
                  {line.name} ({line.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth required disabled={shippingLineId === ''} sx={fieldSx}>
            <InputLabel>Container</InputLabel>
            <Select
              label="Container"
              value={containerId}
              onChange={(e) => setContainerId(e.target.value as number | '')}
            >
              {containersForLine.length === 0 ? (
                <MenuItem disabled value="">
                  Select a shipping line first
                </MenuItem>
              ) : (
                containersForLine.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.containerNo} — {c.size}&apos; {c.type}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
          Additional notes
        </Typography>
        <TextField
          fullWidth
          label="Remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          multiline
          minRows={3}
          placeholder="Optional notes for the shipping line evaluator"
          sx={fieldSx}
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          justifyContent: 'flex-end',
          pt: 1,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        {onCancel && (
          <Button onClick={onCancel} disabled={submitting} sx={{ fontWeight: 600, borderRadius: 2 }}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          disabled={submitting || shippingLineId === '' || containerId === ''}
          sx={{ fontWeight: 700, px: 3, borderRadius: 2, minWidth: 140 }}
        >
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </Box>
    </Box>
  )
}
