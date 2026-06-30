import {
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
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
  Released: 'success',
}

interface WithdrawalLinesTableProps {
  lines: WithdrawalLine[]
  summary?: string
  showLineStatus?: boolean
}

export default function WithdrawalLinesTable({ lines, summary, showLineStatus = false }: WithdrawalLinesTableProps) {
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
