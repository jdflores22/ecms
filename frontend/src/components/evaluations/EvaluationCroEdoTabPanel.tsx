import { Alert, Box, Button, Chip, Stack, TextField, Typography } from '@mui/material'

import SaveIcon from '@mui/icons-material/Save'

import { Link as RouterLink } from 'react-router-dom'

import PreAdviceCroEdoContextPanel from '../preAdvice/PreAdviceCroEdoContextPanel'

import { EvaluationTabShell, EvaluationTwoColumnBody } from './EvaluationDetailFieldGrid'

import type { DemurrageBilling, PreAdvice, PreAdviceDocument } from '../../services/api'

import { paymentStatusLabel as paymentStatusLabels } from '../../utils/truckerPayment'

import { isCroFreeTimeExpired } from '../../utils/croFreeTime'

import { croFreeTimeLockedFromIcs } from '../../utils/evaluationCroEdo'
import { croEdoLinkTypeChipLabel } from '../../utils/croEdoDisplay'
import { getPreAdviceContainerUnit } from '../../utils/preAdviceContainerUnit'
import { docIdentityUnit } from '../../utils/preAdviceIdentityUnit'
import {
  preAdviceUnitRoleLabel,
  preAdviceUnitSectionSx,
} from '../preAdvice/preAdviceUnitSectionSx'

type FreeTimeUnit = 'Primary' | 'Companion'

type EvaluationCroEdoTabPanelProps = {
  item: PreAdvice
  documents: PreAdviceDocument[]
  freeTimeDate: string
  companionFreeTimeDate: string
  onFreeTimeDateChange: (value: string) => void
  onCompanionFreeTimeDateChange: (value: string) => void
  canEdit: boolean
  saving: boolean
  saveError: string
  onSaveFreeTime: (unit: FreeTimeUnit) => void
  detDemBilling: DemurrageBilling | null
  detDemDetailPath: string | null
  showExpiredRejectAction: boolean
  onOpenRejectExpired: () => void
}

function FreeTimeDateEditor({
  value,
  onChange,
  canEdit,
  saving,
  lockedFromIcs,
  onSave,
}: {
  value: string
  onChange: (v: string) => void
  canEdit: boolean
  saving: boolean
  lockedFromIcs: boolean
  onSave: () => void
}) {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.6 }}>
        Free time date
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
        Last day of free demurrage — if expired, use DET-DEM (shipping line receipt) before approval.
      </Typography>
      <TextField
        label="Free time date"
        type="date"
        size="small"
        required
        fullWidth
        disabled={!canEdit || saving || lockedFromIcs}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        helperText={
          lockedFromIcs ? 'From verified ICS QR (read-only).' : 'Match the date on the attached CRO/eDO.'
        }
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
      />
      {canEdit && !lockedFromIcs && (
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={saving || !value}
          onClick={onSave}
          sx={{ fontWeight: 700, borderRadius: 2, mt: 1.5 }}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      )}
    </Box>
  )
}

