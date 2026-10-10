export type DepotScheduleRemarkPreset = {
  id: string
  label: string
  text: string
}

export const DEPOT_SCHEDULE_REMARK_PRESETS: DepotScheduleRemarkPreset[] = [
  {
    id: 'gate',
    label: 'Main gate',
    text: 'Proceed to the main gate. Present your booking reference and container number to security.',
  },
  {
    id: 'call-ahead',
    label: 'Call ahead',
    text: 'Call depot operations before arrival to confirm gate access and receiving bay.',
  },
  {
    id: 'docs',
    label: 'Documents',
    text: 'Bring the verified CRO/eDO and driver ID. Late arrivals may be rescheduled per depot policy.',
  },
  {
    id: 'slot',
    label: 'Time slot',
    text: 'Arrive within the booked hourly window (±2 hours PHT). Queue outside the gate if the yard is at capacity.',
  },
]
