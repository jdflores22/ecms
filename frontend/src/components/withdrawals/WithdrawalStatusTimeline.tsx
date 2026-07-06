import { Box, Chip, Typography } from '@mui/material'
import { ICS_PRIMARY } from '../layout/DetailPagePrimitives'

const bookFirstSteps = [
  { key: 'Booked', label: 'Booked' },
  { key: 'CyAssigned', label: 'CY assigned' },
  { key: 'Scheduled', label: 'Scheduled' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Released', label: 'Released' },
] as const

const legacySteps = [
  { key: 'Draft', label: 'Draft' },
  { key: 'Issued', label: 'Issued' },
  { key: 'Submitted', label: 'Submitted' },
  { key: 'UnderReview', label: 'Under review' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Released', label: 'Released' },
] as const

function stepIndex(status: string, bookFirst: boolean): number {
  if (status === 'Completed') return bookFirst ? bookFirstSteps.length : legacySteps.length
  if (status === 'Rejected' || status === 'Cancelled') return -1
  const steps = bookFirst ? bookFirstSteps : legacySteps
  const idx = steps.findIndex((s) => s.key === status)
  return idx >= 0 ? idx : 0
}

interface WithdrawalStatusTimelineProps {
  status: string
  issuedByShippingLine?: boolean
  bookFirst?: boolean
}

export default function WithdrawalStatusTimeline({
  status,
  issuedByShippingLine,
  bookFirst = false,
}: WithdrawalStatusTimelineProps) {
  const steps = bookFirst ? bookFirstSteps : legacySteps
  const current = stepIndex(status, bookFirst)
  const terminal = status === 'Rejected' || status === 'Cancelled'

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.75 }}>
        Status timeline
        {issuedByShippingLine ? ' · Pre-filled by shipping line' : ''}
      </Typography>

      {terminal ? (
        <Chip
          label={status === 'Rejected' ? 'Rejected' : 'Cancelled'}
          size="small"
          color={status === 'Rejected' ? 'error' : 'default'}
          sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
        />
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}>
          {steps.map((step, i) => {
            const done = i < current
            const active = i === current
            return (
              <Chip
                key={step.key}
                label={step.label}
                size="small"
                variant={active ? 'filled' : 'outlined'}
                color={done ? 'success' : active ? 'primary' : 'default'}
                sx={{
                  height: 22,
                  fontSize: '0.7rem',
                  fontWeight: active || done ? 600 : 500,
                  ...(active && {
                    bgcolor: ICS_PRIMARY,
                    color: '#fff',
                    '& .MuiChip-label': { px: 1 },
                  }),
                }}
              />
            )
          })}
          {status === 'Completed' && (
            <Chip
              label="Completed"
              size="small"
              color="success"
              sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
            />
          )}
        </Box>
      )}
    </Box>
  )
}
