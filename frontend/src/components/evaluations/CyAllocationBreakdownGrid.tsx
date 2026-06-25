import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import type { CyAllocationBreakdownRow } from '../../services/api'

const primaryDark = '#0B3D91'

interface CyAllocationBreakdownGridProps {
  rows: CyAllocationBreakdownRow[]
  /** Hide the section title (e.g. when nested in a tight mobile card) */
  compact?: boolean
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
          Active returns by size and type
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
              {row.sizeLabel}&apos; · {row.teuPerContainer.toFixed(1)} TEU each
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
                  {cell.activeReturns > 0 ? (
                    <>
                      <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }}>{cell.activeReturns}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {cell.usedTeu.toFixed(1)} TEU
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.disabled" sx={{ py: 0.25 }}>
                      —
                    </Typography>
                  )}
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
                  {row.sizeLabel}&apos;
                  <Typography component="span" variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                    {row.teuPerContainer.toFixed(1)} TEU
                  </Typography>
                </TableCell>
                {row.cells.map((cell) => (
                  <TableCell key={cell.typeCode} align="center">
                    {cell.activeReturns > 0 ? (
                      <>
                        <Typography component="span" sx={{ fontWeight: 700 }}>
                          {cell.activeReturns}
                        </Typography>
                        <Typography component="span" variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                          {cell.usedTeu.toFixed(1)} TEU
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.disabled">
                        —
                      </Typography>
                    )}
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
