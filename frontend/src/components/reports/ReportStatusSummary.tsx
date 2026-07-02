import { Box, Paper, Typography } from '@mui/material'
import { aggregateReportStatus, REPORT_STATUS_META, type ReportStatusRow } from '../../utils/reportStats'

interface ReportStatusSummaryProps {
  periodLabel: string
  rows: ReportStatusRow[]
}

export default function ReportStatusSummary({ periodLabel, rows }: ReportStatusSummaryProps) {
  const stats = aggregateReportStatus(rows)

  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
        {periodLabel}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(4, minmax(0, 1fr))',
          },
          gap: { xs: 1.5, sm: 2 },
        }}
      >
        {REPORT_STATUS_META.map((meta) => (
          <Paper
            key={meta.key}
            elevation={0}
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: meta.bg,
              minWidth: 0,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600, color: meta.color, display: 'block' }}>
              {meta.label}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: meta.color, mt: 0.5 }}>
              {stats[meta.key]}
            </Typography>
          </Paper>
        ))}
      </Box>
    </Box>
  )
}
