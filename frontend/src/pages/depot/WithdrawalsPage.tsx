import { ListLoadingState } from '../../components/layout/ListPagePrimitives'
import { Alert, Box, Button, Chip, InputAdornment, Paper, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography } from '@mui/material'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import SearchIcon from '@mui/icons-material/Search'
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { hexToRgba } from '../../components/layout/DetailPagePrimitives'
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
} from '../../components/layout/ListPagePrimitives'
import { withdrawalApi, type Withdrawal } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { formatDateTime, formatScheduleDate } from '../../utils/datetime'
import ScheduleWithdrawalPickupDialog from '../../components/withdrawals/ScheduleWithdrawalPickupDialog'

const primaryDark = LIST_PRIMARY

type WithdrawalFilterTab =
  | 'NeedsReview'
  | 'AwaitingSchedule'
  | 'Scheduled'
  | 'Submitted'
  | 'UnderReview'
  | 'Approved'
  | 'Released'
  | 'Rejected'

const FILTER_TABS: {
  key: WithdrawalFilterTab
  label: string
  summaryColor: string
  match: (item: Withdrawal) => boolean
}[] = [
  {
    key: 'NeedsReview',
    label: 'Needs review',
    summaryColor: '#ED6C02',
    match: (w) => w.status === 'Submitted' || w.status === 'UnderReview',
  },
  {
    key: 'AwaitingSchedule',
    label: 'Awaiting schedule',
    summaryColor: '#9C27B0',
    match: (w) => w.status === 'CyAssigned',
  },
  {
    key: 'Scheduled',
    label: 'Scheduled',
    summaryColor: '#0288D1',
    match: (w) => w.status === 'Scheduled',
  },
  { key: 'Submitted', label: 'Submitted', summaryColor: '#0288D1', match: (w) => w.status === 'Submitted' },
  { key: 'UnderReview', label: 'Under review', summaryColor: '#F57C00', match: (w) => w.status === 'UnderReview' },
  { key: 'Approved', label: 'Approved', summaryColor: '#2E7D32', match: (w) => w.status === 'Approved' },
  { key: 'Released', label: 'Released', summaryColor: '#1565C0', match: (w) => w.status === 'Released' },
  { key: 'Rejected', label: 'Rejected', summaryColor: '#D32F2F', match: (w) => w.status === 'Rejected' },
]

const statusColor: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  Submitted: 'info',
  UnderReview: 'warning',
  Approved: 'success',
  Rejected: 'error',
  Released: 'success',
  CyAssigned: 'info',
  Scheduled: 'info',
  Booked: 'warning',
}

const statusLabel: Record<string, string> = {
  UnderReview: 'Under review',
}

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

const WIDGET_LABELS: Record<string, string> = {
  expiring48: 'ATW expiring within 48 hours',
  stuck24: 'Submitted over 24 hours ago',
  rejectedReasons: 'Recently rejected',
  turnaround: 'Released / completed',
}

function SummaryCard({
  label,
  value,
  color,
  active,
  onClick,
}: {
  label: string
  value: number
  color: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 3,
        border: '2px solid',
        borderColor: active ? color : 'divider',
        bgcolor: active ? hexToRgba(color, 0.06) : '#fff',
        boxShadow: active ? `0 4px 16px ${hexToRgba(color, 0.15)}` : '0 2px 12px rgba(15, 23, 42, 0.05)',
        minWidth: 0,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:hover': onClick
          ? { borderColor: color, boxShadow: `0 4px 16px ${hexToRgba(color, 0.12)}` }
          : undefined,
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

function expirationChip(expirationDate: string) {
  const exp = new Date(`${expirationDate}T23:59:59`)
  const now = new Date()
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)
  if (exp < now) {
    return <Chip label="Expired" size="small" color="error" sx={{ fontWeight: 700 }} />
  }
  if (exp <= in48h) {
    return (
      <Chip
        label={`Expires ${formatScheduleDate(expirationDate)}`}
        size="small"
        color="warning"
        sx={{ fontWeight: 700 }}
      />
    )
  }
  return (
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      {formatScheduleDate(expirationDate)}
    </Typography>
  )
}

function matchesSearch(item: Withdrawal, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    item.referenceNo.toLowerCase().includes(q) ||
    item.atwNumber.toLowerCase().includes(q) ||
    item.truckerName.toLowerCase().includes(q) ||
    item.shippingLineName.toLowerCase().includes(q) ||
    item.destination.toLowerCase().includes(q) ||
    item.containerSummary.toLowerCase().includes(q)
  )
}

