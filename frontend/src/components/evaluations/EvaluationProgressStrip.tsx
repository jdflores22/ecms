import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import { Box, Button, Paper, Typography } from '@mui/material'
import { LOGICTECK_QR } from '../../config/logicteckQr'
import type { Evaluation, PreAdvice, QrBooking, Schedule } from '../../services/api'
import { formatDateTime, formatScheduleSlot } from '../../utils/datetime'
import { ICS_PRIMARY, hexToRgba } from '../layout/DetailPagePrimitives'

type StepState = 'complete' | 'current' | 'upcoming' | 'error'

export type EvaluationProgressStep = {
  label: string
  detail: string
  state: StepState
  action?: { label: string; onClick: () => void; icon?: 'qr' | 'photos' }
}

const PENDING_STATUSES = ['Submitted', 'UnderEvaluation']

export function buildEvaluationProgressSteps(
  item: PreAdvice,
  decision: Evaluation | null,
  schedule: Schedule | null,
  scheduleLoading: boolean,
  qrBooking: QrBooking | null,
  qrLoading: boolean,
  onViewQr?: () => void,
  onReviewPhotos?: () => void,
  onOpenSchedule?: () => void,
): EvaluationProgressStep[] {
  const isPending = PENDING_STATUSES.includes(item.status)
  const isApproved = item.status === 'Approved'
  const isRejected = item.status === 'Rejected'
  const isForCompliance = item.status === 'ForCompliance'

  const evaluationStep = (): EvaluationProgressStep => {
    if (isPending) {
      return {
        label: 'Shipping line evaluation',
        detail: 'Review container photos, then approve with a CY or reject with remarks',
        state: 'current',
        action: onReviewPhotos ? { label: 'Review photos', onClick: onReviewPhotos, icon: 'photos' } : undefined,
      }
    }
    if (isRejected && decision) {
      return {
        label: 'Shipping line evaluation',
        detail: `Rejected by ${decision.evaluatorName}${decision.remarks ? ` — ${decision.remarks}` : ''} · ${formatDateTime(decision.evaluatedAt)}`,
        state: 'error',
      }
    }
    if (isForCompliance && decision) {
      return {
        label: 'Shipping line evaluation',
        detail: `Returned for compliance${decision.remarks ? ` — ${decision.remarks}` : ''} · ${formatDateTime(decision.evaluatedAt)}`,
        state: 'error',
      }
    }
    if (decision) {
      return {
        label: 'Shipping line evaluation',
        detail: `Approved by ${decision.evaluatorName}${decision.depotName ? ` · ${decision.depotName}` : ''} · ${formatDateTime(decision.evaluatedAt)}`,
        state: 'complete',
      }
    }
    return {
      label: 'Shipping line evaluation',
      detail: 'Awaiting evaluator decision',
      state: 'upcoming',
    }
  }

  const scheduleStep = (): EvaluationProgressStep => {
    if (!isApproved) {
      return {
        label: 'Return scheduling',
        detail: 'Depot assigns date, slot, and trucker after approval',
        state: 'upcoming',
      }
    }
    if (scheduleLoading) {
      return {
        label: 'Return scheduling',
        detail: 'Loading schedule details…',
        state: 'current',
        action: onOpenSchedule
          ? { label: 'View schedule tab', onClick: onOpenSchedule }
          : undefined,
      }
    }
    if (!schedule) {
      return {
        label: 'Return scheduling',
        detail: 'Waiting for depot to create the return schedule',
        state: 'current',
        action: onOpenSchedule
          ? { label: 'View schedule tab', onClick: onOpenSchedule }
          : undefined,
      }
    }
    if (schedule.status === 'WaitingSchedule') {
      return {
        label: 'Return scheduling',
        detail: 'Depot is assigning date, time slot, and trucker',
        state: 'current',
        action: onOpenSchedule
          ? { label: 'View schedule tab', onClick: onOpenSchedule }
          : undefined,
      }
    }
    const slotDetail = schedule.date
      ? formatScheduleSlot(schedule.date, schedule.time) +
        (schedule.slotNo > 0 ? ` · Slot ${schedule.slotNo}` : '') +
        (schedule.truckerName ? ` · ${schedule.truckerName}` : '')
      : schedule.depotName
    return {
      label: 'Return scheduling',
      detail: `${schedule.status === 'Confirmed' || schedule.status === 'Completed' ? 'Confirmed' : 'Scheduled'} · ${slotDetail}`,
      state: 'complete',
      action: onOpenSchedule
        ? { label: 'View return schedule', onClick: onOpenSchedule }
        : undefined,
    }
  }

  const qrStep = (): EvaluationProgressStep => {
    const scheduleReady = schedule?.status === 'Confirmed' || schedule?.status === 'Completed'
    if (!isApproved || !scheduleReady) {
      return {
        label: 'Booking QR',
        detail: 'Published after depot confirms the return',
        state: 'upcoming',
      }
    }
    if (qrLoading) {
      return {
        label: 'Booking QR',
        detail: 'Publishing booking QR…',
        state: 'current',
      }
    }
    if (qrBooking) {
      return {
        label: 'Booking QR',
        detail: `Published for LOGICTECK integration · Ref ${qrBooking.qrCode}`,
        state: 'complete',
        action: onViewQr ? { label: LOGICTECK_QR.viewQr, onClick: onViewQr, icon: 'qr' } : undefined,
      }
    }
    return {
      label: 'Booking QR',
      detail: LOGICTECK_QR.emptyState,
      state: 'current',
    }
  }

  return [
    {
      label: 'Pre-forecast submitted',
      detail: `${item.truckerName} · ${formatDateTime(item.createdAt)}`,
      state: 'complete',
    },
    evaluationStep(),
    scheduleStep(),
    qrStep(),
  ]
}

