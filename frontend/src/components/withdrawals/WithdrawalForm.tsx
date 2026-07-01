import {
  Autocomplete,
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
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined'
import { useEffect, useMemo, useState } from 'react'
import type { WithdrawalFormConfig, WithdrawalLookups } from '../../services/api'
import { withdrawalApi } from '../../services/api'
import { infoGridSx } from '../layout/DetailPagePrimitives'
import { shiftIsoDate, todayIsoDate } from '../../utils/datetime'
import WithdrawalLineGrid, {
  type WithdrawalLineFormValue,
  toLineSubmitValues,
} from './WithdrawalLineGrid'

const primaryDark = '#0B3D91'

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
  formConfig?: WithdrawalFormConfig
  initial: WithdrawalFormValues
  controlledValues?: WithdrawalFormValues
  onValuesChange?: (values: WithdrawalFormValues) => void
  onShippingLineChange?: (shippingLineId: number) => void
  onSubmit?: (values: WithdrawalFormSubmitValues) => void
  onCancel?: () => void
  submitLabel?: string
  submitting?: boolean
  excludeWithdrawalId?: number
  hideActions?: boolean
}

export default function WithdrawalForm({
  lookups,
  formConfig,
  initial,
  controlledValues,
  onValuesChange,
  onShippingLineChange,
  onSubmit,
  onCancel,
  submitLabel = 'Save draft',
  submitting = false,
  excludeWithdrawalId,
  hideActions = false,
}: WithdrawalFormProps) {
  const [internalValues, setInternalValues] = useState(initial)
  const values = controlledValues ?? internalValues
  const [atwTakenWarning, setAtwTakenWarning] = useState<string | null>(null)

  useEffect(() => {
    if (!controlledValues) setInternalValues(initial)
  }, [initial, controlledValues])

  const setValues = (updater: WithdrawalFormValues | ((prev: WithdrawalFormValues) => WithdrawalFormValues)) => {
    const next = typeof updater === 'function' ? updater(values) : updater
    if (onValuesChange) onValuesChange(next)
    else setInternalValues(next)
  }

  const setField = <K extends keyof WithdrawalFormValues>(key: K, value: WithdrawalFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }))

  const shippingLineName = useMemo(
    () => lookups.shippingLines.find((line) => line.id === values.shippingLineId)?.name,
    [lookups.shippingLines, values.shippingLineId],
  )

  const filteredDepots = useMemo(() => {
    if (!formConfig || values.shippingLineId === '') return lookups.depots
    const rules = formConfig.shippingLineRules.find((r) => r.shippingLineId === values.shippingLineId)
    if (!rules || rules.contractDepotIds.length === 0) return lookups.depots
    return lookups.depots.filter((d) => rules.contractDepotIds.includes(d.id))
  }, [formConfig, lookups.depots, values.shippingLineId])

  const dateError = useMemo(() => {
    if (!values.issueDate || !values.expirationDate) return null
    if (values.expirationDate < values.issueDate) return 'Expiration date must be on or after issue date.'
    if (values.expirationDate < todayIsoDate()) return 'Expiration date is in the past.'
    return null
  }, [values.issueDate, values.expirationDate])

  useEffect(() => {
    if (!values.atwNumber.trim()) {
      setAtwTakenWarning(null)
      return
    }
    const timer = window.setTimeout(() => {
      withdrawalApi
        .checkAtwNumber({ atwNumber: values.atwNumber, excludeWithdrawalId })
        .then(({ data }) => {
          setAtwTakenWarning(
            data.isTaken
              ? `ATW already used on ${data.referenceNo ?? 'another request'} (${data.status ?? ''}).`
              : null,
          )
        })
        .catch(() => setAtwTakenWarning(null))
    }, 400)
    return () => window.clearTimeout(timer)
  }, [values.atwNumber, excludeWithdrawalId])

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

    onSubmit?.({
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
    values.expirationDate &&
    !dateError &&
    !atwTakenWarning

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
          <UnarchiveOutlinedIcon sx={{ color: primaryDark, fontSize: 22 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Withdrawal request
          </Typography>
        </Box>
        {shippingLineName && (
          <Chip
            label={shippingLineName}
            size="small"
            sx={{ fontWeight: 600, bgcolor: 'rgba(11, 61, 145, 0.08)', color: primaryDark }}
          />
        )}
        {values.atwNumber.trim() && (
          <Chip
            label={values.atwNumber.trim().toUpperCase()}
            size="small"
            sx={{ fontFamily: 'monospace', fontWeight: 700, bgcolor: 'rgba(0, 163, 224, 0.12)', color: '#0077A8' }}
          />
        )}
      </Box>

      <Box>
        <Typography component="span" variant="caption" sx={sectionCaptionSx}>
          ATW &amp; shipping line
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
            onChange={(e) => setField('atwNumber', e.target.value.toUpperCase())}
            required
            size="small"
            placeholder="e.g. ATW-2026-001"
            sx={fieldSx}
            slotProps={{ input: { style: { fontFamily: 'monospace', fontWeight: 600 } } }}
            error={Boolean(atwTakenWarning)}
            helperText={atwTakenWarning ?? ' '}
          />
          <FormControl required size="small" sx={{ ...fieldSx, gridColumn: { xs: '1', sm: 'span 2', lg: 'span 2' } }}>
            <InputLabel>Shipping line</InputLabel>
            <Select
              label="Shipping line"
              value={values.shippingLineId}
              onChange={(e) => {
                const id = e.target.value as number
                setField('shippingLineId', id)
                onShippingLineChange?.(id)
                if (formConfig) {
                  const rules = formConfig.shippingLineRules.find((r) => r.shippingLineId === id)
                  if (rules) {
                    setValues((prev) => ({
                      ...prev,
                      shippingLineId: id,
                      expirationDate: prev.issueDate
                        ? shiftIsoDate(prev.issueDate, rules.defaultValidityDays)
                        : shiftIsoDate(todayIsoDate(), rules.defaultValidityDays),
                    }))
                  }
                }
              }}
            >
              {lookups.shippingLines.map((line) => (
                <MenuItem key={line.id} value={line.id}>
                  {line.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Box>
        <Typography component="span" variant="caption" sx={sectionCaptionSx}>
          Validity dates
        </Typography>
        <Box sx={{ ...infoGridSx, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
          <TextField
            label="ATW issue date"
            type="date"
            value={values.issueDate}
            onChange={(e) => setField('issueDate', e.target.value)}
            required
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={fieldSx}
          />
          <TextField
            label="ATW expiration date"
            type="date"
            value={values.expirationDate}
            onChange={(e) => setField('expirationDate', e.target.value)}
            required
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={fieldSx}
            error={Boolean(dateError)}
            helperText={dateError ?? ' '}
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
            <InputLabel>Current container yard (CY)</InputLabel>
            <Select
              label="Current container yard (CY)"
              value={values.currentDepotId}
              onChange={(e) => setField('currentDepotId', e.target.value as number)}
            >
              {filteredDepots.map((depot) => (
                <MenuItem key={depot.id} value={depot.id}>
                  {depot.name}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>Where the containers are currently located</FormHelperText>
          </FormControl>

          <Autocomplete
            freeSolo
            size="small"
            options={formConfig?.destinations.map((d) => d.label) ?? []}
            value={values.destination}
            onChange={(_, v) => setField('destination', v ?? '')}
            onInputChange={(_, v) => setField('destination', v)}
            sx={{ ...fieldSx, gridColumn: { xs: '1', sm: '1 / -1', lg: 'span 2' } }}
            renderInput={(params) => (
              <TextField
                {...params}
                required
                label="Destination"
                placeholder="Port, CY, or consignee"
                helperText="Repositioning destination"
              />
            )}
          />
        </Box>
      </Box>

      <Box>
        <WithdrawalLineGrid
          compact
          lines={values.lines}
          onChange={(lines) => setField('lines', lines)}
          containerSizes={lookups.containerSizes}
          containerTypes={lookups.containerTypes}
          currentDepotId={values.currentDepotId}
          shippingLineId={values.shippingLineId}
          excludeWithdrawalId={excludeWithdrawalId}
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
          minRows={2}
          maxRows={4}
          placeholder="Special instructions for the container yard (optional)"
          sx={fieldSx}
        />
      </Box>

      {!hideActions && (
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
          <Button
            type="button"
            variant="outlined"
            onClick={onCancel}
            disabled={submitting}
            sx={{ fontWeight: 600, borderRadius: 2 }}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          disabled={!canSubmit || submitting}
          sx={{ fontWeight: 700, px: 3, borderRadius: 2, minWidth: 140 }}
        >
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </Box>
      )}
    </Box>
  )
}
