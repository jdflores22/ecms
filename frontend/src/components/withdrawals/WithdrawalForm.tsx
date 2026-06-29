import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material'
import { useEffect, useState } from 'react'
import type { WithdrawalLookups } from '../../services/api'
import WithdrawalLineGrid, {
  type WithdrawalLineFormValue,
  toLineSubmitValues,
} from './WithdrawalLineGrid'

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 2 },
}

export interface WithdrawalFormValues {
  atwNumber: string
  shippingLineId: number | ''
  lines: WithdrawalLineFormValue[]
  currentDepotId: number | ''
  destination: string
  issueDate: string
  expirationDate: string
  remarks: string
}

export interface WithdrawalFormSubmitValues {
  atwNumber: string
  shippingLineId: number
  lines: { containerNo: string; containerSizeId: number; containerTypeId: number }[]
  currentDepotId: number
  destination: string
  issueDate: string
  expirationDate: string
  remarks?: string
}

interface WithdrawalFormProps {
  lookups: WithdrawalLookups
  initial: WithdrawalFormValues
  onSubmit: (values: WithdrawalFormSubmitValues) => void
  onCancel?: () => void
  submitLabel?: string
  submitting?: boolean
  excludeWithdrawalId?: number
}

export default function WithdrawalForm({
  lookups,
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Save draft',
  submitting = false,
  excludeWithdrawalId,
}: WithdrawalFormProps) {
  const [values, setValues] = useState(initial)

  useEffect(() => {
    setValues(initial)
  }, [initial])

  const setField = <K extends keyof WithdrawalFormValues>(key: K, value: WithdrawalFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const lineValues = toLineSubmitValues(values.lines)
    if (
      !values.atwNumber.trim() ||
      values.shippingLineId === '' ||
      !lineValues ||
      values.currentDepotId === '' ||
      !values.destination.trim() ||
      !values.issueDate ||
      !values.expirationDate
    ) {
      return
    }

    onSubmit({
      atwNumber: values.atwNumber.trim().toUpperCase(),
      shippingLineId: values.shippingLineId,
      lines: lineValues,
      currentDepotId: values.currentDepotId,
      destination: values.destination.trim(),
      issueDate: values.issueDate,
      expirationDate: values.expirationDate,
      remarks: values.remarks.trim() || undefined,
    })
  }

  const lineValues = toLineSubmitValues(values.lines)
  const canSubmit =
    values.atwNumber.trim() &&
    values.shippingLineId !== '' &&
    lineValues &&
    values.currentDepotId !== '' &&
    values.destination.trim() &&
    values.issueDate &&
    values.expirationDate

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField
        label="ATW number"
        value={values.atwNumber}
        onChange={(e) => setField('atwNumber', e.target.value.toUpperCase())}
        required
        fullWidth
        sx={fieldSx}
      />

      <FormControl fullWidth required sx={fieldSx}>
        <InputLabel>Shipping line</InputLabel>
        <Select
          label="Shipping line"
          value={values.shippingLineId}
          onChange={(e) => setField('shippingLineId', e.target.value as number)}
        >
          {lookups.shippingLines.map((line) => (
            <MenuItem key={line.id} value={line.id}>
              {line.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth required sx={fieldSx}>
        <InputLabel>Current container yard (CY)</InputLabel>
        <Select
          label="Current container yard (CY)"
          value={values.currentDepotId}
          onChange={(e) => setField('currentDepotId', e.target.value as number)}
        >
          {lookups.depots.map((depot) => (
            <MenuItem key={depot.id} value={depot.id}>
              {depot.name}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>Where the containers are currently located</FormHelperText>
      </FormControl>

      <WithdrawalLineGrid
        lines={values.lines}
        onChange={(lines) => setField('lines', lines)}
        containerSizes={lookups.containerSizes}
        containerTypes={lookups.containerTypes}
        currentDepotId={values.currentDepotId}
        excludeWithdrawalId={excludeWithdrawalId}
      />

      <TextField
        label="Destination"
        value={values.destination}
        onChange={(e) => setField('destination', e.target.value)}
        required
        fullWidth
        sx={fieldSx}
        helperText="Repositioning destination (port, CY, or consignee)"
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        <TextField
          label="ATW issue date"
          type="date"
          value={values.issueDate}
          onChange={(e) => setField('issueDate', e.target.value)}
          required
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
          sx={fieldSx}
        />
        <TextField
          label="ATW expiration date"
          type="date"
          value={values.expirationDate}
          onChange={(e) => setField('expirationDate', e.target.value)}
          required
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
          sx={fieldSx}
        />
      </Box>

      <TextField
        label="Remarks (optional)"
        value={values.remarks}
        onChange={(e) => setField('remarks', e.target.value)}
        fullWidth
        multiline
        minRows={2}
        sx={fieldSx}
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, pt: 1 }}>
        <Button type="submit" variant="contained" disabled={!canSubmit || submitting} sx={{ fontWeight: 700 }}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outlined" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
      </Box>
    </Box>
  )
}
