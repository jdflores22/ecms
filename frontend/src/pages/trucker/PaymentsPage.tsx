import {
  Alert,
  Box,
  Button,
  Chip,
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
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { hexToRgba } from '../../components/layout/DetailPagePrimitives'
import {
  ListDesktopOnly,
  ListMobileCard,
  ListMobileChipRow,
  ListMobileMeta,
  ListMobileOnly,
  ListMobileTitle,
  LIST_PRIMARY,
  listHeroActionSx,
  listMobileActionsSx,
  listPageRootSx,
  listTablePaperSx,
} from '../../components/layout/ListPagePrimitives'
import { paymentApi, scheduleApi, type Payment, type Schedule } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { LOGICTECK_QR } from '../../config/logicteckQr'
import { formatPeso, formatScheduleDate } from '../../utils/datetime'
import { needsPaymentUpload, paymentStatusLabel, truckerPaymentPath } from '../../utils/truckerPayment'

const primaryDark = LIST_PRIMARY

const paymentStatusColor: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  Pending: 'warning',
  ForVerification: 'info',
  Paid: 'success',
  Rejected: 'error',
}

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

export default function TruckerPaymentsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const userRole = useAppSelector((s) => s.auth.user?.role)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const message = (location.state as { message?: string } | null)?.message
    if (message) {
      setSuccessMessage(message)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  const load = useCallback(() => {
    if (userRole !== 'Trucker') {
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all([scheduleApi.list(), paymentApi.mine()])
      .then(([s, p]) => {
        setSchedules(s.data.filter((x) => x.status === 'Scheduled' || x.status === 'Confirmed'))
        setPayments(p.data)
      })
      .catch(() => setError('Failed to load payments.'))
      .finally(() => setLoading(false))
  }, [userRole])

  useEffect(() => {
    load()
  }, [load])

  const paymentFor = (scheduleId: number) => payments.find((p) => p.scheduleId === scheduleId)

  const paymentSortOrder = (status: string) => {
    switch (status) {
      case 'Pending':
        return 0
      case 'Rejected':
        return 1
      case 'ForVerification':
        return 2
      case 'Paid':
        return 3
      default:
        return 4
    }
  }

  const sortedSchedules = useMemo(() => {
    return [...schedules].sort((a, b) => {
      const statusA = paymentFor(a.id)?.status ?? 'Pending'
      const statusB = paymentFor(b.id)?.status ?? 'Pending'
      const order = paymentSortOrder(statusA) - paymentSortOrder(statusB)
      if (order !== 0) return order
      return (b.date ?? '').localeCompare(a.date ?? '')
    })
  }, [schedules, payments])

  const summary = useMemo(() => {
    let pending = 0
    let forVerification = 0
    let paid = 0
    for (const s of schedules) {
      const p = paymentFor(s.id)
      const status = p?.status ?? 'Pending'
      if (status === 'Pending' || status === 'Rejected') pending++
      else if (status === 'ForVerification') forVerification++
      else if (status === 'Paid') paid++
    }
    return { total: schedules.length, pending, forVerification, paid }
  }, [schedules, payments])

  const emptyMessage = 'No scheduled returns requiring payment.'

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
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 2,
            position: 'relative',
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', minWidth: 0 }}>
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
              <UploadFileIcon />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                Payments
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5, maxWidth: 520 }}>
                Upload proof of payment for scheduled returns. Depot will verify before the booking QR is published for LOGICTECK integration.
              </Typography>
            </Box>
          </Box>
          <Button
            component={RouterLink}
            to="/trucker/qr"
            variant="contained"
            startIcon={<QrCode2OutlinedIcon />}
            sx={listHeroActionSx}
          >
            {LOGICTECK_QR.menuLabel}
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
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
        <SummaryCard label="Scheduled returns" value={summary.total} color={primaryDark} />
        <SummaryCard label="Upload needed" value={summary.pending} color="#ED6C02" />
        <SummaryCard label="Under review" value={summary.forVerification} color="#0288D1" />
        <SummaryCard label="Paid" value={summary.paid} color="#2E7D32" />
      </Box>

      <Paper elevation={0} sx={listTablePaperSx}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress sx={{ color: primaryDark }} />
          </Box>
        ) : schedules.length === 0 ? (
          <Typography sx={{ py: 8, textAlign: 'center', color: 'text.secondary', px: 2 }}>
            {emptyMessage}
          </Typography>
        ) : (
          <>
            <ListMobileOnly>
              {sortedSchedules.map((item) => {
                const payment = paymentFor(item.id)
                const status = payment?.status ?? 'Pending'
                const uploadNeeded = needsPaymentUpload(item, payment ?? null)
                return (
                  <ListMobileCard key={item.id} onClick={() => navigate(truckerPaymentPath(item.id))}>
                    <ListMobileTitle>{item.referenceNo}</ListMobileTitle>
                    <ListMobileMeta>{item.depotName}</ListMobileMeta>
                    <ListMobileMeta>
                      {item.date ? formatScheduleDate(item.date) : '—'} ·{' '}
                      {payment ? formatPeso(payment.amount) : 'Amount pending'}
                    </ListMobileMeta>
                    <ListMobileChipRow>
                      <Chip
                        label={paymentStatusLabel[status] ?? status}
                        color={paymentStatusColor[status] ?? 'default'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </ListMobileChipRow>
                    <Box sx={listMobileActionsSx} onClick={(e) => e.stopPropagation()}>
                      {uploadNeeded ? (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<UploadFileIcon />}
                          onClick={() => navigate(truckerPaymentPath(item.id))}
                          sx={{ fontWeight: 600, borderRadius: 2 }}
                        >
                          Upload proof
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => navigate(truckerPaymentPath(item.id))}
                          sx={{ fontWeight: 600, borderRadius: 2 }}
                        >
                          View payment
                        </Button>
                      )}
                    </Box>
                  </ListMobileCard>
                )
              })}
            </ListMobileOnly>

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
                      <TableCell>Reference</TableCell>
                      <TableCell>Depot</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedSchedules.map((item) => {
                      const payment = paymentFor(item.id)
                      const status = payment?.status ?? 'Pending'
                      const uploadNeeded = needsPaymentUpload(item, payment ?? null)
                      return (
                        <TableRow
                          key={item.id}
                          hover
                          sx={{ '&:last-child td': { borderBottom: 0 }, cursor: 'pointer' }}
                          onClick={() => navigate(truckerPaymentPath(item.id))}
                        >
                          <TableCell sx={{ fontWeight: 700, color: primaryDark }}>{item.referenceNo}</TableCell>
                          <TableCell>{item.depotName}</TableCell>
                          <TableCell>{item.date ? formatScheduleDate(item.date) : '—'}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            {payment ? formatPeso(payment.amount) : '—'}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={paymentStatusLabel[status] ?? status}
                              color={paymentStatusColor[status] ?? 'default'}
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                            {uploadNeeded ? (
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<UploadFileIcon />}
                                onClick={() => navigate(truckerPaymentPath(item.id))}
                                sx={{ fontWeight: 600, borderRadius: 2 }}
                              >
                                Upload proof
                              </Button>
                            ) : (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => navigate(truckerPaymentPath(item.id))}
                                sx={{ fontWeight: 600, borderRadius: 2 }}
                              >
                                View
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </ListDesktopOnly>
          </>
        )}
      </Paper>
    </Box>
  )
}