/** Trucker pre-forecast detail — draft and pending messaging without evaluation API access. */
export function buildPreAdviceProgressSteps(
  item: PreAdvice,
  schedule: Schedule | null,
  scheduleLoading: boolean,
  qrBooking: QrBooking | null,
  qrLoading: boolean,
  onViewQr?: () => void,
  onManagePhotos?: () => void,
  onOpenSchedule?: () => void,
): EvaluationProgressStep[] {
  const isDraft = item.status === 'Draft'
  const isPending = PENDING_STATUSES.includes(item.status)
  const isApproved = item.status === 'Approved'
  const isRejected = item.status === 'Rejected'
  const isForCompliance = item.status === 'ForCompliance'

  const submittedStep = (): EvaluationProgressStep => {
    if (isDraft) {
      return {
        label: 'Pre-forecast draft',
        detail: 'Add container identity photos, then submit for evaluation',
        state: 'current',
        action: onManagePhotos
          ? { label: 'Add photos', onClick: onManagePhotos, icon: 'photos' }
          : undefined,
      }
    }
    return {
      label: 'Pre-forecast submitted',
      detail: `${item.truckerName} · ${formatDateTime(item.createdAt)}`,
      state: 'complete',
    }
  }

  const evaluationStep = (): EvaluationProgressStep => {
    if (isDraft) {
      return {
        label: 'Shipping line evaluation',
        detail: 'Submit the pre-forecast to begin evaluation',
        state: 'upcoming',
      }
    }
    if (isRejected) {
      return {
        label: 'Shipping line evaluation',
        detail: 'This request was rejected',
        state: 'error',
      }
    }
    if (isForCompliance) {
      return {
        label: 'Shipping line evaluation',
        detail:
          item.complianceRemarks ??
          'Corrections requested — update photos or details, then resubmit',
        state: 'current',
        action: onManagePhotos
          ? { label: 'Fix & resubmit', onClick: onManagePhotos, icon: 'photos' }
          : undefined,
      }
    }
    if (isApproved) {
      return {
        label: 'Shipping line evaluation',
        detail: 'Approved by shipping line',
        state: 'complete',
      }
    }
    if (isPending) {
      return {
        label: 'Shipping line evaluation',
        detail:
          item.status === 'UnderEvaluation'
            ? 'A shipping-line evaluator is reviewing your request'
            : 'Waiting for a shipping-line evaluator to review this request',
        state: 'current',
        action:
          onManagePhotos && item.status === 'Submitted'
            ? { label: 'Manage photos', onClick: onManagePhotos, icon: 'photos' }
            : undefined,
      }
    }
    return {
      label: 'Shipping line evaluation',
      detail: 'Awaiting evaluator decision',
      state: 'upcoming',
    }
  }

  const scheduleStep = (): EvaluationProgressStep => {
    if (!isApproved) {
      return {
        label: 'Return scheduling',
        detail: 'Depot assigns date, slot, and trucker after approval',
        state: 'upcoming',
      }
    }
    if (scheduleLoading) {
      return {
        label: 'Return scheduling',
        detail: 'Loading schedule details…',
        state: 'current',
        action: onOpenSchedule
          ? { label: 'View schedule tab', onClick: onOpenSchedule }
          : undefined,
      }
    }
    if (!schedule) {
      return {
        label: 'Return scheduling',
        detail: 'Waiting for depot to create the return schedule',
        state: 'current',
        action: onOpenSchedule
          ? { label: 'View schedule tab', onClick: onOpenSchedule }
          : undefined,
      }
    }
    if (schedule.status === 'WaitingSchedule') {
      return {
        label: 'Return scheduling',
        detail: 'Depot is assigning date, time slot, and trucker',
        state: 'current',
        action: onOpenSchedule
          ? { label: 'View schedule tab', onClick: onOpenSchedule }
          : undefined,
      }
    }
    const slotDetail = schedule.date
      ? formatScheduleSlot(schedule.date, schedule.time) +
        (schedule.slotNo > 0 ? ` · Slot ${schedule.slotNo}` : '') +
        (schedule.truckerName ? ` · ${schedule.truckerName}` : '')
      : schedule.depotName
    return {
      label: 'Return scheduling',
      detail: `${schedule.status === 'Confirmed' || schedule.status === 'Completed' ? 'Confirmed' : 'Scheduled'} · ${slotDetail}`,
      state: 'complete',
      action: onOpenSchedule
        ? { label: 'View return schedule', onClick: onOpenSchedule }
        : undefined,
    }
  }

  const qrStep = (): EvaluationProgressStep => {
    const scheduleReady = schedule?.status === 'Confirmed' || schedule?.status === 'Completed'
    if (!isApproved || !scheduleReady) {
      return {
        label: 'Booking QR',
        detail: 'Published after depot confirms the return',
        state: 'upcoming',
      }
    }
    if (qrLoading) {
      return {
        label: 'Booking QR',
        detail: 'Publishing booking QR…',
        state: 'current',
      }
    }
    if (qrBooking) {
      return {
        label: 'Booking QR',
        detail: `Published for LOGICTECK integration · Ref ${qrBooking.qrCode}`,
        state: 'complete',
        action: onViewQr ? { label: LOGICTECK_QR.viewQr, onClick: onViewQr, icon: 'qr' } : undefined,
      }
    }
    return {
      label: 'Booking QR',
      detail: LOGICTECK_QR.emptyState,
      state: 'current',
    }
  }

  return [submittedStep(), evaluationStep(), scheduleStep(), qrStep()]
}

