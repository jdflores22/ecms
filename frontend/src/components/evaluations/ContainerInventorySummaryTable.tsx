import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import { hexToRgba, ICS_PRIMARY } from '../layout/DetailPagePrimitives'
import type { InventorySummaryRow } from '../../utils/inventorySummary'
import {
  ECMS_INVENTORY_TYPE_CODES,
  formatSummaryCount,
  sumInventorySummaryRows,
} from '../../utils/inventorySummary'
import { getAllocationSizeLabel } from '../../utils/cyAllocation'

const primaryDark = ICS_PRIMARY

const SUMMARY_TAIL_HEADERS = [
  'Pre-advised',
  'Manual',
  'Booking',
  'TEUs',
  'Units',
  'Overstay',
  'Yard-in (Today)',
] as const

function SummaryCell({
  value,
  bold,
  align = 'center',
}: {
  value: number | string
  bold?: boolean
  align?: 'left' | 'center' | 'right'
}) {
  const display = typeof value === 'number' ? formatSummaryCount(value) : value
  return (
    <TableCell align={align} sx={{ fontWeight: bold ? 700 : 500, py: 1.35, whiteSpace: 'nowrap' }}>
      {display}
    </TableCell>
  )
}

function SummaryDataRow({ row, isTotal }: { row: InventorySummaryRow; isTotal?: boolean }) {
  return (
    <TableRow hover sx={{ ...(isTotal ? { bgcolor: hexToRgba(primaryDark, 0.03) } : {}) }}>
      <TableCell sx={{ fontWeight: isTotal ? 700 : 600, whiteSpace: 'nowrap' }}>{row.depotName}</TableCell>
      <SummaryCell value={row.size20Count} />
      <SummaryCell value={row.size40Count} />
      {ECMS_INVENTORY_TYPE_CODES.map((code) => (
        <SummaryCell key={code} value={row.typeCounts[code]} />
      ))}
      <SummaryCell value={row.preAdvisedCount} />
      <SummaryCell value={row.manualCount} />
      <SummaryCell value={row.bookingCount} />
      <SummaryCell value={row.teus} />
      <SummaryCell value={row.units} bold />
      <SummaryCell value={row.overstayCount} />
      <SummaryCell value={row.yardInToday} />
    </TableRow>
  )
}

export default function ContainerInventorySummaryTable({ rows }: { rows: InventorySummaryRow[] }) {
  const totals = sumInventorySummaryRows(rows)
  const colSpan = 1 + 2 + ECMS_INVENTORY_TYPE_CODES.length + SUMMARY_TAIL_HEADERS.length

  return (
    <TableContainer sx={{ px: { xs: 0, sm: 1 }, pb: 1 }}>
      <Table size="small" sx={{ minWidth: 900 }}>
        <TableHead>
          <TableRow
            sx={{
              bgcolor: hexToRgba(primaryDark, 0.04),
              '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', py: 1.75 },
            }}
          >
            <TableCell>Container yard</TableCell>
            <TableCell align="center">{getAllocationSizeLabel('20')}</TableCell>
            <TableCell align="center">{getAllocationSizeLabel('40')}</TableCell>
            {ECMS_INVENTORY_TYPE_CODES.map((code) => (
              <TableCell key={code} align="center">
                {code}
              </TableCell>
            ))}
            {SUMMARY_TAIL_HEADERS.map((header) => (
              <TableCell key={header} align="center" sx={{ whiteSpace: 'nowrap' }}>
                {header === 'Booking' ? (
                  <Tooltip title="LOGICTECK booking counts will appear here when integrated">
                    <span>{header}</span>
                  </Tooltip>
                ) : (
                  header
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan}>
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography color="text.secondary">No inventory data to summarize yet.</Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            <>
              {rows.map((row) => (
                <SummaryDataRow key={row.depotId} row={row} />
              ))}
              {rows.length > 1 && <SummaryDataRow row={totals} isTotal />}
            </>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
