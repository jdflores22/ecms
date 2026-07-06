import { Box, Button, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import type { WithdrawalLine } from '../../services/api'
import { formatContainerSizeLabel } from '../../utils/containerSize'
import {
  ListDesktopOnly,
  ListMobileCard,
  ListMobileChipRow,
  ListMobileMeta,
  ListMobileOnly,
  ListMobileTitle,
} from '../layout/ListPagePrimitives'

const lineStatusColor: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  Pending: 'default',
  Approved: 'success',
  Rejected: 'error',
  Released: 'info',
}

interface WithdrawalLinesTableProps {
  lines: WithdrawalLine[]
  summary?: string
  showLineStatus?: boolean
  showReleaseAction?: boolean
  onReleaseLine?: (line: WithdrawalLine) => void
  releasingLineId?: number | null
}

export default function WithdrawalLinesTable({
  lines,
  summary,
  showLineStatus = false,
  showReleaseAction = false,
  onReleaseLine,
  releasingLineId = null,
}: WithdrawalLinesTableProps) {
  return (
    <Box>
      {summary && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {lines.length} container{lines.length === 1 ? '' : 's'} · {summary}
        </Typography>
      )}

      {lines.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No container lines.
          </Typography>
        </Paper>
      ) : (
        <>
          <ListMobileOnly>
            {lines.map((line) => (
              <ListMobileCard key={line.id}>
                <ListMobileChipRow>
                  <ListMobileTitle>
                    #{line.lineNo} · {line.containerNo}
                  </ListMobileTitle>
                  {showLineStatus && (
                    <Chip
                      label={line.lineStatus}
                      size="small"
                      color={lineStatusColor[line.lineStatus] ?? 'default'}
                    />
                  )}
                </ListMobileChipRow>
                <ListMobileMeta>
                  {formatContainerSizeLabel(line.containerSize)} · {line.containerType}
                </ListMobileMeta>
                {showReleaseAction && line.lineStatus === 'Approved' && onReleaseLine && (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<LocalShippingOutlinedIcon />}
                    disabled={releasingLineId === line.id}
                    onClick={() => onReleaseLine(line)}
                    sx={{ mt: 1.5, fontWeight: 600, borderRadius: 2 }}
                  >
                    {releasingLineId === line.id ? 'Releasing…' : 'Release'}
                  </Button>
                )}
              </ListMobileCard>
            ))}
          </ListMobileOnly>

          <ListDesktopOnly>
            <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width={48}>#</TableCell>
                    <TableCell>Container</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Type</TableCell>
                    {showLineStatus && <TableCell>Status</TableCell>}
                    {showReleaseAction && <TableCell align="right">Action</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.lineNo}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{line.containerNo}</TableCell>
                      <TableCell>{formatContainerSizeLabel(line.containerSize)}</TableCell>
                      <TableCell>{line.containerType}</TableCell>
                      {showLineStatus && (
                        <TableCell>
                          <Chip
                            label={line.lineStatus}
                            size="small"
                            color={lineStatusColor[line.lineStatus] ?? 'default'}
                          />
                        </TableCell>
                      )}
                      {showReleaseAction && (
                        <TableCell align="right">
                          {line.lineStatus === 'Approved' && onReleaseLine ? (
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<LocalShippingOutlinedIcon />}
                              disabled={releasingLineId === line.id}
                              onClick={() => onReleaseLine(line)}
                              sx={{ fontWeight: 600, borderRadius: 2 }}
                            >
                              {releasingLineId === line.id ? 'Releasing…' : 'Release'}
                            </Button>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </ListDesktopOnly>
        </>
      )}
    </Box>
  )
}