const stepCircleSx = (state: StepState) => {
  if (state === 'complete') {
    return {
      bgcolor: 'rgba(46, 125, 50, 0.12)',
      color: '#2E7D32',
      border: '1px solid rgba(46, 125, 50, 0.35)',
    }
  }
  if (state === 'error') {
    return {
      bgcolor: 'rgba(211, 47, 47, 0.1)',
      color: '#C62828',
      border: '1px solid rgba(211, 47, 47, 0.35)',
    }
  }
  if (state === 'current') {
    return {
      bgcolor: hexToRgba(ICS_PRIMARY, 0.1),
      color: ICS_PRIMARY,
      border: `1px solid ${hexToRgba(ICS_PRIMARY, 0.35)}`,
      boxShadow: `0 0 0 3px ${hexToRgba(ICS_PRIMARY, 0.08)}`,
    }
  }
  return {
    bgcolor: 'action.hover',
    color: 'text.disabled',
    border: '1px solid',
    borderColor: 'divider',
  }
}

function StepIcon({ state }: { state: StepState }) {
  if (state === 'complete') {
    return <CheckCircleIcon sx={{ fontSize: 20 }} />
  }
  if (state === 'error') {
    return <RadioButtonUncheckedIcon sx={{ fontSize: 20 }} />
  }
  return <RadioButtonUncheckedIcon sx={{ fontSize: 20 }} />
}

type EvaluationProgressStripProps = {
  steps: EvaluationProgressStep[]
}

export default function EvaluationProgressStrip({ steps }: EvaluationProgressStripProps) {
  const hasQrAction = steps.some((s) => s.action)

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        mb: 3,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#fff',
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Evaluation progress
        </Typography>
        {hasQrAction && (
          <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
            {LOGICTECK_QR.integrationComingSoon}
          </Typography>
        )}
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
          gap: { xs: 1.5, md: 1 },
        }}
      >
        {steps.map((step, index) => (
          <Box
            key={step.label}
            sx={{
              display: 'flex',
              gap: 1.25,
              alignItems: 'flex-start',
              position: 'relative',
              pr: { md: index < steps.length - 1 ? 1 : 0 },
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                ...stepCircleSx(step.state),
              }}
            >
              <StepIcon state={step.state} />
            </Box>
            <Box sx={{ minWidth: 0, pt: 0.25 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: step.state === 'current' || step.state === 'error' ? 700 : 600,
                  color:
                    step.state === 'upcoming'
                      ? 'text.secondary'
                      : step.state === 'error'
                        ? 'error.main'
                        : 'text.primary',
                }}
              >
                {step.label}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, lineHeight: 1.4 }}>
                {step.detail}
              </Typography>
              {step.action && (
                <Button
                  size="small"
                  startIcon={
                    step.action.icon === 'qr' ? (
                      <QrCode2OutlinedIcon />
                    ) : step.action.icon === 'photos' ? (
                      <PhotoCameraOutlinedIcon />
                    ) : undefined
                  }
                  onClick={step.action.onClick}
                  sx={{
                    mt: 0.75,
                    px: 0,
                    minWidth: 0,
                    fontWeight: 600,
                    textTransform: 'none',
                    justifyContent: 'flex-start',
                  }}
                >
                  {step.action.label}
                </Button>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  )
}
