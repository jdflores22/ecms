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
import { formatPeso, formatScheduleDate, formatScheduleSlot } from '../../utils/datetime'
import {
  needsPaymentUpload,
  paymentStatusColor,
  paymentStatusLabel,
  resolvePaymentStatus,
  truckerPaymentPath,
} from '../../utils/truckerPayment'

const primaryDark = LIST_PRIMARY

const STATUS_TABS = [
  { key: 'Pending', label: 'Payment due', summaryColor: '#ED6C02' },
  { key: 'ForVerification', label: 'Under review', summaryColor: '#0288D1' },
  { key: 'Paid', label: 'Paid', summaryColor: '#2E7D32' },
  { key: 'Rejected', label: 'Rejected', summaryColor: '#D32F2F' },
] as const

type PaymentStatusTab = (typeof STATUS_TABS)[number]['key']

const tabEmptyMessage: Record<PaymentStatusTab, string> = {
  Pending: 'No scheduled returns awaiting payment upload.',
  ForVerification: 'No payment proofs are under depot review.',
  Paid: 'No verified payments yet.',
  Rejected: 'No rejected payments — re-upload proof from the Payment due tab when applicable.',
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

function PaymentRowActions({ item, uploadNeeded }: { item: Schedule; uploadNeeded: boolean }) {
  const navigate = useNavigate()
  return uploadNeeded ? (
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
  )
}

export default function TruckerPaymentsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const userRole = useAppSelector((s) => s.auth.user?.role)
  const [activeStatus, setActiveStatus] = useState<PaymentStatusTab>('Pending')
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [returnFeeAmount, setReturnFeeAmount] = useState<number | null>(null)
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
    Promise.all([scheduleApi.list(), paymentApi.mine(), paymentApi.getSettings()])
      .then(([s, p, settings]) => {
        setSchedules(s.data.filter((x) => x.status === 'Scheduled' || x.status === 'Confirmed'))
        setPayments(p.data)
        setReturnFeeAmount(settings.data.returnFeeAmount)
      })
      .catch(() => setError('Failed to load payments.'))
      .finally(() => setLoading(false))
  }, [userRole])

  useEffect(() => {
    load()
  }, [load])

  const paymentFor = useCallback(
    (scheduleId: number) => payments.find((p) => p.scheduleId === scheduleId) ?? null,
    [payments],
  )

  const statusFor = useCallback(
    (schedule: Schedule) => resolvePaymentStatus(schedule, paymentFor(schedule.id)),
    [paymentFor],
  )

  const countByStatus = useMemo(() => {
    const counts = Object.fromEntries(STATUS_TABS.map((t) => [t.key, 0])) as Record<PaymentStatusTab, number>
    for (const schedule of schedules) {
      const status = statusFor(schedule) as PaymentStatusTab
      if (status in counts) counts[status]++
    }
    return counts
  }, [schedules, statusFor])

  const filtered = useMemo(() => {
    return schedules
      .filter((schedule) => statusFor(schedule) === activeStatus)
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  }, [schedules, activeStatus, statusFor])

  const activeTabMeta = STATUS_TABS.find((t) => t.key === activeStatus)!

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
                Upload proof of payment for scheduled returns. Depot will verify before the booking QR is published for
                LOGICTECK integration.
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
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(4, 1fr)',
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
          onChange={(_, value: PaymentStatusTab) => setActiveStatus(value)}
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

      <Paper elevation={0} sx={listTablePaperSx}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress sx={{ color: primaryDark }} />
          </Box>
        ) : schedules.length === 0 ? (
          <Typography sx={{ py: 8, textAlign: 'center', color: 'text.secondary', px: 2 }}>
            No scheduled returns requiring payment.
          </Typography>
        ) : filtered.length === 0 ? (
          <Typography sx={{ py: 8, textAlign: 'center', color: 'text.secondary', px: 2 }}>
            {tabEmptyMessage[activeStatus]}
          </Typography>
        ) : (
          <>
            <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: 2, pb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                Showing {filtered.length} {activeTabMeta.label.toLowerCase()} return
                {filtered.length === 1 ? '' : 's'}
              </Typography>
            </Box>

            <ListMobileOnly>
              {filtered.map((item) => {
                const payment = paymentFor(item.id)
                const status = statusFor(item)
                const uploadNeeded = needsPaymentUpload(item, payment)
                return (
                  <ListMobileCard key={item.id} onClick={() => navigate(truckerPaymentPath(item.id))}>
                    <ListMobileTitle>{item.referenceNo}</ListMobileTitle>
                    <ListMobileMeta>{item.depotName}</ListMobileMeta>
                    <ListMobileMeta>
                      {item.date && item.time
                        ? formatScheduleSlot(item.date, item.time)
                        : item.date
                          ? formatScheduleDate(item.date)
                          : '—'}
                    </ListMobileMeta>
                    <ListMobileMeta>
                      {payment ? formatPeso(payment.amount) : returnFeeAmount ? formatPeso(returnFeeAmount) : 'Amount pending'}
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
                      <PaymentRowActions item={item} uploadNeeded={uploadNeeded} />
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
                      <TableCell>Return slot</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((item) => {
                      const payment = paymentFor(item.id)
                      const uploadNeeded = needsPaymentUpload(item, payment)
                      return (
                        <TableRow
                          key={item.id}
                          hover
                          sx={{ '&:last-child td': { borderBottom: 0 }, cursor: 'pointer' }}
                          onClick={() => navigate(truckerPaymentPath(item.id))}
                        >
                          <TableCell sx={{ fontWeight: 700, color: primaryDark }}>{item.referenceNo}</TableCell>
                          <TableCell>{item.depotName}</TableCell>
                          <TableCell>
                            {item.date && item.time
                              ? formatScheduleSlot(item.date, item.time)
                              : item.date
                                ? formatScheduleDate(item.date)
                                : '—'}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            {payment ? formatPeso(payment.amount) : returnFeeAmount ? formatPeso(returnFeeAmount) : '—'}
                          </TableCell>
                          <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                            <PaymentRowActions item={item} uploadNeeded={uploadNeeded} />
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