function isBookFirstCyAssigned(item: Withdrawal) {
  return item.status === 'CyAssigned' && Boolean(item.bookedAt || item.bookingNumber)
}

function rowActionLabel(item: Withdrawal) {
  if (item.status === 'CyAssigned') return isBookFirstCyAssigned(item) ? 'Schedule' : 'Confirm ATW'
  if (item.status === 'Approved') return 'Release'
  if (item.status === 'Submitted' || item.status === 'UnderReview') return 'Review'
  return 'View'
}

function WithdrawalRowActions({
  item,
  onClick,
  onSchedule,
}: {
  item: Withdrawal
  onClick: () => void
  onSchedule?: () => void
}) {
  const isUrgent = item.status === 'Submitted' || item.status === 'UnderReview' || item.status === 'CyAssigned'
  return (
    <Button
      size="small"
      variant={isUrgent ? 'contained' : 'outlined'}
      endIcon={<OpenInNewIcon />}
      onClick={(e) => {
        e.stopPropagation()
        if (item.status === 'CyAssigned' && isBookFirstCyAssigned(item) && onSchedule) onSchedule()
        else onClick()
      }}
      sx={{ fontWeight: 600, borderRadius: 2 }}
    >
      {rowActionLabel(item)}
    </Button>
  )
}

