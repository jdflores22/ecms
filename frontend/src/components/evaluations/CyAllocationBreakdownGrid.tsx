import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import type { CyAllocationBreakdownRow } from '../../services/api'
import { getCapacityDisplayLabel, breakdownAvailableTeu, breakdownBookingTeu, breakdownContractTeu, breakdownUsedTeu } from '../../utils/cyAllocation'

const primaryDark = '#0B3D91'

interface CyAllocationBreakdownGridProps {
  rows: CyAllocationBreakdownRow[]
  /** Hide the section title (e.g. when nested in a tight mobile card) */
  compact?: boolean
}

function CellVolume({ preAdvisedTeu, bookingTeu }: {
  preAdvisedTeu: number
  bookingTeu: number
}) {
  if (preAdvisedTeu === 0 && bookingTeu === 0) {
    return (
      <Typography variant="body2" color="text.disabled">
        —
      </Typography>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.35, alignItems: 'center' }}>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
        Pre-advised
      </Typography>
      <Typography sx={{ fontWeight: 800, lineHeight: 1.2, color: '#ED6C02' }}>
        {Math.round(preAdvisedTeu)} TEU
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2, mt: 0.25 }}>
        Booking
      </Typography>
      <Typography sx={{ fontWeight: 800, lineHeight: 1.2, color: '#6A1B9A' }}>
        {Math.round(bookingTeu)} TEU
      </Typography>
    </Box>
  )
}

export default function CyAllocationBreakdownGrid({ rows, compact = false }: CyAllocationBreakdownGridProps) {
  if (rows.length === 0) return null

  const typeColumns = rows[0]?.cells ?? []

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: '#fff',
        minWidth: 0,
      }}
    >
      {!compact && (
        <Typography
          variant="caption"
          sx={{ display: 'block', px: 1.5, py: 1, fontWeight: 700, color: 'text.secondary' }}
        >
          Pre-advised · booking by size and type (TEU)
        </Typography>
      )}

      {/* Mobile: stacked size rows with type tiles */}
      <Box sx={{ display: { xs: 'block', md: 'none' }, p: compact ? 0 : 1, pt: compact ? 1 : undefined }}>
        {rows.map((row) => (
          <Box
            key={row.sizeLabel}
            sx={{
              mb: 1.5,
              '&:last-child': { mb: 0 },
              p: 1.25,
              borderRadius: 1.5,
              bgcolor: 'rgba(11, 61, 145, 0.03)',
              border: '1px solid',
              borderColor: 'rgba(11, 61, 145, 0.08)',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, color: primaryDark, mb: 1 }}>
              {getCapacityDisplayLabel(row.sizeLabel)} · contract {breakdownContractTeu(row)} TEU ·{' '}
              {breakdownAvailableTeu(row)} TEU available · pre-forecasted {breakdownUsedTeu(row)} TEU · booking{' '}
              {breakdownBookingTeu(row)} TEU
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 0.75,
              }}
            >
              {row.cells.map((cell) => (
                <Box
                  key={cell.typeCode}
                  sx={{
                    p: 1,
                    borderRadius: 1.25,
                    bgcolor: '#fff',
                    border: '1px solid',
                    borderColor: 'divider',
                    textAlign: 'center',
                    minWidth: 0,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                    {cell.typeCode}
                  </Typography>
                  <CellVolume preAdvisedTeu={cell.preAdvisedTeu} bookingTeu={cell.bookingTeu} />
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>

      {/* Desktop: full matrix table */}
      <TableContainer sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 480 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(11, 61, 145, 0.04)' }}>
              <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: 72 }}>Size</TableCell>
              {typeColumns.map((col) => (
                <TableCell key={col.typeCode} align="center" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  {col.typeLabel}
                  <Typography component="span" variant="caption" sx={{ display: 'block', color: 'text.disabled' }}>
                    {col.typeCode}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.sizeLabel}>
                <TableCell sx={{ fontWeight: 700, color: primaryDark }}>
                  {getCapacityDisplayLabel(row.sizeLabel)}
                  <Typography component="span" variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                    {row.teuPerContainer.toFixed(1)} TEU
                  </Typography>
                </TableCell>
                {row.cells.map((cell) => (
                  <TableCell key={cell.typeCode} align="center">
                    <CellVolume preAdvisedTeu={cell.preAdvisedTeu} bookingTeu={cell.bookingTeu} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
