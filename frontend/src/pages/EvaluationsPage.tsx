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
  ListMobileMeta,
  ListMobileOnly,
  ListMobileTitle,
  LIST_PRIMARY,
  listMobileActionsSx,
  listPageRootSx,
  listTablePaperSx,
} from '../components/layout/ListPagePrimitives'
import { evaluationApi, preAdviceApi, type Evaluation, type PreAdvice } from '../services/api'
import DamageReportChip, { DamageReportChipMuted } from '../components/evaluations/DamageReportChip'
import { formatDateTime } from '../utils/datetime'
import { formatContainerSizeLabel } from '../utils/containerSize'

const primaryDark = LIST_PRIMARY

function remarksPreview(value?: string | null) {
  const text = value?.trim()
  if (!text) return '—'
  return (
    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 220, wordBreak: 'break-word' }}>
      {text}
    </Typography>
  )
}

const STATUS_TABS = [
  { key: 'Submitted', label: 'Submitted', summaryColor: '#1565C0' },
  { key: 'UnderEvaluation', label: 'Under evaluation', summaryColor: '#ED6C02' },
  { key: 'ForCompliance', label: 'For compliance', summaryColor: '#6A1B9A' },
  { key: 'Approved', label: 'Approved', summaryColor: '#2E7D32' },
  { key: 'Rejected', label: 'Rejected', summaryColor: '#D32F2F' },
] as const

type StatusTabKey = (typeof STATUS_TABS)[number]['key']

const PENDING_STATUSES: StatusTabKey[] = ['Submitted', 'UnderEvaluation']

interface EvaluationQueueItem {
  preAdviceId: number
  referenceNo: string
  shippingLineName: string
  containerNo: string
  containerSize: string
  containerType: string
  status: StatusTabKey
  createdAt: string
  truckerRemarks?: string | null
  hasDamageReport: boolean
  depotName?: string | null
  evaluatorName?: string | null
  evaluatorRemarks?: string | null
  evaluatedAt?: string | null
  demurrageValidUntil?: string | null
}

function demurrageChip(validUntil?: string | null) {
  if (!validUntil) return null
  const today = new Date().toISOString().slice(0, 10)
  const expired = validUntil < today
  return (
    <Chip
      label={expired ? `Demurrage expired ${validUntil}` : `Valid until ${validUntil}`}
      size="small"
      color={expired ? 'error' : 'success'}
      variant={expired ? 'filled' : 'outlined'}
      sx={{ fontWeight: 700, maxWidth: '100%' }}
    />
  )
}

