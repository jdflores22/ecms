import {
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import {
  ListDesktopOnly,
  ListMobileCard,
  ListMobileChipRow,
  ListMobileOnly,
  ListMobileTitle,
  listTablePaperSx,
} from '../layout/ListPagePrimitives'
import { hexToRgba, ICS_PRIMARY } from '../layout/DetailPagePrimitives'
import {
  aggregateReportStatus,
  REPORT_STATUS_META,
  type ReportStatusRow,
} from '../../utils/reportStats'

interface ReportStatusTableProps {
  loading: boolean
  labelHeader: string
  showCodeColumn?: boolean
  rows: ReportStatusRow[]
}

function StatusCount({ value, color }: { value: number; color: string }) {
  if (value === 0) {
    return (
      <Typography variant="body2" color="text.disabled">
        —
      </Typography>
    )
  }
  return (
    <Typography variant="body2" sx={{ fontWeight: value > 0 ? 700 : 400, color }}>
      {value}
    </Typography>
  )
}

function ReportEmptyState() {
  return (
    <Box sx={{ py: 8, px: 2, textAlign: 'center' }}>
      <AssessmentOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
      <Typography sx={{ fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>
        No returns in this period
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Try a wider date range or check back when schedules are created.
      </Typography>
    </Box>
  )
}

export default function ReportStatusTable({
  loading,
  labelHeader,
  showCodeColumn = false,
  rows,
}: ReportStatusTableProps) {
  const totals = aggregateReportStatus(rows)
  const colSpan = showCodeColumn ? 6 : 5

  return (
    <Paper elevation={0} sx={listTablePaperSx}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress sx={{ color: ICS_PRIMARY }} />
        </Box>
      ) : rows.length === 0 ? (
        <ReportEmptyState />
      ) : (
        <>
          <ListMobileOnly>
            {rows.map((row) => (
              <ListMobileCard key={row.key}>
                {showCodeColumn && row.sublabel && (
                  <Typography
                    variant="caption"
                    sx={{ fontFamily: 'monospace', fontWeight: 700, color: ICS_PRIMARY, display: 'block', mb: 0.5 }}
                  >
                    {row.sublabel}
                  </Typography>
                )}
                <ListMobileTitle>{row.label}</ListMobileTitle>
                <ListMobileChipRow>
                  {REPORT_STATUS_META.map((meta) => (
                    <Box
                      key={meta.key}
                      sx={{
                        px: 1.25,
                        py: 0.75,
                        borderRadius: 1.5,
                        bgcolor: meta.bg,
                        border: `1px solid ${meta.color}22`,
                        minWidth: 72,
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 600, color: meta.color, display: 'block' }}>
                        {meta.label}
                      </Typography>
                      <Typography sx={{ fontWeight: 800, color: meta.color, lineHeight: 1.2 }}>
                        {row[meta.key]}
                      </Typography>
                    </Box>
                  ))}
                </ListMobileChipRow>
              </ListMobileCard>
            ))}
          </ListMobileOnly>

          <ListDesktopOnly>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow
                    sx={{
                      bgcolor: hexToRgba(ICS_PRIMARY, 0.04),
                      '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', py: 1.75 },
                    }}
                  >
                    {showCodeColumn && <TableCell>Code</TableCell>}
                    <TableCell>{labelHeader}</TableCell>
                    {REPORT_STATUS_META.map((meta) => (
                      <TableCell key={meta.key} align="right">
                        {meta.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.key} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                      {showCodeColumn && (
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, color: ICS_PRIMARY }}>
                          {row.sublabel ?? '—'}
                        </TableCell>
                      )}
                      <TableCell sx={{ fontWeight: 600 }}>{row.label}</TableCell>
                      {REPORT_STATUS_META.map((meta) => (
                        <TableCell key={meta.key} align="right">
                          <StatusCount value={row[meta.key]} color={meta.color} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: hexToRgba(ICS_PRIMARY, 0.03) }}>
                    <TableCell colSpan={showCodeColumn ? 2 : 1} sx={{ fontWeight: 800 }}>
                      Total
                    </TableCell>
                    {REPORT_STATUS_META.map((meta) => (
                      <TableCell key={meta.key} align="right" sx={{ fontWeight: 800, color: meta.color }}>
                        {totals[meta.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </ListDesktopOnly>
        </>
      )}
    </Paper>
  )
}
