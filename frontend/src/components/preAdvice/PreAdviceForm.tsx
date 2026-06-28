import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import type { PreAdviceLookups } from '../../services/api'
import { formatContainerSizeLabel } from '../../utils/containerSize'

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 2 },
}

export interface PreAdviceFormValues {
  shippingLineId: number | ''
  containerNo: string
  containerSizeId: number | ''
  containerTypeId: number | ''
  remarks: string
}

export interface PreAdviceFormSubmitValues {
  shippingLineId: number
  containerNo: string
  containerSizeId: number
  containerTypeId: number
  remarks?: string
}

interface PreAdviceFormProps {
  lookups: PreAdviceLookups
  initial: PreAdviceFormValues
  onSubmit: (values: PreAdviceFormSubmitValues) => void
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
  const [containerNo, setContainerNo] = useState(initial.containerNo)
  const [containerSizeId, setContainerSizeId] = useState<number | ''>(initial.containerSizeId)
  const [containerTypeId, setContainerTypeId] = useState<number | ''>(initial.containerTypeId)
  const [remarks, setRemarks] = useState(initial.remarks)

  useEffect(() => {
    setShippingLineId(initial.shippingLineId)
    setContainerNo(initial.containerNo)
    setContainerSizeId(initial.containerSizeId)
    setContainerTypeId(initial.containerTypeId)
    setRemarks(initial.remarks)
  }, [initial])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (
      shippingLineId === '' ||
      containerSizeId === '' ||
      containerTypeId === '' ||
      !containerNo.trim()
    ) {
      return
    }
    onSubmit({
      shippingLineId,
      containerNo: containerNo.trim().toUpperCase(),
      containerSizeId,
      containerTypeId,
      remarks: remarks.trim() || undefined,
    })
  }

  const canSubmit =
    shippingLineId !== '' &&
    containerSizeId !== '' &&
    containerTypeId !== '' &&
    containerNo.trim().length > 0

  const selectedSizeLabel = useMemo(() => {
    if (containerSizeId === '') return ''
    const size = lookups.containerSizes.find((item) => item.id === containerSizeId)
    return size ? formatContainerSizeLabel(size.label) : ''
  }, [containerSizeId, lookups.containerSizes])

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

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
            <TextField
              fullWidth
              required
              label="Container number"
              value={containerNo}
              onChange={(e) => setContainerNo(e.target.value.toUpperCase())}
              placeholder="e.g. MSCU1234567"
              slotProps={{
                input: { style: { fontFamily: 'monospace' } },
              }}
              sx={fieldSx}
            />

            <FormControl fullWidth required sx={fieldSx}>
              <InputLabel>Container size</InputLabel>
              <Select
                label="Container size"
                value={containerSizeId}
                onChange={(e) => setContainerSizeId(e.target.value as number | '')}
                renderValue={() => selectedSizeLabel || 'Select size'}
              >
                {lookups.containerSizes.length === 0 ? (
                  <MenuItem disabled value="">
                    No sizes configured — contact admin
                  </MenuItem>
                ) : (
                  lookups.containerSizes.map((size) => (
                    <MenuItem key={size.id} value={size.id}>
                      {formatContainerSizeLabel(size.label)}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <FormControl fullWidth required sx={fieldSx}>
              <InputLabel>Container type</InputLabel>
              <Select
                label="Container type"
                value={containerTypeId}
                onChange={(e) => setContainerTypeId(e.target.value as number | '')}
              >
                {lookups.containerTypes.length === 0 ? (
                  <MenuItem disabled value="">
                    No types configured — contact admin
                  </MenuItem>
                ) : (
                  lookups.containerTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.code} — {type.label}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Box>
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
        <FormHelperText sx={{ mt: 0.75 }}>
          Optional context for the evaluator (damage notes, special handling, etc.).
        </FormHelperText>
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
          disabled={submitting || !canSubmit}
          sx={{ fontWeight: 700, px: 3, borderRadius: 2, minWidth: 140 }}
        >
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </Box>
    </Box>
  )
}
