/** User-facing schedule status labels (API enum values unchanged). */
export const SCHEDULE_STATUS_LABELS: Record<string, string> = {
  WaitingSchedule: 'Waiting schedule',
  Scheduled: 'For Payment',
  Confirmed: 'Confirmed',
  Completed: 'Completed',
  NoShow: 'No show',
}

export function scheduleStatusLabel(status: string): string {
  return SCHEDULE_STATUS_LABELS[status] ?? status
}

export interface LightStatusBadgeStyle {
  label: string
  color: string
  bg: string
  border: string
}

const PRE_ADVICE_STATUS_STYLES: Record<string, LightStatusBadgeStyle> = {
  Draft: { label: 'Draft', color: '#616161', bg: 'rgba(97, 97, 97, 0.08)', border: 'rgba(97, 97, 97, 0.28)' },
  Submitted: { label: 'Submitted', color: '#1565C0', bg: 'rgba(21, 101, 192, 0.08)', border: 'rgba(21, 101, 192, 0.28)' },
  UnderEvaluation: { label: 'Under evaluation', color: '#ED6C02', bg: 'rgba(237, 108, 2, 0.08)', border: 'rgba(237, 108, 2, 0.28)' },
  Approved: { label: 'Approved', color: '#2E7D32', bg: 'rgba(46, 125, 50, 0.08)', border: 'rgba(46, 125, 50, 0.28)' },
  Rejected: { label: 'Rejected', color: '#C62828', bg: 'rgba(198, 40, 40, 0.08)', border: 'rgba(198, 40, 40, 0.28)' },
  ForCompliance: { label: 'For compliance', color: '#ED6C02', bg: 'rgba(237, 108, 2, 0.08)', border: 'rgba(237, 108, 2, 0.28)' },
  Cancelled: { label: 'Cancelled', color: '#757575', bg: 'rgba(117, 117, 117, 0.08)', border: 'rgba(117, 117, 117, 0.28)' },
}

const SCHEDULE_FLOW_STYLES: Record<string, LightStatusBadgeStyle> = {
  WaitingSchedule: { label: 'Awaiting schedule', color: '#ED6C02', bg: 'rgba(237, 108, 2, 0.08)', border: 'rgba(237, 108, 2, 0.28)' },
  Scheduled: { label: 'For Payment', color: '#1565C0', bg: 'rgba(21, 101, 192, 0.08)', border: 'rgba(21, 101, 192, 0.28)' },
  Confirmed: { label: 'Confirmed', color: '#2E7D32', bg: 'rgba(46, 125, 50, 0.08)', border: 'rgba(46, 125, 50, 0.28)' },
  Completed: { label: 'Completed', color: '#1565C0', bg: 'rgba(21, 101, 192, 0.08)', border: 'rgba(21, 101, 192, 0.28)' },
  NoShow: { label: 'No show', color: '#C62828', bg: 'rgba(198, 40, 40, 0.08)', border: 'rgba(198, 40, 40, 0.28)' },
}

/** List/detail badge for pre-forecast rows — reflects return schedule after approval. */
export function getPreAdviceListStatus(item: {
  status: string
  scheduleStatus?: string | null
}): LightStatusBadgeStyle {
  if (item.status === 'Approved' && item.scheduleStatus) {
    const flow = SCHEDULE_FLOW_STYLES[item.scheduleStatus]
    if (flow) return flow
  }
  return (
    PRE_ADVICE_STATUS_STYLES[item.status] ?? {
      label: item.status,
      color: '#616161',
      bg: 'rgba(97, 97, 97, 0.08)',
      border: 'rgba(97, 97, 97, 0.28)',
    }
  )
}

export const lightStatusChipSx = (style: LightStatusBadgeStyle) => ({
  fontWeight: 600,
  bgcolor: style.bg,
  color: style.color,
  border: `1px solid ${style.border}`,
})

/** Schedule is assigned with a return date and awaiting trucker payment. */
export function isScheduleForPayment(status: string): boolean {
  return status === 'Scheduled'
}

/** Schedule return is confirmed after payment verification. */
export function isScheduleConfirmed(status: string): boolean {
  return status === 'Confirmed' || status === 'Completed'
}
