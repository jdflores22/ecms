import {
  Alert,
  Box,
  Button,
  Checkbox,
  Collapse,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import { preAdviceUnitRoleLabel, preAdviceUnitSectionSx } from './preAdviceUnitSectionSx'
import { useEffect, useMemo, useState } from 'react'
import type { PreAdviceLookups } from '../../services/api'
import { preAdviceApi } from '../../services/api'
import { formatContainerSizeLabel } from '../../utils/containerSize'
import { croFreeTimeExpiredMessage } from '../../utils/croFreeTime'
import { containerNumberError, formatContainerNumberInput, normalizeContainerNo } from '../../utils/containerNumber'
import { formatPreAdviceDuplicateWarning } from '../../utils/preAdviceDuplicate'
import { getCapacityGroupKey } from '../../utils/cyAllocation'

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 2 },
}

export interface PreAdviceFormValues {
  shippingLineId: number | ''
  containerNo: string
  containerSizeId: number | ''
  containerTypeId: number | ''
  remarks: string
  isBackToBack: boolean
  backToBackCompanionContainerNo: string
  backToBackCompanionContainerSizeId: number | ''
  backToBackCompanionContainerTypeId: number | ''
}

export interface PreAdviceFormSubmitValues {
  shippingLineId: number
  containerNo: string
  containerSizeId: number
  containerTypeId: number
  remarks?: string
  isBackToBack?: boolean
  backToBackCompanionContainerNo?: string
  backToBackCompanionContainerSizeId?: number
  backToBackCompanionContainerTypeId?: number
}

interface PreAdviceFormProps {
  lookups: PreAdviceLookups
  initial: PreAdviceFormValues
  onSubmit: (values: PreAdviceFormSubmitValues) => void
  onCancel?: () => void
  submitLabel?: string
  submitting?: boolean
  /** When true, a legacy CRO/eDO file must be attached before submit. */
  requireLegacyDocument?: boolean
  legacyDocumentReady?: boolean
  companionLegacyDocumentReady?: boolean
  /** CRO/eDO upload blocks rendered inside each container section (creation / edit). */
  primaryCroSlot?: React.ReactNode
  companionCroSlot?: React.ReactNode
  /** When true, shipping line / container / size / type are read-only (CRO-linked). */
  lockCatalogFields?: boolean
  requireCroLink?: boolean
  croLinked?: boolean
  /** When true, free demurrage from CRO is expired — draft allowed, submit later blocked. */
  freeTimeExpired?: boolean
  freeTimeUntil?: string | null
  /** When editing, exclude the current pre-forecast from duplicate detection. */
  excludePreAdviceId?: number
}

