export interface ReportStatusCounts {
  scheduled: number
  confirmed: number
  completed: number
  cancelled: number
}

export interface ReportStatusRow extends ReportStatusCounts {
  key: string
  label: string
  sublabel?: string
}

export interface ReportStatusTotals extends ReportStatusCounts {
  total: number
}

export function aggregateReportStatus(rows: ReportStatusCounts[]): ReportStatusTotals {
  const totals = rows.reduce(
    (acc, row) => ({
      scheduled: acc.scheduled + row.scheduled,
      confirmed: acc.confirmed + row.confirmed,
      completed: acc.completed + row.completed,
      cancelled: acc.cancelled + row.cancelled,
    }),
    { scheduled: 0, confirmed: 0, completed: 0, cancelled: 0 },
  )
  const total = totals.scheduled + totals.confirmed + totals.completed + totals.cancelled
  return { ...totals, total }
}

export const REPORT_STATUS_META = [
  { key: 'scheduled' as const, label: 'Scheduled', color: '#1565C0', bg: 'rgba(21, 101, 192, 0.08)' },
  { key: 'confirmed' as const, label: 'Confirmed', color: '#6A1B9A', bg: 'rgba(106, 27, 154, 0.08)' },
  { key: 'completed' as const, label: 'Completed', color: '#2E7D32', bg: 'rgba(46, 125, 50, 0.08)' },
  { key: 'cancelled' as const, label: 'No show', color: '#C62828', bg: 'rgba(198, 40, 40, 0.08)' },
]
