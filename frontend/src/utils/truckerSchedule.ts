import type { Schedule } from '../services/api'

export const TRUCKER_AWAITING_CY_MESSAGE =
  'Awaiting Container Yard to confirm the date of return'

export const TRUCKER_AWAITING_PAYMENT_MESSAGE =
  'Upload payment proof to view your confirmed return schedule'

/** Whether trucker-facing UI may show date, time, depot, and slot details. */
export function isScheduleDetailsVisible(schedule: Schedule): boolean {
  if (schedule.detailsVisible === false) return false
  // Enforce on client even when API has not deployed role-based masking yet.
  if (schedule.status === 'WaitingSchedule' || schedule.status === 'Scheduled') return false
  return schedule.status === 'Confirmed' || schedule.status === 'Completed' || schedule.status === 'NoShow'
}

export function truckerScheduleStatusHint(schedule: Schedule): string {
  if (schedule.statusHint) return schedule.statusHint
  if (schedule.status === 'WaitingSchedule') return TRUCKER_AWAITING_CY_MESSAGE
  if (schedule.status === 'Scheduled') return TRUCKER_AWAITING_PAYMENT_MESSAGE
  return ''
}

export function truckerScheduleStatusLabel(schedule: Schedule): string {
  if (!isScheduleDetailsVisible(schedule)) {
    if (schedule.status === 'WaitingSchedule') return 'Awaiting CY confirmation'
    if (schedule.status === 'Scheduled') return 'For payment'
  }
  if (schedule.status === 'WaitingSchedule') return 'Awaiting schedule'
  if (schedule.status === 'Scheduled') return 'For payment'
  if (schedule.status === 'Confirmed') return 'Confirmed'
  if (schedule.status === 'Completed') return 'Completed'
  if (schedule.status === 'NoShow') return 'No show'
  return schedule.status
}

export function formatTruckerScheduleSlot(schedule: Schedule, formatSlot: (date: string, time: string) => string): string {
  if (!isScheduleDetailsVisible(schedule)) return truckerScheduleStatusHint(schedule)
  if (!schedule.date) return truckerScheduleStatusHint(schedule) || '—'
  return formatSlot(schedule.date, schedule.time)
}
