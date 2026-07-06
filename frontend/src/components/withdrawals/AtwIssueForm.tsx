import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormHelperText, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material'
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined'
import { useState } from 'react'
import type { EvaluatorAtwLookups } from '../../services/api'
import { infoGridSx } from '../layout/DetailPagePrimitives'
import { formatDisplayDate } from '../../utils/datetime'
import AtwInventoryLinePicker from './AtwInventoryLinePicker'
import {
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
  values: AtwIssueFormValues
  onChange: (values: AtwIssueFormValues) => void
  onSubmit: (values: AtwIssueSubmitValues) => void
  onCancel?: () => void
  onBulkSelect?: (values: AtwIssueFormValues) => void
  submitting?: boolean
}

export default function AtwIssueForm({
  lookups,
  values,
  onChange,
  onSubmit,
  onCancel,
  onBulkSelect,
  submitting = false,
}: AtwIssueFormProps) {
  const [linesBlocked, setLinesBlocked] = useState(false)
  const [pendingSubmit, setPendingSubmit] = useState<AtwIssueSubmitValues | null>(null)

  const setField = <K extends keyof AtwIssueFormValues>(key: K, value: AtwIssueFormValues[K]) =>
    onChange({ ...values, [key]: value })

  const setCurrentDepotId = (depotId: number | '') => {
    onChange({
      ...values,
      currentDepotId: depotId,
      lines: values.currentDepotId === depotId ? values.lines : [],
    })
  }

  const buildSubmitValues = (): AtwIssueSubmitValues | null => {
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
      return null
    }

    return {
      atwNumber: values.atwNumber.trim().toUpperCase(),
      authorizedTruckerId: values.authorizedTruckerId,
      lines: lineValues,
      currentDepotId: values.currentDepotId,
      destination: values.destination.trim(),
      issueDate: values.issueDate,
      expirationDate: values.expirationDate,
      remarks: values.remarks.trim() || undefined,
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const submitValues = buildSubmitValues()
    if (!submitValues) return
    setPendingSubmit(submitValues)
  }

  const confirmIssue = () => {
    if (!pendingSubmit || submitting) return
    onSubmit(pendingSubmit)
  }

  const pendingTruckerName =
    pendingSubmit &&
    lookups.truckers.find((trucker) => trucker.id === pendingSubmit.authorizedTruckerId)?.name
  const pendingDepotName =
    pendingSubmit && lookups.depots.find((depot) => depot.id === pendingSubmit.currentDepotId)?.name
  const pendingContainerSummary = (() => {
    if (!pendingSubmit) return ''
    const nos = pendingSubmit.lines.map((line) => line.containerNo)
    if (nos.length <= 4) return nos.join(', ')
    return `${nos.slice(0, 4).join(', ')} +${nos.length - 4} more`
  })()

  const lineValues = toLineSubmitValues(values.lines)
  const canSubmit =
    values.atwNumber.trim() &&
    values.authorizedTruckerId !== '' &&
    lineValues &&
    values.currentDepotId !== '' &&
    values.destination.trim() &&
    values.issueDate &&
    values.expirationDate &&
    !linesBlocked

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
              onChange={(e) => setCurrentDepotId(e.target.value as number)}
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
          Containers must be physically at this yard in CY inventory. The trucker submits one withdrawal request with the
          ATW certificate for all units you authorize below.
        </FormHelperText>
      </Box>

      <Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
          <Typography component="span" variant="caption" sx={{ ...sectionCaptionSx, mb: 0 }}>
            Containers at CY
          </Typography>
          {onBulkSelect && (
            <Button
              type="button"
              variant="outlined"
              size="small"
              disabled={values.currentDepotId === '' || submitting}
              onClick={() => onBulkSelect(values)}
              sx={{ fontWeight: 600, borderRadius: 2 }}
            >
              Bulk select
            </Button>
          )}
        </Box>
        <AtwInventoryLinePicker
          lines={values.lines}
          onChange={(lines) => setField('lines', lines)}
          containerSizes={lookups.containerSizes}
          containerTypes={lookups.containerTypes}
          currentDepotId={values.currentDepotId}
          shippingLineId={lookups.shippingLine.id}
          onBlockersChange={setLinesBlocked}
          hideSectionCaption
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

      <Dialog
        open={pendingSubmit !== null}
        onClose={() => {
          if (!submitting) setPendingSubmit(null)
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Issue this ATW?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            An official ATW PDF will be generated from your shipping line template. The authorized trucker will be
            notified to view the certificate and submit a withdrawal request for these containers.
          </Typography>
          {pendingSubmit && (
            <Box sx={{ display: 'grid', gap: 1 }}>
              <Typography variant="body2">
                <strong>ATW:</strong>{' '}
                <Box component="span" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                  {pendingSubmit.atwNumber}
                </Box>
              </Typography>
              <Typography variant="body2">
                <strong>Trucker:</strong> {pendingTruckerName ?? '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Current CY:</strong> {pendingDepotName ?? '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Destination:</strong> {pendingSubmit.destination}
              </Typography>
              <Typography variant="body2">
                <strong>Valid:</strong> {formatDisplayDate(pendingSubmit.issueDate)} –{' '}
                {formatDisplayDate(pendingSubmit.expirationDate)}
              </Typography>
              <Typography variant="body2">
                <strong>Containers ({pendingSubmit.lines.length}):</strong>{' '}
                <Box component="span" sx={{ fontFamily: 'monospace' }}>
                  {pendingContainerSummary}
                </Box>
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPendingSubmit(null)} disabled={submitting} sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={confirmIssue}
            disabled={submitting}
            sx={{ fontWeight: 700, borderRadius: 2, minWidth: 120 }}
          >
            {submitting ? 'Issuing…' : 'Issue ATW'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