export default function PreAdviceForm({
  lookups,
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  submitting = false,
  lockCatalogFields = false,
  requireCroLink = false,
  requireLegacyDocument = false,
  legacyDocumentReady = false,
  companionLegacyDocumentReady = true,
  primaryCroSlot,
  companionCroSlot,
  croLinked = false,
  freeTimeExpired = false,
  freeTimeUntil = null,
  excludePreAdviceId,
}: PreAdviceFormProps) {
  const [shippingLineId, setShippingLineId] = useState<number | ''>(initial.shippingLineId)
  const [containerNo, setContainerNo] = useState(initial.containerNo)
  const [containerSizeId, setContainerSizeId] = useState<number | ''>(initial.containerSizeId)
  const [containerTypeId, setContainerTypeId] = useState<number | ''>(initial.containerTypeId)
  const [remarks, setRemarks] = useState(initial.remarks)
  const [isBackToBack, setIsBackToBack] = useState(initial.isBackToBack)
  const [backToBackCompanionContainerNo, setBackToBackCompanionContainerNo] = useState(
    initial.backToBackCompanionContainerNo,
  )
  const [backToBackCompanionContainerSizeId, setBackToBackCompanionContainerSizeId] = useState<
    number | ''
  >(initial.backToBackCompanionContainerSizeId)
  const [backToBackCompanionContainerTypeId, setBackToBackCompanionContainerTypeId] = useState<
    number | ''
  >(initial.backToBackCompanionContainerTypeId)
  const [demurrageBlock, setDemurrageBlock] = useState<string | null>(null)
  const [checkingValidation, setCheckingValidation] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const containerIsoError = containerNumberError(containerNo)

  useEffect(() => {
    setShippingLineId(initial.shippingLineId)
    setContainerNo(initial.containerNo)
    setContainerSizeId(initial.containerSizeId)
    setContainerTypeId(initial.containerTypeId)
    setRemarks(initial.remarks)
    setIsBackToBack(initial.isBackToBack)
    setBackToBackCompanionContainerNo(initial.backToBackCompanionContainerNo)
    setBackToBackCompanionContainerSizeId(initial.backToBackCompanionContainerSizeId)
    setBackToBackCompanionContainerTypeId(initial.backToBackCompanionContainerTypeId)
  }, [initial])

  useEffect(() => {
    if (
      shippingLineId === '' ||
      containerSizeId === '' ||
      containerTypeId === '' ||
      !containerNo.trim() ||
      containerIsoError
    ) {
      setDemurrageBlock(null)
      setDuplicateWarning(null)
      return
    }

    setCheckingValidation(true)
    const timer = window.setTimeout(() => {
      preAdviceApi
        .validateContainer({
          containerNo: normalizeContainerNo(containerNo),
          shippingLineId,
          containerSizeId,
          containerTypeId,
          excludePreAdviceId,
        })
        .then(({ data }) => {
          setDuplicateWarning(
            data.duplicate.isDuplicate ? formatPreAdviceDuplicateWarning(data.duplicate) : null,
          )
          setDemurrageBlock(
            data.demurrageBlock.isBlocked
              ? data.demurrageBlock.message ?? 'Outstanding demurrage must be settled first.'
              : null,
          )
        })
        .catch(() => {
          setDemurrageBlock(null)
          setDuplicateWarning(null)
        })
        .finally(() => setCheckingValidation(false))
    }, 400)

    return () => window.clearTimeout(timer)
  }, [shippingLineId, containerNo, containerSizeId, containerTypeId, excludePreAdviceId, containerIsoError])

  const selectedSizeLabel = useMemo(() => {
    if (containerSizeId === '') return ''
    const size = lookups.containerSizes.find((item) => item.id === containerSizeId)
    return size ? formatContainerSizeLabel(size.label) : ''
  }, [containerSizeId, lookups.containerSizes])

  const isTwentyFoot = useMemo(() => {
    if (containerSizeId === '') return false
    const size = lookups.containerSizes.find((item) => item.id === containerSizeId)
    return size ? getCapacityGroupKey(size.label) === '20' : false
  }, [containerSizeId, lookups.containerSizes])

  const twentyFootSizes = useMemo(
    () => lookups.containerSizes.filter((s) => getCapacityGroupKey(s.label) === '20'),
    [lookups.containerSizes],
  )

  const clearBackToBackFields = () => {
    setIsBackToBack(false)
    setBackToBackCompanionContainerNo('')
    setBackToBackCompanionContainerSizeId('')
    setBackToBackCompanionContainerTypeId('')
  }

  useEffect(() => {
    if (!isTwentyFoot) clearBackToBackFields()
  }, [isTwentyFoot])

  const companionSizeLabel = useMemo(() => {
    if (backToBackCompanionContainerSizeId === '') return ''
    const size = lookups.containerSizes.find((s) => s.id === backToBackCompanionContainerSizeId)
    return size ? formatContainerSizeLabel(size.label) : ''
  }, [backToBackCompanionContainerSizeId, lookups.containerSizes])

  const companionIsoError =
    isBackToBack && isTwentyFoot ? containerNumberError(backToBackCompanionContainerNo) : null
  const companionSameAsPrimary =
    isBackToBack &&
    isTwentyFoot &&
    backToBackCompanionContainerNo.trim() &&
    normalizeContainerNo(containerNo) === normalizeContainerNo(backToBackCompanionContainerNo)

  const backToBackInvalid =
    isBackToBack &&
    isTwentyFoot &&
    (!backToBackCompanionContainerNo.trim() ||
      backToBackCompanionContainerSizeId === '' ||
      backToBackCompanionContainerTypeId === '' ||
      Boolean(companionIsoError) ||
      companionSameAsPrimary)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (
      shippingLineId === '' ||
      containerSizeId === '' ||
      containerTypeId === '' ||
      !containerNo.trim() ||
      containerIsoError ||
      demurrageBlock ||
      duplicateWarning ||
      (requireCroLink && !croLinked) ||
      (requireLegacyDocument && !legacyDocumentReady) ||
      (isTwentyFoot && isBackToBack && !companionLegacyDocumentReady) ||
      backToBackInvalid
    ) {
      return
    }
    onSubmit({
      shippingLineId,
      containerNo: normalizeContainerNo(containerNo),
      containerSizeId,
      containerTypeId,
      remarks: remarks.trim() || undefined,
      isBackToBack: isTwentyFoot && isBackToBack,
      backToBackCompanionContainerNo:
        isTwentyFoot && isBackToBack
          ? normalizeContainerNo(backToBackCompanionContainerNo)
          : undefined,
      backToBackCompanionContainerSizeId:
        isTwentyFoot && isBackToBack && backToBackCompanionContainerSizeId !== ''
          ? backToBackCompanionContainerSizeId
          : undefined,
      backToBackCompanionContainerTypeId:
        isTwentyFoot && isBackToBack && backToBackCompanionContainerTypeId !== ''
          ? backToBackCompanionContainerTypeId
          : undefined,
    })
  }

  const canSubmit =
    shippingLineId !== '' &&
    containerSizeId !== '' &&
    containerTypeId !== '' &&
    containerNo.trim().length > 0 &&
    !containerIsoError &&
    !demurrageBlock &&
    !duplicateWarning &&
    !checkingValidation &&
    (!requireCroLink || croLinked) &&
    (!requireLegacyDocument || legacyDocumentReady) &&
    (!isTwentyFoot || !isBackToBack || companionLegacyDocumentReady) &&
    !backToBackInvalid

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
          Container information
        </Typography>
        {lockCatalogFields && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            Fields below were filled from the verified CRO/eDO and are locked.
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth required sx={fieldSx} disabled={lockCatalogFields}>
            <InputLabel>Shipping line</InputLabel>
            <Select
              label="Shipping line"
              value={shippingLineId}
              onChange={(e) => setShippingLineId(e.target.value as number | '')}
            >
              {lookups.shippingLines.length === 0 ? (
                <MenuItem disabled value="">
                  No shipping lines available
                </MenuItem>
              ) : (
                lookups.shippingLines.map((line) => (
                  <MenuItem key={line.id} value={line.id}>
                    {line.name} ({line.code})
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          <Box sx={preAdviceUnitSectionSx('primary')}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 2 }}>
              {preAdviceUnitRoleLabel('primary')}
              {containerNo.trim() ? ` · ${containerNo.trim().toUpperCase()}` : ''}
            </Typography>
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
              onChange={(e) => setContainerNo(formatContainerNumberInput(e.target.value))}
              placeholder="e.g. MSCU1234567"
              disabled={lockCatalogFields}
              error={Boolean(containerIsoError)}
              helperText={
                containerIsoError ??
                'ISO 6346: 4 letters + 7 digits (11 characters, valid check digit).'
              }
              slotProps={{
                htmlInput: { maxLength: 11, style: { fontFamily: 'monospace' } },
              }}
              sx={fieldSx}
            />

            <FormControl fullWidth required sx={fieldSx} disabled={lockCatalogFields}>
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

            <FormControl fullWidth required sx={fieldSx} disabled={lockCatalogFields}>
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
            {primaryCroSlot}
          </Box>

          {isTwentyFoot && (
            <Box sx={{ mt: 0.5 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isBackToBack}
                    onChange={(e) => {
                      if (e.target.checked) setIsBackToBack(true)
                      else clearBackToBackFields()
                    }}
                  />
                }
                label="Back-to-Back"
                sx={{ m: 0, '& .MuiFormControlLabel-label': { fontWeight: 700 } }}
              />
              <Collapse in={isBackToBack}>
                <Box sx={{ ...preAdviceUnitSectionSx('companion'), mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 2 }}>
                    {preAdviceUnitRoleLabel('companion')}
                    {backToBackCompanionContainerNo.trim()
                      ? ` · ${backToBackCompanionContainerNo.trim().toUpperCase()}`
                      : ''}
                  </Typography>
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
                    label="Companion container number"
                    value={backToBackCompanionContainerNo}
                    onChange={(e) =>
                      setBackToBackCompanionContainerNo(formatContainerNumberInput(e.target.value))
                    }
                    error={Boolean(companionIsoError) || Boolean(companionSameAsPrimary)}
                    helperText={
                      companionSameAsPrimary
                        ? 'Must differ from the primary container above.'
                        : companionIsoError ?? 'ISO 6346 (11 characters).'
                    }
                    slotProps={{
                      htmlInput: { maxLength: 11, style: { fontFamily: 'monospace' } },
                    }}
                    sx={fieldSx}
                  />
                  <FormControl fullWidth required sx={fieldSx}>
                    <InputLabel>Container size</InputLabel>
                    <Select
                      label="Container size"
                      value={backToBackCompanionContainerSizeId}
                      onChange={(e) =>
                        setBackToBackCompanionContainerSizeId(e.target.value as number | '')
                      }
                      renderValue={() => companionSizeLabel || 'Select size'}
                    >
                      {twentyFootSizes.length === 0 ? (
                        <MenuItem disabled value="">No 20ft sizes configured</MenuItem>
                      ) : (
                        twentyFootSizes.map((size) => (
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
                      value={backToBackCompanionContainerTypeId}
                      onChange={(e) =>
                        setBackToBackCompanionContainerTypeId(e.target.value as number | '')
                      }
                    >
                      {lookups.containerTypes.map((type) => (
                        <MenuItem key={type.id} value={type.id}>
                          {type.code} — {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                  {companionCroSlot}
                <FormHelperText sx={{ mt: 1 }}>
                  Use when both 20ft units travel together to the same container yard (not port diversion).
                </FormHelperText>
                </Box>
              </Collapse>
            </Box>
          )}
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

      {requireCroLink && !croLinked && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Attach and verify the primary container CRO/eDO in the primary section before creating this pre-forecast.
        </Alert>
      )}

      {requireLegacyDocument && !legacyDocumentReady && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Upload CRO/eDO for the primary container before creating the draft.
        </Alert>
      )}

      {isTwentyFoot && isBackToBack && !companionLegacyDocumentReady && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Upload CRO/eDO for the companion container in the second section before creating the draft.
        </Alert>
      )}

      {freeTimeExpired && croLinked && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          {croFreeTimeExpiredMessage(freeTimeUntil)} Settle charges under{' '}
          <strong>Demurrage</strong> in the menu before submitting.
        </Alert>
      )}

      {demurrageBlock && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {demurrageBlock}{' '}
          <strong>Settle demurrage and detention under Demurrage in the menu before creating a new pre-forecast.</strong>
        </Alert>
      )}

      {duplicateWarning && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          {duplicateWarning} Wait for that request to finish or contact support before creating another draft.
        </Alert>
      )}

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
