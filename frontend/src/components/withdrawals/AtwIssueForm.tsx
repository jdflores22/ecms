import {
  Box,
  Button,
  Chip,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined'
import { useEffect, useState } from 'react'
import type { EvaluatorAtwLookups } from '../../services/api'
import { infoGridSx } from '../layout/DetailPagePrimitives'
import WithdrawalLineGrid, {
  type WithdrawalLineFormValue,
  toLineSubmitValues,
} from './WithdrawalLineGrid'

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 2 },
}

const sectionCaptionSx = {
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.6,
  color: 'text.secondary',
  mb: 1.5,
  display: 'block',
}

export interface AtwIssueFormValues {
  atwNumber: string
  authorizedTruckerId: number | ''
  lines: WithdrawalLineFormValue[]
  currentDepotId: number | ''
  destination: string
  issueDate: string
  expirationDate: string
  remarks: string
}

export interface AtwIssueSubmitValues {
  atwNumber: string
  authorizedTruckerId: number
  lines: { containerNo: string; containerSizeId: number; containerTypeId: number }[]
  currentDepotId: number
  destination: string
  issueDate: string
  expirationDate: string
  remarks?: string
}

interface AtwIssueFormProps {
  lookups: EvaluatorAtwLookups
  initial: AtwIssueFormValues
  onSubmit: (values: AtwIssueSubmitValues) => void
  onCancel?: () => void
  submitting?: boolean
}

export default function AtwIssueForm({
  lookups,
  initial,
  onSubmit,
  onCancel,
  submitting = false,
}: AtwIssueFormProps) {
  const [values, setValues] = useState(initial)

  useEffect(() => {
    setValues(initial)
  }, [initial])

  const setField = <K extends keyof AtwIssueFormValues>(key: K, value: AtwIssueFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const lineValues = toLineSubmitValues(values.lines)
    if (
      !values.atwNumber.trim() ||
      values.authorizedTruckerId === '' ||
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
      authorizedTruckerId: values.authorizedTruckerId,
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
    values.authorizedTruckerId !== '' &&
    lineValues &&
    values.currentDepotId !== '' &&
    values.destination.trim() &&
    values.issueDate &&
    values.expirationDate

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1.5,
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          <AssignmentTurnedInOutlinedIcon sx={{ color: '#0B3D91', fontSize: 22 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            ATW authorization
          </Typography>
        </Box>
        <Chip
          label={lookups.shippingLine.name}
          size="small"
          sx={{ fontWeight: 600, bgcolor: 'rgba(11, 61, 145, 0.08)', color: '#0B3D91' }}
        />
        <Chip
          label={values.atwNumber}
          size="small"
          sx={{ fontFamily: 'monospace', fontWeight: 700, bgcolor: 'rgba(0, 163, 224, 0.12)', color: '#0077A8' }}
        />
      </Box>

      <Box>
        <Typography component="span" variant="caption" sx={sectionCaptionSx}>
          Authorization &amp; validity
        </Typography>
        <Box
          sx={{
            ...infoGridSx,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          }}
        >
          <TextField
            label="ATW number"
            value={values.atwNumber}
            disabled
            size="small"
            sx={fieldSx}
            slotProps={{ input: { style: { fontFamily: 'monospace', fontWeight: 700 } } }}
          />
          <TextField
            label="Issue date"
            type="date"
            value={values.issueDate}
            onChange={(e) => setField('issueDate', e.target.value)}
            required
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={fieldSx}
          />
          <TextField
            label="Expiration date"
            type="date"
            value={values.expirationDate}
            onChange={(e) => setField('expirationDate', e.target.value)}
            required
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={fieldSx}
          />
        </Box>
      </Box>

      <Box>
        <Typography component="span" variant="caption" sx={sectionCaptionSx}>
          Movement details
        </Typography>
        <Box
          sx={{
            ...infoGridSx,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          }}
        >
          <FormControl required size="small" sx={fieldSx}>
            <InputLabel>Authorized trucker</InputLabel>
            <Select
              label="Authorized trucker"
              value={values.authorizedTruckerId}
              onChange={(e) => setField('authorizedTruckerId', e.target.value as number)}
            >
              {lookups.truckers.map((trucker) => (
                <MenuItem key={trucker.id} value={trucker.id}>
                  {trucker.name} ({trucker.username})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl required size="small" sx={fieldSx}>
            <InputLabel>Current CY</InputLabel>
            <Select
              label="Current CY"
              value={values.currentDepotId}
              onChange={(e) => setField('currentDepotId', e.target.value as number)}
            >
              {lookups.depots.map((depot) => (
                <MenuItem key={depot.id} value={depot.id}>
                  {depot.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Destination"
            value={values.destination}
            onChange={(e) => setField('destination', e.target.value)}
            required
            size="small"
            placeholder="Port, CY, or consignee"
            sx={{ ...fieldSx, gridColumn: { xs: '1', sm: '1 / -1', lg: 'auto' } }}
          />
        </Box>
        <FormHelperText sx={{ mt: 1 }}>
          The authorized trucker submits one withdrawal request with the ATW certificate for all containers listed below.
        </FormHelperText>
      </Box>

      <Box>
        <WithdrawalLineGrid
          compact
          lines={values.lines}
          onChange={(lines) => setField('lines', lines)}
          containerSizes={lookups.containerSizes}
          containerTypes={lookups.containerTypes}
          currentDepotId={values.currentDepotId}
        />
      </Box>

      <Box>
        <Typography component="span" variant="caption" sx={sectionCaptionSx}>
          Optional notes
        </Typography>
        <TextField
          label="Remarks"
          value={values.remarks}
          onChange={(e) => setField('remarks', e.target.value)}
          size="small"
          fullWidth
          multiline
          minRows={1}
          maxRows={3}
          placeholder="Instructions for the trucker or CY (optional)"
          sx={fieldSx}
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          justifyContent: 'flex-end',
          pt: 1,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        {onCancel && (
          <Button type="button" variant="outlined" onClick={onCancel} disabled={submitting} sx={{ fontWeight: 600, borderRadius: 2 }}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          disabled={!canSubmit || submitting}
          sx={{ fontWeight: 700, px: 3, borderRadius: 2, minWidth: 140 }}
        >
          {submitting ? 'Issuing…' : 'Issue ATW'}
        </Button>
      </Box>
    </Box>
  )
}