export default function DepotWithdrawalsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const user = useAppSelector((s) => s.auth.user)
  const [activeTab, setActiveTab] = useState<WithdrawalFilterTab>('NeedsReview')
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [scheduleItem, setScheduleItem] = useState<Withdrawal | null>(null)
  const widget = searchParams.get('widget')

  useEffect(() => {
    if (searchParams.get('tab') === 'awaiting-schedule') {
      setActiveTab('AwaitingSchedule')
    }
  }, [searchParams])

  useEffect(() => {
    const message = (location.state as { message?: string } | null)?.message
    if (message) {
      setSuccessMessage(message)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    withdrawalApi
      .list()
      .then(({ data }) => setItems(data))
      .catch(() => setError('Failed to load withdrawal queue.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (widget === 'stuck24') setActiveTab('UnderReview')
    else if (widget === 'rejectedReasons') setActiveTab('Rejected')
    else if (widget === 'turnaround') setActiveTab('Released')
    else if (widget === 'expiring48') setActiveTab('NeedsReview')
  }, [widget])

  const counts = useMemo(
    () =>
      FILTER_TABS.reduce(
        (acc, tab) => {
          acc[tab.key] = items.filter(tab.match).length
          return acc
        },
        {} as Record<WithdrawalFilterTab, number>,
      ),
    [items],
  )

  const needsReviewCount = counts.NeedsReview

  const filtered = useMemo(() => {
    const tab = FILTER_TABS.find((t) => t.key === activeTab)!
    let base = items.filter(tab.match).filter((item) => matchesSearch(item, search))

    if (widget === 'expiring48') {
      const now = new Date()
      const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)
      base = base.filter((w) => {
        const exp = new Date(`${w.expirationDate}T23:59:59`)
        return exp >= now && exp <= in48h
      })
    } else if (widget === 'stuck24') {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
      base = base.filter(
        (w) =>
          ['Submitted', 'UnderReview'].includes(w.status) &&
          !!w.submittedAt &&
          new Date(w.submittedAt) <= cutoff,
      )
    }

    return base.sort((a, b) => {
      const aTime = a.submittedAt ?? a.createdAt
      const bTime = b.submittedAt ?? b.createdAt
      return bTime.localeCompare(aTime)
    })
  }, [items, activeTab, search, widget])

  const activeTabMeta = FILTER_TABS.find((t) => t.key === activeTab)!

  const expiringInQueue = useMemo(() => {
    const now = new Date()
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)
    return items.filter((w) => {
      if (!['Submitted', 'UnderReview', 'Approved'].includes(w.status)) return false
      const exp = new Date(`${w.expirationDate}T23:59:59`)
      return exp >= now && exp <= in48h
    }).length
  }, [items])

  if (user?.role !== 'DepotPersonnel') {
    return <Navigate to="/" replace />
  }

  const emptyLabel =
    activeTab === 'NeedsReview'
      ? 'needs review'
      : activeTab === 'UnderReview'
        ? 'under review'
        : activeTabMeta.label.toLowerCase()

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
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', position: 'relative', minWidth: 0 }}>
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
            <UnarchiveOutlinedIcon />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, fontSize: { xs: '1.35rem', sm: '1.75rem' } }}>
              CY withdrawal review
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.88)', mt: 0.5, maxWidth: 560, lineHeight: 1.5 }}>
              Validate ATW documents, approve repositioning requests, and release containers at your yard.
            </Typography>
            {needsReviewCount > 0 && (
              <Chip
                label={`${needsReviewCount} awaiting review`}
                size="small"
                sx={{
                  mt: 1.25,
                  fontWeight: 700,
                  bgcolor: 'rgba(255,255,255,0.16)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.28)',
                }}
              />
            )}
          </Box>
        </Box>
      </Paper>

      {needsReviewCount > 0 && activeTab !== 'NeedsReview' && (
        <Alert
          severity="warning"
          sx={{ mb: 2, borderRadius: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => setActiveTab('NeedsReview')} sx={{ fontWeight: 600 }}>
              Open queue
            </Button>
          }
        >
          {needsReviewCount} withdrawal request{needsReviewCount === 1 ? '' : 's'} still need depot review.
        </Alert>
      )}

      {expiringInQueue > 0 && !widget && (
        <Alert
          severity="info"
          icon={<WarningAmberOutlinedIcon />}
          sx={{ mb: 2, borderRadius: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => setSearchParams({ widget: 'expiring48' })}
              sx={{ fontWeight: 600 }}
            >
              Show expiring
            </Button>
          }
        >
          {expiringInQueue} active request{expiringInQueue === 1 ? '' : 's'} with ATW expiring within 48 hours.
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(3, 1fr)',
            lg: 'repeat(7, 1fr)',
          },
          gap: { xs: 1.5, sm: 2 },
          mb: 3,
        }}
      >
        {FILTER_TABS.map((tab) => (
          <SummaryCard
            key={tab.key}
            label={tab.label}
            value={counts[tab.key]}
            color={tab.summaryColor}
            active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
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
          value={activeTab}
          onChange={(_, value: WithdrawalFilterTab) => setActiveTab(value)}
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
          {FILTER_TABS.map((tab) => (
            <Tab key={tab.key} value={tab.key} label={`${tab.label} (${counts[tab.key]})`} />
          ))}
        </Tabs>
      </Paper>

      <TextField
        fullWidth
        size="small"
        placeholder="Search reference, ATW, trucker, line, destination, container…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ ...fieldSx, mb: 2 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          },
        }}
      />

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
        In the book-first flow, trucker bookings appear here only after the shipping line assigns your container yard.
        Open the <strong>Awaiting schedule</strong> tab once CY is assigned, then set the pick-up day.
        Bookings still with the shipping line (status Booked) are not shown on this page yet.
      </Alert>

      {widget && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
            <Box>
              Dashboard filter: <strong>{WIDGET_LABELS[widget] ?? widget}</strong> — {filtered.length} request
              {filtered.length === 1 ? '' : 's'}.
            </Box>
            <Button size="small" variant="outlined" onClick={() => setSearchParams({})}>
              Clear filter
            </Button>
          </Box>
        </Alert>
      )}

      <Paper elevation={0} sx={listTablePaperSx}>
        {loading ? (
          <ListLoadingState />
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 8, px: 3, textAlign: 'center' }}>
            <UnarchiveOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
              {search.trim()
                ? 'No requests match your search on this tab.'
                : `No ${emptyLabel} withdrawal requests.`}
            </Typography>
            {activeTab === 'NeedsReview' && !search.trim() && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Legacy trucker submissions (Submitted / Under review) appear here for ATW validation.
              </Typography>
            )}
            {activeTab === 'AwaitingSchedule' && !search.trim() && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                After a trucker books ICS, the shipping line must assign CY first. Those requests then show here so you can set pick-up day and time.
              </Typography>
            )}
          </Box>
        ) : (
          <>
            <ListDesktopOnly>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow
                      sx={{
                        bgcolor: hexToRgba(primaryDark, 0.04),
                        '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', py: 1.75 },
                      }}
                    >
                      <TableCell>Reference</TableCell>
                      <TableCell>ATW</TableCell>
                      <TableCell>Trucker</TableCell>
                      <TableCell>Shipping line</TableCell>
                      <TableCell>Destination</TableCell>
                      <TableCell>Containers</TableCell>
                      <TableCell>ATW expires</TableCell>
                      <TableCell>Submitted</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((row) => (
                      <TableRow
                        key={row.id}
                        hover
                        sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                        onClick={() => navigate(`/depot/withdrawals/${row.id}`)}
                      >
                        <TableCell sx={{ fontWeight: 700, color: primaryDark }}>{row.referenceNo}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {row.atwNumber}
                          {!row.hasAtwDocument && (
                            <Chip
                              label="No file"
                              size="small"
                              color="warning"
                              variant="outlined"
                              sx={{ ml: 0.75, height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                            />
                          )}
                        </TableCell>
                        <TableCell>{row.truckerName}</TableCell>
                        <TableCell>{row.shippingLineName}</TableCell>
                        <TableCell>{row.destination}</TableCell>
                        <TableCell>
                          {row.containerCount} unit{row.containerCount === 1 ? '' : 's'}
                          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                            {row.containerSummary}
                          </Typography>
                        </TableCell>
                        <TableCell>{expirationChip(row.expirationDate)}</TableCell>
                        <TableCell>{row.submittedAt ? formatDateTime(row.submittedAt) : '—'}</TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="small"
                            variant={
                              row.status === 'Submitted' || row.status === 'UnderReview' || row.status === 'CyAssigned'
                                ? 'contained'
                                : 'outlined'
                            }
                            endIcon={<OpenInNewIcon />}
                            onClick={() => {
                              if (row.status === 'CyAssigned' && isBookFirstCyAssigned(row)) setScheduleItem(row)
                              else navigate(`/depot/withdrawals/${row.id}`)
                            }}
                            sx={{ fontWeight: 600, borderRadius: 2 }}
                          >
                            {rowActionLabel(row)}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </ListDesktopOnly>

            <ListMobileOnly>
              {filtered.map((row) => (
                <ListMobileCard key={row.id} onClick={() => navigate(`/depot/withdrawals/${row.id}`)}>
                    <ListMobileTitle>{row.referenceNo}</ListMobileTitle>
                    <ListMobileMeta>
                      ATW {row.atwNumber} · {row.truckerName}
                    </ListMobileMeta>
                    <ListMobileMeta>
                      {row.shippingLineName} → {row.destination}
                    </ListMobileMeta>
                    <ListMobileMeta>
                      {row.containerCount} container{row.containerCount === 1 ? '' : 's'} · {row.containerSummary}
                    </ListMobileMeta>
                    <ListMobileMeta>
                      Submitted {row.submittedAt ? formatDateTime(row.submittedAt) : '—'}
                    </ListMobileMeta>
                    <ListMobileChipRow>
                      <Chip
                        label={statusLabel[row.status] ?? row.status}
                        size="small"
                        color={statusColor[row.status] ?? 'default'}
                        sx={{ fontWeight: 600 }}
                      />
                      {expirationChip(row.expirationDate)}
                      {!row.hasAtwDocument && (
                        <Chip label="No ATW file" size="small" color="warning" variant="outlined" sx={{ fontWeight: 600 }} />
                      )}
                    </ListMobileChipRow>
                    <Box sx={listMobileActionsSx} onClick={(e) => e.stopPropagation()}>
                      <WithdrawalRowActions
                        item={row}
                        onClick={() => navigate(`/depot/withdrawals/${row.id}`)}
                        onSchedule={() => {
                          if (isBookFirstCyAssigned(row)) setScheduleItem(row)
                        }}
                      />
                    </Box>
                  </ListMobileCard>
                ))}
            </ListMobileOnly>
          </>
        )}
      </Paper>

      <ScheduleWithdrawalPickupDialog
        open={Boolean(scheduleItem)}
        item={scheduleItem}
        onClose={() => setScheduleItem(null)}
        onScheduled={(updated) => {
          setItems((prev) => prev.map((w) => (w.id === updated.id ? updated : w)))
          setSuccessMessage(`Pick-up scheduled for ${updated.referenceNo}.`)
          setScheduleItem(null)
        }}
      />
    </Box>
  )
}
