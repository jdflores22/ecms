import { ListLoadingState } from '../../components/layout/ListPagePrimitives'
import { StatCardsSkeleton } from '../../components/layout/SkeletonPrimitives'
import { Alert, Box, Button, Chip, Paper, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Tabs, TextField, Typography } from '@mui/material'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import DownloadIcon from '@mui/icons-material/Download'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined'
import { useCallback, useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import {
  ListDesktopOnly,
  ListMobileCard,
  ListMobileChipRow,
  ListMobileMeta,
  ListMobileOnly,
  ListMobileTitle,
  LIST_PRIMARY,
  listHeroActionSx,
  listPageRootSx,
} from '../../components/layout/ListPagePrimitives'
import { heroMutedChipSx, heroPaperSx } from '../../components/layout/DetailPagePrimitives'
import {
  reportApi,
  type TransactionDepotOverview,
  type TransactionReport,
  type TransactionShippingLineOverview,
} from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import {
  defaultReportFromDate,
  formatDateTime,
  formatPeso,
  formatScheduleDate,
  todayIsoDate,
} from '../../utils/datetime'

const primaryDark = LIST_PRIMARY

type PageTab = 'transactions' | 'shippingLines' | 'containerYards'

const PAGE_TABS: { key: PageTab; label: string }[] = [
  { key: 'transactions', label: 'Transactions' },
  { key: 'shippingLines', label: 'Shipping lines' },
  { key: 'containerYards', label: 'Container yards' },
]

const paymentStatusColor: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  Pending: 'default',
  ForVerification: 'warning',
  Paid: 'success',
  Rejected: 'error',
}

const paymentStatusLabel: Record<string, string> = {
  Pending: 'Pending',
  ForVerification: 'For verification',
  Paid: 'Verified',
  Rejected: 'Rejected',
}

function parsePageTab(tab: string | null): PageTab {
  if (tab === 'shipping-lines') return 'shippingLines'
  if (tab === 'container-yards') return 'containerYards'
  return 'transactions'
}

