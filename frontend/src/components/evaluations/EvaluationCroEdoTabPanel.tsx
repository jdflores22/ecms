import { Alert, Box, Button, Chip, TextField, Typography } from '@mui/material'

import SaveIcon from '@mui/icons-material/Save'

import { Link as RouterLink } from 'react-router-dom'

import PreAdviceCroEdoContextPanel from '../preAdvice/PreAdviceCroEdoContextPanel'

import { EvaluationTabShell, EvaluationTwoColumnBody } from './EvaluationDetailFieldGrid'

import type { DemurrageBilling, PreAdvice, PreAdviceDocument } from '../../services/api'

import { paymentStatusLabel as paymentStatusLabels } from '../../utils/truckerPayment'

import { isCroFreeTimeExpired } from '../../utils/croFreeTime'

import { croFreeTimeLockedFromIcs } from '../../utils/evaluationCroEdo'



function linkTypeLabel(linkType: string): string {

  return linkType === 'IcsVerified' ? 'ICS CRO/eDO (QR verified)' : 'Legacy CRO/eDO upload'

}



type EvaluationCroEdoTabPanelProps = {

  item: PreAdvice

  documents: PreAdviceDocument[]

  freeTimeDate: string

  onFreeTimeDateChange: (value: string) => void

  canEdit: boolean

  saving: boolean

  saveError: string

  onSave: () => void

  detDemBilling: DemurrageBilling | null

  detDemDetailPath: string | null

  showExpiredRejectAction: boolean

  onOpenRejectExpired: () => void

}



export default function EvaluationCroEdoTabPanel({

  item,

  documents,

  freeTimeDate,

  onFreeTimeDateChange,

  canEdit,

  saving,

  saveError,

  onSave,

  detDemBilling,

  detDemDetailPath,

  showExpiredRejectAction,

  onOpenRejectExpired,

}: EvaluationCroEdoTabPanelProps) {

  const expired = Boolean(freeTimeDate && isCroFreeTimeExpired(freeTimeDate))

  const lockedFromIcs = croFreeTimeLockedFromIcs(item)

  const ctx = item.croEdoContext

  const hasReference = Boolean(ctx || documents.some((d) => d.category === 'CroEdo'))

  const detDemPaid = detDemBilling?.status === 'Paid'



  return (

    <EvaluationTabShell

      title="CRO / eDO — return CY & free time"

      headerExtra={

        ctx?.linkType ? (

          <Chip

            size="small"

            label={linkTypeLabel(ctx.linkType)}

            color={ctx.linkType === 'IcsVerified' ? 'success' : 'default'}

            sx={{ fontWeight: 700 }}

          />

        ) : undefined

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

            ? `Free time expired. DET-DEM ${detDemBilling.referenceNo} (${paymentStatusLabels[detDemBilling.status] ?? detDemBilling.status}) is linked to this pre-forecast — trucker pays the shipping line and uploads receipt here.`

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



      <EvaluationTwoColumnBody

        left={

          <>

            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.6 }}>

              From trucker CRO/eDO

            </Typography>

            {hasReference ? (

              <Box sx={{ mt: 1 }}>

                <PreAdviceCroEdoContextPanel item={item} documents={documents} referenceOnly />

              </Box>

            ) : (

              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>

                No CRO/eDO attachment on this pre-forecast.

              </Typography>

            )}

          </>

        }

        right={

          <>

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

              value={freeTimeDate}

              onChange={(e) => onFreeTimeDateChange(e.target.value)}

              slotProps={{ inputLabel: { shrink: true } }}

              helperText={lockedFromIcs ? 'From verified ICS QR (read-only).' : 'Match the date on the attached CRO/eDO.'}

              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}

            />

            {canEdit && !lockedFromIcs && (

              <Button

                variant="contained"

                startIcon={<SaveIcon />}

                disabled={saving || !freeTimeDate}

                onClick={onSave}

                sx={{ fontWeight: 700, borderRadius: 2, mt: 1.5 }}

              >

                {saving ? 'Saving…' : 'Save'}

              </Button>

            )}

          </>

        }

      />

    </EvaluationTabShell>

  )

}


