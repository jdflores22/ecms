import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { hexToRgba } from '../components/layout/DetailPagePrimitives'
import {
  ListDesktopOnly,
  ListMobileCard,
  ListMobileChipRow,
  ListMobileMeta,
  ListMobileOnly,
  ListMobileTitle,
  LIST_PRIMARY,
  listMobileActionsSx,
  listPageRootSx,
  listTablePaperSx,
} from '../components/layout/ListPagePrimitives'
import { evaluationApi, preAdviceApi, type Evaluation, type PreAdvice } from '../services/api'
import { formatDateTime } from '../utils/datetime'

const primaryDark = LIST_PRIMARY

const statusColor: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  Draft: 'default',
  Submitted: 'info',
  UnderEvaluation: 'warning',
  Approved: 'success',
  Rejected: 'error',
  Cancelled: 'default',
}

const statusLabel: Record<string, string> = {
  UnderEvaluation: 'Under evaluation',
}

const PENDING_STATUSES = ['Submitted', 'UnderEvaluation']

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#fff',
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, color, mt: 0.5 }}>
        {value}
      </Typography>
    </Paper>
  )
}

function DataTable({
  loading,
  emptyMessage,
  headCells,
  children,
  mobile,
  isEmpty,
}: {
  loading: boolean
  emptyMessage: string
  headCells: React.ReactNode
  children: React.ReactNode
  mobile?: React.ReactNode
  isEmpty: boolean
}) {
  return (
    <Paper elevation={0} sx={listTablePaperSx}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress sx={{ color: primaryDark }} />
        </Box>
      ) : isEmpty ? (
        <Typography sx={{ py: 8, textAlign: 'center', color: 'text.secondary', px: 2 }}>
          {emptyMessage}
        </Typography>
      ) : (
        <>
          {mobile && <ListMobileOnly>{mobile}</ListMobileOnly>}
          <ListDesktopOnly>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow
                    sx={{
                      bgcolor: hexToRgba(primaryDark, 0.04),
                      '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', py: 1.75 },
                    }}
                  >
                    {headCells}
                  </TableRow>
                </TableHead>
                <TableBody>{children}</TableBody>
              </Table>
            </TableContainer>
          </ListDesktopOnly>
        </>
      )}
    </Paper>
  )
}

