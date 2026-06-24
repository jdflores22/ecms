import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import { Box, Paper, Typography } from '@mui/material'
import { ECMS_PRIMARY, hexToRgba } from '../layout/DetailPagePrimitives'

type StepState = 'complete' | 'current' | 'upcoming'

export type PaymentProgressStep = {
  label: string
  detail: string
  state: StepState
}

export function buildPaymentProgressSteps(
  paymentStatus: string,
  hasProof: boolean,
  uploadNeeded: boolean,
): PaymentProgressStep[] {
  if (paymentStatus === 'Paid') {
    return [
      { label: 'Upload proof', detail: 'Submitted', state: 'complete' },
      { label: 'Depot review', detail: 'Verified', state: 'complete' },
      { label: 'Confirmed', detail: 'Payment accepted', state: 'complete' },
    ]
  }

  if (paymentStatus === 'ForVerification') {
    return [
      { label: 'Upload proof', detail: 'Submitted', state: 'complete' },
      { label: 'Depot review', detail: 'Awaiting verification', state: 'current' },
      { label: 'Confirmed', detail: 'After depot approval', state: 'upcoming' },
    ]
  }

  if (paymentStatus === 'Rejected') {
    return [
      { label: 'Upload proof', detail: 'Re-upload required', state: 'current' },
      { label: 'Depot review', detail: 'Pending new proof', state: 'upcoming' },
      { label: 'Confirmed', detail: 'After depot approval', state: 'upcoming' },
    ]
  }

  if (uploadNeeded) {
    return [
      {
        label: 'Upload proof',
        detail: hasProof ? 'Ready to submit' : 'Upload image or PDF',
        state: 'current',
      },
      { label: 'Depot review', detail: 'After you submit', state: 'upcoming' },
      { label: 'Confirmed', detail: 'After depot approval', state: 'upcoming' },
    ]
  }

  return [
    { label: 'Upload proof', detail: 'Not yet required', state: 'upcoming' },
    { label: 'Depot review', detail: '—', state: 'upcoming' },
    { label: 'Confirmed', detail: '—', state: 'upcoming' },
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
      bgcolor: hexToRgba(ECMS_PRIMARY, 0.1),
      color: ECMS_PRIMARY,
      border: `1px solid ${hexToRgba(ECMS_PRIMARY, 0.35)}`,
      boxShadow: `0 0 0 3px ${hexToRgba(ECMS_PRIMARY, 0.08)}`,
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

export default function PaymentProgressStrip({ steps }: { steps: PaymentProgressStep[] }) {
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
        Payment progress
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: { xs: 1.5, sm: 1 },
        }}
      >
        {steps.map((step) => (
          <Box key={step.label} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
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