function pageTabSearchParam(tab: PageTab): Record<string, string> {
  if (tab === 'shippingLines') return { tab: 'shipping-lines' }
  if (tab === 'containerYards') return { tab: 'container-yards' }
  return {}
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
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

function TransactionSummaryCards({
  paidCount,
  paidAmount,
  pendingCount,
  rejectedCount,
}: {
  paidCount: number
  paidAmount: number
  pendingCount: number
  rejectedCount: number
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <SummaryCard label="Verified" value={String(paidCount)} color="#2E7D32" />
      <SummaryCard label="Verified amount" value={formatPeso(paidAmount)} color={primaryDark} />
      <SummaryCard label="Pending review" value={String(pendingCount)} color="#ED6C02" />
      <SummaryCard label="Rejected" value={String(rejectedCount)} color="#D32F2F" />
    </Box>
  )
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v)
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function AdminTransactionReportsPage() {
  const user = useAppSelector((s) => s.auth.user)
  const [searchParams, setSearchParams] = useSearchParams()

  const [pageTab, setPageTab] = useState<PageTab>(() => parsePageTab(searchParams.get('tab')))

  const [from, setFrom] = useState(defaultReportFromDate())
  const [to, setTo] = useState(todayIsoDate())
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [exporting, setExporting] = useState(false)
  const [txReport, setTxReport] = useState<TransactionReport | null>(null)
  const [txLoading, setTxLoading] = useState(true)
  const [txError, setTxError] = useState('')

  const [shippingOverview, setShippingOverview] = useState<TransactionShippingLineOverview | null>(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingError, setShippingError] = useState('')

  const [depotOverview, setDepotOverview] = useState<TransactionDepotOverview | null>(null)
  const [depotLoading, setDepotLoading] = useState(false)
  const [depotError, setDepotError] = useState('')

  const loadTransactions = useCallback(
    (requestedPage?: number) => {
      if (user?.role !== 'Administrator') return
      const activePage = requestedPage ?? page
      setTxLoading(true)
      setTxError('')
      reportApi
        .transactions({ from, to, page: activePage + 1, pageSize: rowsPerPage })
        .then(({ data }) => setTxReport(data))
        .catch(() => setTxError('Failed to load transaction report.'))
        .finally(() => setTxLoading(false))
    },
    [user?.role, from, to, page, rowsPerPage],
  )

  const loadShippingLines = useCallback(() => {
    if (user?.role !== 'Administrator') return
    setShippingLoading(true)
    setShippingError('')
    reportApi
      .transactionShippingLines({ from, to })
      .then(({ data }) => setShippingOverview(data))
      .catch(() => setShippingError('Failed to load shipping line overview.'))
      .finally(() => setShippingLoading(false))
  }, [user?.role, from, to])

  const loadContainerYards = useCallback(() => {
    if (user?.role !== 'Administrator') return
    setDepotLoading(true)
    setDepotError('')
    reportApi
      .transactionDepots({ from, to })
      .then(({ data }) => setDepotOverview(data))
      .catch(() => setDepotError('Failed to load container yard overview.'))
      .finally(() => setDepotLoading(false))
  }, [user?.role, from, to])

  const applyDateFilters = () => {
    setPage(0)
    if (pageTab === 'transactions') loadTransactions(0)
    else if (pageTab === 'shippingLines') loadShippingLines()
    else if (pageTab === 'containerYards') loadContainerYards()
  }

  useEffect(() => {
    if (pageTab === 'transactions') loadTransactions()
  }, [pageTab, loadTransactions])

  useEffect(() => {
    if (pageTab === 'shippingLines') loadShippingLines()
  }, [pageTab, loadShippingLines])

  useEffect(() => {
    if (pageTab === 'containerYards') loadContainerYards()
  }, [pageTab, loadContainerYards])

  const handlePageTabChange = (_: unknown, value: PageTab) => {
    setPageTab(value)
    setSearchParams(pageTabSearchParam(value), { replace: true })
  }

  const handleRefresh = () => {
    if (pageTab === 'transactions') loadTransactions()
    else if (pageTab === 'shippingLines') loadShippingLines()
    else if (pageTab === 'containerYards') loadContainerYards()
  }

  const isRefreshing =
    (pageTab === 'transactions' && txLoading) ||
    (pageTab === 'shippingLines' && shippingLoading) ||
    (pageTab === 'containerYards' && depotLoading)

  const exportTransactions = async () => {
    if (!txReport?.total) return
    setExporting(true)
    try {
      const { data } = await reportApi.transactions({
        from,
        to,
        page: 1,
        pageSize: txReport.total,
      })
      downloadCsv(
        `transactions-${data.from}-${data.to}.csv`,
        ['Date', 'Container', 'Reference', 'Trucker', 'Shipping line', 'Container yard', 'Status', 'Amount'],
        data.rows.map((row) => [
          row.transactionDate,
          row.containerNo,
          row.referenceNo,
          row.truckerName,
          `${row.shippingLineCode} — ${row.shippingLineName}`,
          row.depotName,
          paymentStatusLabel[row.status] ?? row.status,
          row.amount,
        ]),
      )
    } catch {
      setTxError('Failed to export transactions.')
    } finally {
      setExporting(false)
    }
  }

  const exportShippingLines = () => {
    if (!shippingOverview?.rows.length) return
    downloadCsv(
      `transactions-by-shipping-line-${shippingOverview.from}-${shippingOverview.to}.csv`,
      ['Code', 'Shipping line', 'Total', 'Verified', 'Pending', 'Rejected', 'Verified amount'],
      shippingOverview.rows.map((row) => [
        row.code,
        row.name,
        row.totalCount,
        row.paidCount,
        row.pendingCount,
        row.rejectedCount,
        row.paidAmount,
      ]),
    )
  }

  const exportContainerYards = () => {
    if (!depotOverview?.rows.length) return
    downloadCsv(
      `transactions-by-container-yard-${depotOverview.from}-${depotOverview.to}.csv`,
      ['Container yard', 'Total', 'Verified', 'Pending', 'Rejected', 'Verified amount'],
      depotOverview.rows.map((row) => [
        row.name,
        row.totalCount,
        row.paidCount,
        row.pendingCount,
        row.rejectedCount,
        row.paidAmount,
      ]),
    )
  }

  const dateFilterBar = (options: { showExport?: boolean; onExport?: () => void; exportingCsv?: boolean; loading?: boolean }) => (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 3,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#fff',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        alignItems: 'flex-end',
      }}
    >
      <TextField
        label="From"
        type="date"
        size="small"
        value={from}
        onChange={(e) => {
          setFrom(e.target.value)
          setPage(0)
        }}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ width: { xs: '100%', sm: 160 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
      />
      <TextField
        label="To"
        type="date"
        size="small"
        value={to}
        onChange={(e) => {
          setTo(e.target.value)
          setPage(0)
        }}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ width: { xs: '100%', sm: 160 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
      />
      <Button variant="contained" onClick={applyDateFilters} disabled={options.loading} sx={{ borderRadius: 2, fontWeight: 600 }}>
        Apply
      </Button>
      {options.showExport && options.onExport && (
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={options.onExport}
          disabled={options.exportingCsv}
          sx={{ borderRadius: 2, fontWeight: 600, ml: { sm: 'auto' } }}
        >
          Export CSV
        </Button>
      )}
    </Paper>
  )

  if (searchParams.get('tab') === 'revenue') {
    return <Navigate to="/admin/revenue" replace />
  }

  if (user?.role !== 'Administrator') {
    return <Navigate to="/" replace />
  }

  return (
    <Box sx={listPageRootSx}>
      <Paper elevation={0} sx={heroPaperSx}>
        <Box sx={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <AssessmentOutlinedIcon />
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Transaction reports
              </Typography>
            </Box>
            <Typography sx={{ color: 'rgba(255,255,255,0.88)', maxWidth: 640 }}>
              Payment ledger by container number with shipping line and container yard breakdown.
              reports used by truckers and evaluators.
            </Typography>
            <Chip label="Administrator" size="small" sx={{ ...heroMutedChipSx, mt: 1.5 }} />
          </Box>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh} disabled={isRefreshing} sx={listHeroActionSx}>
            Refresh
          </Button>
        </Box>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: '#fff',
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={pageTab}
          onChange={handlePageTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: { xs: 1, sm: 2 },
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 48 },
            '& .MuiTabs-indicator': { height: 3, bgcolor: primaryDark },
          }}
        >
          {PAGE_TABS.map((tab) => (
            <Tab key={tab.key} value={tab.key} label={tab.label} />
          ))}
        </Tabs>
      </Paper>

      {pageTab === 'transactions' && (
        <>
          {dateFilterBar({
            showExport: true,
            onExport: exportTransactions,
            exportingCsv: exporting,
            loading: txLoading,
          })}

          {txError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setTxError('')}>
              {txError}
            </Alert>
          )}

          {txLoading ? (
            <StatCardsSkeleton count={4} />
          ) : (
            txReport && (
              <TransactionSummaryCards
                paidCount={txReport.paidCount}
                paidAmount={txReport.paidAmount}
                pendingCount={txReport.pendingCount}
                rejectedCount={txReport.rejectedCount}
              />
            )
          )}

          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: '#fff',
              boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                px: 2.5,
                py: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              <PaymentsOutlinedIcon sx={{ color: primaryDark }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
                Payment ledger
              </Typography>
              {txReport && (
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {formatScheduleDate(txReport.from)} – {formatScheduleDate(txReport.to)} · {txReport.total} records
                </Typography>
              )}
            </Box>

            {txLoading ? (
              <ListLoadingState rows={6} />
            ) : txReport && txReport.total > 0 ? (
              <>
                <ListDesktopOnly>
                  <TableContainer sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: hexToRgba(primaryDark, 0.04) }}>
                          <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Container</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Trucker</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Shipping line</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Container yard</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            Amount
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {txReport.rows.map((row) => (
                          <TableRow key={row.paymentId} hover>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {formatScheduleDate(row.transactionDate)}
                              </Typography>
                              {row.transactionAt && (
                                <Typography variant="caption" color="text.secondary">
                                  {formatDateTime(row.transactionAt)}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell
                              sx={{
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                letterSpacing: '0.02em',
                              }}
                            >
                              {row.containerNo || '—'}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{row.referenceNo}</TableCell>
                            <TableCell>{row.truckerName}</TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {row.shippingLineCode}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {row.shippingLineName}
                              </Typography>
                            </TableCell>
                            <TableCell>{row.depotName}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={paymentStatusLabel[row.status] ?? row.status}
                                color={paymentStatusColor[row.status] ?? 'default'}
                                sx={{ fontWeight: 600 }}
                              />
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: primaryDark }}>
                              {formatPeso(row.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </ListDesktopOnly>

                <ListMobileOnly>
                  <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {txReport.rows.map((row) => (
                    <ListMobileCard key={row.paymentId}>
                      <ListMobileTitle>{row.containerNo || row.referenceNo}</ListMobileTitle>
                      {row.containerNo && <ListMobileMeta>Ref {row.referenceNo}</ListMobileMeta>}
                      <ListMobileMeta>{row.truckerName}</ListMobileMeta>
                      <ListMobileMeta>
                        {row.shippingLineCode} · {row.depotName}
                      </ListMobileMeta>
                      <ListMobileMeta>
                        {formatScheduleDate(row.transactionDate)}
                        {row.transactionAt ? ` · ${formatDateTime(row.transactionAt)}` : ''}
                      </ListMobileMeta>
                      <ListMobileChipRow>
                        <Chip
                          size="small"
                          label={paymentStatusLabel[row.status] ?? row.status}
                          color={paymentStatusColor[row.status] ?? 'default'}
                          sx={{ fontWeight: 600 }}
                        />
                        <Chip size="small" label={formatPeso(row.amount)} sx={{ fontWeight: 700 }} />
                      </ListMobileChipRow>
                    </ListMobileCard>
                  ))}
                  </Box>
                </ListMobileOnly>

                <TablePagination
                  component="div"
                  count={txReport.total}
                  page={page}
                  onPageChange={(_, p) => setPage(p)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10))
                    setPage(0)
                  }}
                  rowsPerPageOptions={[25, 50, 100]}
                  sx={{
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    '& .MuiTablePagination-select': { borderRadius: 1 },
                  }}
                />
              </>
            ) : (
              <Box sx={{ py: 8, px: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">No payment transactions in this date range.</Typography>
              </Box>
            )}
          </Paper>
        </>
      )}

      {pageTab === 'shippingLines' && (
        <>
          {dateFilterBar({
            showExport: true,
            onExport: exportShippingLines,
            loading: shippingLoading,
          })}

          {shippingError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setShippingError('')}>
              {shippingError}
            </Alert>
          )}

          {shippingLoading ? (
            <StatCardsSkeleton count={4} />
          ) : (
            shippingOverview && (
              <TransactionSummaryCards
                paidCount={shippingOverview.paidCount}
                paidAmount={shippingOverview.paidAmount}
                pendingCount={shippingOverview.pendingCount}
                rejectedCount={shippingOverview.rejectedCount}
              />
            )
          )}

          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: '#fff',
              boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                px: 2.5,
                py: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              <LocalShippingOutlinedIcon sx={{ color: primaryDark }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
                By shipping line
              </Typography>
              {shippingOverview && (
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {formatScheduleDate(shippingOverview.from)} – {formatScheduleDate(shippingOverview.to)} ·{' '}
                  {shippingOverview.rows.length} lines
                </Typography>
              )}
            </Box>

            {shippingLoading ? (
              <ListLoadingState rows={6} />
            ) : shippingOverview && shippingOverview.rows.length > 0 ? (
              <>
                <ListMobileOnly>
                  {shippingOverview.rows.map((row) => (
                    <ListMobileCard key={row.shippingLineId}>
                      <ListMobileTitle>
                        {row.code} · {row.name}
                      </ListMobileTitle>
                      <ListMobileMeta>Total {row.totalCount} payments</ListMobileMeta>
                      <ListMobileChipRow>
                        <Chip size="small" label={`Verified ${row.paidCount}`} color="success" sx={{ fontWeight: 600 }} />
                        <Chip size="small" label={`Pending ${row.pendingCount}`} color="warning" sx={{ fontWeight: 600 }} />
                        <Chip size="small" label={`Rejected ${row.rejectedCount}`} color="error" sx={{ fontWeight: 600 }} />
                        <Chip size="small" label={formatPeso(row.paidAmount)} sx={{ fontWeight: 700 }} />
                      </ListMobileChipRow>
                    </ListMobileCard>
                  ))}
                  <ListMobileCard>
                    <ListMobileTitle>Total</ListMobileTitle>
                    <ListMobileChipRow>
                      <Chip size="small" label={`Count ${shippingOverview.totalCount}`} sx={{ fontWeight: 700 }} />
                      <Chip size="small" label={formatPeso(shippingOverview.paidAmount)} sx={{ fontWeight: 700 }} />
                    </ListMobileChipRow>
                  </ListMobileCard>
                </ListMobileOnly>
                <ListDesktopOnly>
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: hexToRgba(primaryDark, 0.04) }}>
                      <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Shipping line</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Total
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Verified
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Pending
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Rejected
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Verified amount
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {shippingOverview.rows.map((row) => (
                      <TableRow key={row.shippingLineId} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{row.code}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell align="right">{row.totalCount}</TableCell>
                        <TableCell align="right" sx={{ color: '#2E7D32', fontWeight: 600 }}>
                          {row.paidCount}
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#ED6C02', fontWeight: 600 }}>
                          {row.pendingCount}
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#D32F2F', fontWeight: 600 }}>
                          {row.rejectedCount}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: primaryDark }}>
                          {formatPeso(row.paidAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: hexToRgba(primaryDark, 0.03) }}>
                      <TableCell colSpan={2} sx={{ fontWeight: 800 }}>
                        Total
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {shippingOverview.totalCount}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#2E7D32' }}>
                        {shippingOverview.paidCount}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#ED6C02' }}>
                        {shippingOverview.pendingCount}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#D32F2F' }}>
                        {shippingOverview.rejectedCount}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: primaryDark }}>
                        {formatPeso(shippingOverview.paidAmount)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
                </ListDesktopOnly>
              </>
            ) : (
              <Box sx={{ py: 8, px: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">No payment activity by shipping line in this date range.</Typography>
              </Box>
            )}
          </Paper>
        </>
      )}

      {pageTab === 'containerYards' && (
        <>
          {dateFilterBar({
            showExport: true,
            onExport: exportContainerYards,
            loading: depotLoading,
          })}

          {depotError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setDepotError('')}>
              {depotError}
            </Alert>
          )}

          {depotLoading ? (
            <StatCardsSkeleton count={4} />
          ) : (
            depotOverview && (
              <TransactionSummaryCards
                paidCount={depotOverview.paidCount}
                paidAmount={depotOverview.paidAmount}
                pendingCount={depotOverview.pendingCount}
                rejectedCount={depotOverview.rejectedCount}
              />
            )
          )}

          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: '#fff',
              boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                px: 2.5,
                py: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              <WarehouseOutlinedIcon sx={{ color: primaryDark }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
                By container yard (CY)
              </Typography>
              {depotOverview && (
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {formatScheduleDate(depotOverview.from)} – {formatScheduleDate(depotOverview.to)} ·{' '}
                  {depotOverview.rows.length} yards
                </Typography>
              )}
            </Box>

            {depotLoading ? (
              <ListLoadingState rows={6} />
            ) : depotOverview && depotOverview.rows.length > 0 ? (
              <>
                <ListMobileOnly>
                  {depotOverview.rows.map((row) => (
                    <ListMobileCard key={row.depotId}>
                      <ListMobileTitle>{row.name}</ListMobileTitle>
                      <ListMobileMeta>Total {row.totalCount} payments</ListMobileMeta>
                      <ListMobileChipRow>
                        <Chip size="small" label={`Verified ${row.paidCount}`} color="success" sx={{ fontWeight: 600 }} />
                        <Chip size="small" label={`Pending ${row.pendingCount}`} color="warning" sx={{ fontWeight: 600 }} />
                        <Chip size="small" label={`Rejected ${row.rejectedCount}`} color="error" sx={{ fontWeight: 600 }} />
                        <Chip size="small" label={formatPeso(row.paidAmount)} sx={{ fontWeight: 700 }} />
                      </ListMobileChipRow>
                    </ListMobileCard>
                  ))}
                  <ListMobileCard>
                    <ListMobileTitle>Total</ListMobileTitle>
                    <ListMobileChipRow>
                      <Chip size="small" label={`Count ${depotOverview.totalCount}`} sx={{ fontWeight: 700 }} />
                      <Chip size="small" label={formatPeso(depotOverview.paidAmount)} sx={{ fontWeight: 700 }} />
                    </ListMobileChipRow>
                  </ListMobileCard>
                </ListMobileOnly>
                <ListDesktopOnly>
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: hexToRgba(primaryDark, 0.04) }}>
                      <TableCell sx={{ fontWeight: 700 }}>Container yard</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Total
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Verified
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Pending
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Rejected
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Verified amount
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {depotOverview.rows.map((row) => (
                      <TableRow key={row.depotId} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                        <TableCell align="right">{row.totalCount}</TableCell>
                        <TableCell align="right" sx={{ color: '#2E7D32', fontWeight: 600 }}>
                          {row.paidCount}
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#ED6C02', fontWeight: 600 }}>
                          {row.pendingCount}
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#D32F2F', fontWeight: 600 }}>
                          {row.rejectedCount}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: primaryDark }}>
                          {formatPeso(row.paidAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: hexToRgba(primaryDark, 0.03) }}>
                      <TableCell sx={{ fontWeight: 800 }}>Total</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {depotOverview.totalCount}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#2E7D32' }}>
                        {depotOverview.paidCount}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#ED6C02' }}>
                        {depotOverview.pendingCount}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#D32F2F' }}>
                        {depotOverview.rejectedCount}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: primaryDark }}>
                        {formatPeso(depotOverview.paidAmount)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
                </ListDesktopOnly>
              </>
            ) : (
              <Box sx={{ py: 8, px: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">No payment activity by container yard in this date range.</Typography>
              </Box>
            )}
          </Paper>
        </>
      )}
    </Box>
  )
}