export default function EvaluationsPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [pending, setPending] = useState<PreAdvice[]>([])
  const [history, setHistory] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([preAdviceApi.list(), evaluationApi.list()])
      .then(([preAdviceRes, evalRes]) => {
        const all = preAdviceRes.data as PreAdvice[]
        setPending(all.filter((p) => PENDING_STATUSES.includes(p.status)))
        setHistory(evalRes.data)
      })
      .catch(() => setError('Failed to load evaluation data.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const summary = useMemo(() => {
    const approved = history.filter((h) => h.status === 'Approved').length
    const rejected = history.filter((h) => h.status === 'Rejected').length
    return { pending: pending.length, approved, rejected, total: history.length }
  }, [pending.length, history])

  return (
    <Box sx={listPageRootSx}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          mb: 3,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${primaryDark} 0%, #0A3580 60%, #0C4DA8 100%)`,
          color: '#fff',
          boxShadow: '0 8px 24px rgba(11, 61, 145, 0.22)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            right: -30,
            top: -30,
            width: 140,
            height: 140,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.06)',
          }}
        />
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', position: 'relative' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.14)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <FactCheckOutlinedIcon />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              Request Evaluations
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5, maxWidth: 560 }}>
              Review pre-advice requests and assign container yard (CY) for approved returns.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <SummaryCard label="Pending queue" value={summary.pending} color="#ED6C02" />
        <SummaryCard label="Approved" value={summary.approved} color="#2E7D32" />
        <SummaryCard label="Rejected" value={summary.rejected} color="#D32F2F" />
        <SummaryCard label="Total decisions" value={summary.total} color={primaryDark} />
      </Box>

      <Paper
        elevation={0}
        sx={{
          mb: 2,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: '#fff',
          boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            px: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: hexToRgba(primaryDark, 0.02),
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 48 },
            '& .Mui-selected': { color: primaryDark },
            '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0', bgcolor: '#00A3E0' },
          }}
        >
          <Tab label={`Pending (${pending.length})`} />
          <Tab label={`History (${history.length})`} />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <DataTable
          loading={loading}
          emptyMessage="No pending requests for evaluation."
          isEmpty={!loading && pending.length === 0}
          mobile={pending.map((item) => (
            <ListMobileCard key={item.id} onClick={() => navigate(`/evaluations/${item.id}`)}>
              <ListMobileTitle>{item.referenceNo}</ListMobileTitle>
              <ListMobileMeta>{item.shippingLineName}</ListMobileMeta>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5, fontFamily: 'monospace', fontWeight: 600, wordBreak: 'break-all' }}
              >
                {item.containerNo}
              </Typography>
              <ListMobileMeta>
                {item.containerSize} / {item.containerType} · {formatDateTime(item.createdAt)}
              </ListMobileMeta>
              <ListMobileChipRow>
                <Chip
                  label={statusLabel[item.status] ?? item.status}
                  color={statusColor[item.status] ?? 'default'}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </ListMobileChipRow>
              <Box sx={listMobileActionsSx} onClick={(e) => e.stopPropagation()}>
                <Button
                  component={RouterLink}
                  to={`/evaluations/${item.id}`}
                  size="small"
                  variant="contained"
                  startIcon={<OpenInNewIcon />}
                  sx={{ fontWeight: 600, borderRadius: 2 }}
                >
                  Review
                </Button>
              </Box>
            </ListMobileCard>
          ))}
          headCells={
            <>
              <TableCell>Reference</TableCell>
              <TableCell>Shipping line</TableCell>
              <TableCell>Container</TableCell>
              <TableCell>Size / type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell align="right">Actions</TableCell>
            </>
          }
        >
          {pending.map((item) => (
            <TableRow
              key={item.id}
              hover
              sx={{ '&:last-child td': { borderBottom: 0 }, cursor: 'pointer' }}
              onClick={() => navigate(`/evaluations/${item.id}`)}
            >
              <TableCell sx={{ fontWeight: 700, color: primaryDark }}>{item.referenceNo}</TableCell>
              <TableCell>{item.shippingLineName}</TableCell>
              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.containerNo}</TableCell>
              <TableCell>
                {item.containerSize} / {item.containerType}
              </TableCell>
              <TableCell>
                <Chip
                  label={statusLabel[item.status] ?? item.status}
                  color={statusColor[item.status] ?? 'default'}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {formatDateTime(item.createdAt)}
                </Typography>
              </TableCell>
              <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                <Button
                  component={RouterLink}
                  to={`/evaluations/${item.id}`}
                  size="small"
                  variant="contained"
                  startIcon={<OpenInNewIcon />}
                  sx={{ fontWeight: 600, borderRadius: 2 }}
                >
                  Review
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}

      {tab === 1 && (
        <DataTable
          loading={loading}
          emptyMessage="No evaluation history yet."
          isEmpty={!loading && history.length === 0}
          mobile={history.map((item) => (
            <ListMobileCard key={item.id}>
              <ListMobileTitle>{item.referenceNo}</ListMobileTitle>
              <ListMobileChipRow>
                <Chip
                  label={item.status}
                  color={statusColor[item.status] ?? 'default'}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </ListMobileChipRow>
              <ListMobileMeta>{item.depotName ? `CY: ${item.depotName}` : 'No CY assigned'}</ListMobileMeta>
              <ListMobileMeta>Evaluator: {item.evaluatorName}</ListMobileMeta>
              {item.remarks && <ListMobileMeta>{item.remarks}</ListMobileMeta>}
              <ListMobileMeta>{formatDateTime(item.evaluatedAt)}</ListMobileMeta>
              <Box sx={listMobileActionsSx}>
                <Button
                  component={RouterLink}
                  to={`/evaluations/${item.preAdviceId}`}
                  size="small"
                  variant="outlined"
                  startIcon={<OpenInNewIcon />}
                  sx={{ fontWeight: 600, borderRadius: 2, color: primaryDark, borderColor: hexToRgba(primaryDark, 0.35) }}
                >
                  View
                </Button>
              </Box>
            </ListMobileCard>
          ))}
          headCells={
            <>
              <TableCell>Reference</TableCell>
              <TableCell>Decision</TableCell>
              <TableCell>Assigned CY</TableCell>
              <TableCell>Evaluator</TableCell>
              <TableCell>Remarks</TableCell>
              <TableCell>Evaluated at</TableCell>
              <TableCell align="right">Actions</TableCell>
            </>
          }
        >
          {history.map((item) => (
            <TableRow key={item.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
              <TableCell sx={{ fontWeight: 700, color: primaryDark }}>{item.referenceNo}</TableCell>
              <TableCell>
                <Chip
                  label={item.status}
                  color={statusColor[item.status] ?? 'default'}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </TableCell>
              <TableCell>{item.depotName ?? '—'}</TableCell>
              <TableCell>{item.evaluatorName}</TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                  {item.remarks ?? '—'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {formatDateTime(item.evaluatedAt)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Button
                  component={RouterLink}
                  to={`/evaluations/${item.preAdviceId}`}
                  size="small"
                  variant="outlined"
                  startIcon={<OpenInNewIcon />}
                  sx={{ fontWeight: 600, borderRadius: 2, color: primaryDark, borderColor: hexToRgba(primaryDark, 0.35) }}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </Box>
  )
}
