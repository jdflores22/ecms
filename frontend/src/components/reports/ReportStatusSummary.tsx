import { Box, LinearProgress, Paper, Typography } from '@mui/material'
import { ICS_PRIMARY } from '../layout/DetailPagePrimitives'
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
            lg: 'repeat(5, minmax(0, 1fr))',
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
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.5, sm: 2 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'rgba(11, 61, 145, 0.04)',
            gridColumn: { xs: '1 / -1', lg: 'auto' },
            minWidth: 0,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
            Completion rate
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: ICS_PRIMARY, mt: 0.5 }}>
            {stats.completionRate}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={stats.completionRate}
            sx={{ mt: 1.25, height: 6, borderRadius: 3 }}
            color={stats.completionRate >= 75 ? 'success' : stats.completionRate >= 40 ? 'primary' : 'warning'}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
            {stats.total} total return{stats.total === 1 ? '' : 's'} in period
          </Typography>
        </Paper>
      </Box>
    </Box>
  )
}
