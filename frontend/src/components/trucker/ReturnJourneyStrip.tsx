import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import { Box, Paper, Typography } from '@mui/material'
import type { QrBooking, Schedule } from '../../services/api'
import { ICS_PRIMARY, hexToRgba } from '../layout/DetailPagePrimitives'

type StepState = 'complete' | 'current' | 'upcoming'

export type ReturnJourneyStep = {
  label: string
  detail: string
  state: StepState
}

export function buildReturnJourneySteps(
  schedule: Schedule,
  paymentStatus: string,
  qrBooking: QrBooking | null,
  qrLoading: boolean,
): ReturnJourneyStep[] {
  if (schedule.status === 'Cancelled') {
    return [
      { label: 'Return assigned', detail: 'Cancelled by depot', state: 'upcoming' },
      { label: 'Payment', detail: 'Not required', state: 'upcoming' },
      { label: 'Booking QR', detail: 'Not published', state: 'upcoming' },
      { label: 'LOGICTECK integration', detail: 'Not applicable', state: 'upcoming' },
    ]
  }

  const scheduleDone = schedule.status !== 'WaitingSchedule'
  const paymentDone = paymentStatus === 'Paid'
  const paymentCurrent =
    schedule.status === 'Scheduled' &&
    (paymentStatus === 'Pending' || paymentStatus === 'ForVerification' || paymentStatus === 'Rejected')
  const qrReady = Boolean(qrBooking)
  const qrCurrent =
    (schedule.status === 'Confirmed' || schedule.status === 'Completed') &&
    paymentDone &&
    !qrReady &&
    (qrLoading || !qrBooking)
  const integrationDone = schedule.status === 'Completed'
  const integrationCurrent = qrReady && schedule.status === 'Confirmed'

  return [
    {
      label: 'Return assigned',
      detail: scheduleDone
        ? schedule.date
          ? 'Slot confirmed by depot'
          : 'Assigned to you'
        : 'Waiting for depot',
      state: scheduleDone ? 'complete' : 'current',
    },
    {
      label: 'Payment',
      detail: paymentDone
        ? 'Verified by depot'
        : paymentStatus === 'ForVerification'
          ? 'Awaiting depot review'
          : paymentStatus === 'Rejected'
            ? 'Re-upload required'
            : schedule.status === 'Scheduled'
              ? 'Upload proof to continue'
              : 'Not yet due',
      state: paymentDone ? 'complete' : paymentCurrent ? 'current' : 'upcoming',
    },
    {
      label: 'Booking QR',
      detail: qrReady
        ? 'Provides pre-forecast details to LOGICTECK'
        : qrLoading
          ? 'Publishing…'
          : paymentDone && (schedule.status === 'Confirmed' || schedule.status === 'Completed')
            ? 'Preparing booking QR'
            : 'After payment approval',
      state: qrReady ? 'complete' : qrCurrent ? 'current' : 'upcoming',
    },
    {
      label: 'LOGICTECK integration',
      detail: integrationDone
        ? 'Return completed'
        : integrationCurrent
          ? 'Coming soon — LOGICTECK will receive details from ICS'
          : 'After booking QR is published',
      state: integrationDone ? 'complete' : integrationCurrent ? 'current' : 'upcoming',
    },
  ]
}

const stepCircleSx = (state: StepState) => {
  if (state === 'complete') {
    return {
      bgcolor: 'rgba(46, 125, 50, 0.12)',
      color: '#2E7D32',
      border: '1px solid rgba(46, 125, 50, 0.35)',
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
  return <RadioButtonUncheckedIcon sx={{ fontSize: 20 }} />
}

type ReturnJourneyStripProps = {
  steps: ReturnJourneyStep[]
}

export default function ReturnJourneyStrip({ steps }: ReturnJourneyStripProps) {
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
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
        Return progress
      </Typography>
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
                  fontWeight: step.state === 'current' ? 700 : 600,
                  color: step.state === 'upcoming' ? 'text.secondary' : 'text.primary',
                }}
              >
                {step.label}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, lineHeight: 1.4 }}>
                {step.detail}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  )
}