function mergeQueue(preAdvices: PreAdvice[], evaluations: Evaluation[]): EvaluationQueueItem[] {
  const evalByPreAdvice = new Map(evaluations.map((e) => [e.preAdviceId, e]))
  const tabKeys = new Set<string>(STATUS_TABS.map((t) => t.key))

  return preAdvices
    .filter((p) => tabKeys.has(p.status))
    .map((p) => {
      const ev = evalByPreAdvice.get(p.id)
      return {
        preAdviceId: p.id,
        referenceNo: p.referenceNo,
        shippingLineName: p.shippingLineName,
        containerNo: p.containerNo,
        containerSize: p.containerSize,
        containerType: p.containerType,
        status: p.status as StatusTabKey,
        createdAt: p.createdAt,
        truckerRemarks: p.remarks,
        hasDamageReport: p.hasDamageReport,
        depotName: ev?.depotName,
        evaluatorName: ev?.evaluatorName,
        evaluatorRemarks: ev?.remarks ?? p.complianceRemarks,
        evaluatedAt: ev?.evaluatedAt,
        demurrageValidUntil: p.demurrageValidUntil,
      }
    })
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#fff',
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
        minWidth: 0,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, lineHeight: 1.3, wordBreak: 'break-word', display: 'block' }}
      >
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, color, mt: 0.5, fontSize: { xs: '1.35rem', sm: '1.5rem' } }}>
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
  const [activeStatus, setActiveStatus] = useState<StatusTabKey>('Submitted')
  const [items, setItems] = useState<EvaluationQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([preAdviceApi.list(), evaluationApi.list()])
      .then(([preAdviceRes, evalRes]) => {
        setItems(mergeQueue(preAdviceRes.data as PreAdvice[], evalRes.data))
      })
      .catch(() => setError('Failed to load evaluation data.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const countByStatus = useMemo(() => {
    const counts = Object.fromEntries(STATUS_TABS.map((t) => [t.key, 0])) as Record<StatusTabKey, number>
    for (const item of items) counts[item.status]++
    return counts
  }, [items])

  const filtered = useMemo(
    () => items.filter((item) => item.status === activeStatus),
    [items, activeStatus],
  )

  const isPendingTab = PENDING_STATUSES.includes(activeStatus)
  const activeTabMeta = STATUS_TABS.find((t) => t.key === activeStatus)!

  const renderMobileCard = (item: EvaluationQueueItem) => (
    <ListMobileCard
      key={item.preAdviceId}
      onClick={isPendingTab ? () => navigate(`/evaluations/${item.preAdviceId}`) : undefined}
    >
      <ListMobileTitle>{item.referenceNo}</ListMobileTitle>
      {item.hasDamageReport && (
        <Box sx={{ mt: 0.5, mb: 0.5 }}>
          <DamageReportChip />
        </Box>
      )}
      <ListMobileMeta>{item.shippingLineName}</ListMobileMeta>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 0.5, fontFamily: 'monospace', fontWeight: 600, wordBreak: 'break-all' }}
      >
        {item.containerNo}
      </Typography>
      <ListMobileMeta>
        Size: {formatContainerSizeLabel(item.containerSize)}
      </ListMobileMeta>
      <ListMobileMeta>Type: {item.containerType}</ListMobileMeta>
      {item.truckerRemarks?.trim() && (
        <ListMobileMeta>Trucker remarks: {item.truckerRemarks.trim()}</ListMobileMeta>
      )}
      {!isPendingTab && (
        <>
          {item.depotName && <ListMobileMeta>CY: {item.depotName}</ListMobileMeta>}
          {item.evaluatorName && <ListMobileMeta>Evaluator: {item.evaluatorName}</ListMobileMeta>}
          {item.evaluatorRemarks?.trim() && (
            <ListMobileMeta>Evaluator remarks: {item.evaluatorRemarks.trim()}</ListMobileMeta>
          )}
          {item.evaluatedAt && (
            <ListMobileMeta>{formatDateTime(item.evaluatedAt)}</ListMobileMeta>
          )}
          {item.status === 'Approved' && demurrageChip(item.demurrageValidUntil) && (
            <Box sx={{ mt: 1 }}>{demurrageChip(item.demurrageValidUntil)}</Box>
          )}
        </>
      )}
      {isPendingTab && (
        <ListMobileMeta>Submitted {formatDateTime(item.createdAt)}</ListMobileMeta>
      )}
      <Box sx={listMobileActionsSx} onClick={(e) => e.stopPropagation()}>
        <Button
          component={RouterLink}
          to={`/evaluations/${item.preAdviceId}`}
          size="small"
          variant={isPendingTab ? 'contained' : 'outlined'}
          startIcon={<OpenInNewIcon />}
          sx={{
            fontWeight: 600,
            borderRadius: 2,
            ...(!isPendingTab && {
              color: primaryDark,
              borderColor: hexToRgba(primaryDark, 0.35),
            }),
          }}
        >
          {isPendingTab ? 'Review' : 'View'}
        </Button>
      </Box>
    </ListMobileCard>
  )

  const renderDesktopRow = (item: EvaluationQueueItem) => (
    <TableRow
      key={item.preAdviceId}
      hover
      sx={{
        '&:last-child td': { borderBottom: 0 },
        cursor: isPendingTab ? 'pointer' : 'default',
      }}
      onClick={isPendingTab ? () => navigate(`/evaluations/${item.preAdviceId}`) : undefined}
    >
      <TableCell sx={{ fontWeight: 700, color: primaryDark }}>{item.referenceNo}</TableCell>
      <TableCell>{item.hasDamageReport ? <DamageReportChip /> : <DamageReportChipMuted />}</TableCell>
      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.containerNo}</TableCell>
      <TableCell>{formatContainerSizeLabel(item.containerSize)}</TableCell>
      <TableCell>{item.containerType}</TableCell>
      <TableCell>{remarksPreview(item.truckerRemarks)}</TableCell>
      {!isPendingTab && (
        <>
          <TableCell>{item.depotName ?? '—'}</TableCell>
          <TableCell>{item.evaluatorName ?? '—'}</TableCell>
          <TableCell>{remarksPreview(item.evaluatorRemarks)}</TableCell>
          <TableCell>{demurrageChip(item.demurrageValidUntil) ?? '—'}</TableCell>
        </>
      )}
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {formatDateTime(isPendingTab ? item.createdAt : (item.evaluatedAt ?? item.createdAt))}
        </Typography>
      </TableCell>
      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
        <Button
          component={RouterLink}
          to={`/evaluations/${item.preAdviceId}`}
          size="small"
          variant={isPendingTab ? 'contained' : 'outlined'}
          startIcon={<OpenInNewIcon />}
          sx={{
            fontWeight: 600,
            borderRadius: 2,
            ...(!isPendingTab && {
              color: primaryDark,
              borderColor: hexToRgba(primaryDark, 0.35),
            }),
          }}
        >
          {isPendingTab ? 'Review' : 'View'}
        </Button>
      </TableCell>
    </TableRow>
  )

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
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            alignItems: 'flex-start',
            position: 'relative',
          }}
        >
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
              Review pre-forecast requests and assign container yard (CY) for approved returns.{' '}
              <RouterLink to="/evaluations/cy-allocation" style={{ color: '#fff', fontWeight: 600 }}>
                View CY contract allocation
              </RouterLink>
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
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(3, 1fr)',
            lg: 'repeat(5, 1fr)',
          },
          gap: { xs: 1.5, sm: 2 },
          mb: 3,
        }}
      >
        {STATUS_TABS.map((tab) => (
          <SummaryCard
            key={tab.key}
            label={tab.label}
            value={countByStatus[tab.key]}
            color={tab.summaryColor}
          />
        ))}
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
          value={activeStatus}
          onChange={(_, v) => setActiveStatus(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
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
          {STATUS_TABS.map((tab) => (
            <Tab
              key={tab.key}
              value={tab.key}
              label={`${tab.label} (${countByStatus[tab.key]})`}
            />
          ))}
        </Tabs>
      </Paper>

      <DataTable
        loading={loading}
        emptyMessage={`No ${activeTabMeta.label.toLowerCase()} requests.`}
        isEmpty={!loading && filtered.length === 0}
        mobile={filtered.map(renderMobileCard)}
        headCells={
          isPendingTab ? (
            <>
              <TableCell>Reference</TableCell>
              <TableCell>Damage</TableCell>
              <TableCell>Container</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Trucker remarks</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell align="right">Actions</TableCell>
            </>
          ) : (
            <>
              <TableCell>Reference</TableCell>
              <TableCell>Damage</TableCell>
              <TableCell>Container</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Trucker remarks</TableCell>
              <TableCell>Assigned CY</TableCell>
              <TableCell>Evaluator</TableCell>
              <TableCell>Evaluator remarks</TableCell>
              <TableCell>Demurrage</TableCell>
              <TableCell>Evaluated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </>
          )
        }
      >
        {filtered.map(renderDesktopRow)}
      </DataTable>
    </Box>
  )
}