export default function EvaluationCroEdoTabPanel({
  item,
  documents,
  freeTimeDate,
  companionFreeTimeDate,
  onFreeTimeDateChange,
  onCompanionFreeTimeDateChange,
  canEdit,
  saving,
  saveError,
  onSaveFreeTime,
  detDemBilling,
  detDemDetailPath,
  showExpiredRejectAction,
  onOpenRejectExpired,
}: EvaluationCroEdoTabPanelProps) {
  const lockedFromIcs = croFreeTimeLockedFromIcs(item)
  const ctx = item.croEdoContext
  const hasReference = Boolean(ctx || documents.some((d) => d.category === 'CroEdo'))

  const primaryExpired = Boolean(freeTimeDate && isCroFreeTimeExpired(freeTimeDate))
  const companionExpired = Boolean(
    item.isBackToBack && companionFreeTimeDate && isCroFreeTimeExpired(companionFreeTimeDate),
  )
  const expired = primaryExpired || companionExpired

  const detDemPaid = detDemBilling?.status === 'Paid'

  const renderTruckerCroSection = () => {
    if (!item.isBackToBack) {
      if (!hasReference) {
        return (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            No CRO/eDO attachment on this pre-forecast.
          </Typography>
        )
      }
      return (
        <Box sx={{ mt: 1 }}>
          <PreAdviceCroEdoContextPanel item={item} documents={documents} referenceOnly />
        </Box>
      )
    }

    const primaryUnit = getPreAdviceContainerUnit(item, 'Primary')
    const companionUnit = getPreAdviceContainerUnit(item, 'Companion')
    const primaryDocs = documents.filter(
      (d) => d.category !== 'CroEdo' || docIdentityUnit(d) === 'Primary',
    )
    const companionDocs = documents.filter(
      (d) => d.category === 'CroEdo' && docIdentityUnit(d) === 'Companion',
    )
    const companionItem: PreAdvice = {
      ...item,
      croEdoContext: undefined,
      croEdoReferenceNo: undefined,
    }

    return (
      <Stack spacing={2} sx={{ mt: 1 }}>
        <Box sx={preAdviceUnitSectionSx('primary')}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, display: 'block', mb: 1.5 }}
          >
            {preAdviceUnitRoleLabel('primary', 'containerAb')} · {primaryUnit.containerNo}
          </Typography>
          {primaryDocs.some((d) => d.category === 'CroEdo') || ctx || item.croEdoReferenceNo ? (
            <PreAdviceCroEdoContextPanel item={item} documents={primaryDocs} referenceOnly />
          ) : (
            <Typography variant="body2" color="text.secondary">No CRO/eDO for this container.</Typography>
          )}
          <FreeTimeDateEditor
            value={freeTimeDate}
            onChange={onFreeTimeDateChange}
            canEdit={canEdit}
            saving={saving}
            lockedFromIcs={lockedFromIcs}
            onSave={() => onSaveFreeTime('Primary')}
          />
        </Box>
        <Box sx={preAdviceUnitSectionSx('companion')}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, display: 'block', mb: 1.5 }}
          >
            {preAdviceUnitRoleLabel('companion', 'containerAb')} · {companionUnit.containerNo}
          </Typography>
          {companionDocs.length > 0 ? (
            <PreAdviceCroEdoContextPanel item={companionItem} documents={companionDocs} referenceOnly />
          ) : (
            <Typography variant="body2" color="text.secondary">No CRO/eDO for this container.</Typography>
          )}
          <FreeTimeDateEditor
            value={companionFreeTimeDate}
            onChange={onCompanionFreeTimeDateChange}
            canEdit={canEdit}
            saving={saving}
            lockedFromIcs={false}
            onSave={() => onSaveFreeTime('Companion')}
          />
        </Box>
      </Stack>
    )
  }

  return (
    <EvaluationTabShell
      title="CRO / eDO — return CY & free time"
      headerExtra={
        croEdoLinkTypeChipLabel(ctx?.linkType)
          ? (
            <Chip
              size="small"
              label={croEdoLinkTypeChipLabel(ctx?.linkType)}
              color="success"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
          )
          : undefined
      }
    >
      {expired && !detDemPaid && (
        <Alert
          severity="error"
          sx={{ borderRadius: 2 }}
          action={
            showExpiredRejectAction ? (
              <Button color="inherit" size="small" sx={{ fontWeight: 700 }} onClick={onOpenRejectExpired}>
                Reject
              </Button>
            ) : detDemBilling && detDemDetailPath ? (
              <Button
                component={RouterLink}
                size="small"
                color="inherit"
                sx={{ fontWeight: 700 }}
                to={detDemDetailPath}
              >
                Open DET-DEM
              </Button>
            ) : undefined
          }
        >
          {detDemBilling
            ? `Free time expired for ${item.isBackToBack && companionExpired && primaryExpired ? 'both containers' : 'at least one container'}. DET-DEM ${detDemBilling.referenceNo} (${paymentStatusLabels[detDemBilling.status] ?? detDemBilling.status}) is linked to this pre-forecast — trucker pays the shipping line and uploads receipt here.`
            : 'Free time expired — approval blocked until you reject and the trucker settles DET-DEM with the shipping line.'}
        </Alert>
      )}

      {detDemPaid && (
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          Shipping line DET-DEM receipt verified ({detDemBilling?.referenceNo}). You may approve this pre-forecast
          even though the CRO/eDO free date is in the past.
        </Alert>
      )}

      {saveError && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {saveError}
        </Alert>
      )}

      {item.isBackToBack ? (
        <>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.6 }}>
            From trucker CRO/eDO
          </Typography>
          {renderTruckerCroSection()}
        </>
      ) : (
        <EvaluationTwoColumnBody
          left={
            <>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.6 }}>
                From trucker CRO/eDO
              </Typography>
              {renderTruckerCroSection()}
            </>
          }
          right={
            <FreeTimeDateEditor
              value={freeTimeDate}
              onChange={onFreeTimeDateChange}
              canEdit={canEdit}
              saving={saving}
              lockedFromIcs={lockedFromIcs}
              onSave={() => onSaveFreeTime('Primary')}
            />
          }
        />
      )}
    </EvaluationTabShell>
  )
}
