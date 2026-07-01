import { Box, Chip, Typography } from '@mui/material'

const steps = [
  { key: 'Draft', label: 'Draft' },
  { key: 'Issued', label: 'Issued' },
  { key: 'Submitted', label: 'Submitted' },
  { key: 'UnderReview', label: 'Under review' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Released', label: 'Released' },
]

function stepIndex(status: string): number {
  if (status === 'Completed') return steps.length
  if (status === 'Rejected' || status === 'Cancelled') return -1
  const idx = steps.findIndex((s) => s.key === status)
  return idx >= 0 ? idx : 0
}

interface WithdrawalStatusTimelineProps {
  status: string
  issuedByShippingLine?: boolean
}

export default function WithdrawalStatusTimeline({ status, issuedByShippingLine }: WithdrawalStatusTimelineProps) {
  const current = stepIndex(status)
  const terminal = status === 'Rejected' || status === 'Cancelled'

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
        Status timeline
      </Typography>
      {issuedByShippingLine && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          ATW fields were pre-filled by the shipping line evaluator.
        </Typography>
      )}
      {terminal ? (
        <Chip
          label={status === 'Rejected' ? 'Rejected' : 'Cancelled'}
          color={status === 'Rejected' ? 'error' : 'default'}
          size="small"
          sx={{ fontWeight: 700 }}
        />
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {steps.map((step, i) => {
            const active = i === current
            const done = i < current
            return (
              <Chip
                key={step.key}
                label={step.label}
                size="small"
                variant={active ? 'filled' : 'outlined'}
                color={done ? 'success' : active ? 'primary' : 'default'}
                sx={{ fontWeight: active || done ? 700 : 500 }}
              />
            )
          })}
          {status === 'Completed' && (
            <Chip label="Completed" size="small" color="success" sx={{ fontWeight: 700 }} />
          )}
        </Box>
      )}
    </Box>
  )
}
