import { ListLoadingState } from '../../components/layout/ListPagePrimitives'
import { Alert, Box, Button, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
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
  listTablePaperSx,
} from '../../components/layout/ListPagePrimitives'
import { hexToRgba } from '../../components/layout/DetailPagePrimitives'
import { type Schedule } from '../../services/api'
import { fetchCachedScheduleList } from '../../utils/truckerListCache'
import { isTruckerOrBroker } from '../../config/roleConfig'
import { useAppSelector } from '../../store/hooks'
import { formatScheduleDate, formatScheduleSlot, formatScheduleTime } from '../../utils/datetime'
import {
  formatTruckerScheduleSlot,
  isScheduleDetailsVisible,
  truckerScheduleStatusLabel,
} from '../../utils/truckerSchedule'

const primaryDark = LIST_PRIMARY

const scheduleStatusColor: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  WaitingSchedule: 'warning',
  Scheduled: 'info',
  Confirmed: 'success',
  Completed: 'success',
  NoShow: 'error',
}

const paymentStatusColor: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  Pending: 'default',
  ForVerification: 'warning',
  Paid: 'success',
  Rejected: 'error',
}

const statusLabel: Record<string, string> = {
  WaitingSchedule: 'Awaiting CY confirmation',
  Scheduled: 'For payment',
  ForVerification: 'For verification',
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

export default function TruckerReturnsPage() {
  const navigate = useNavigate()
  const userRole = useAppSelector((s) => s.auth.user?.role)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    if (!isTruckerOrBroker(userRole)) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetchCachedScheduleList()
      .then((data) => setSchedules(data))
      .catch(() => setError('Failed to load your returns.'))
      .finally(() => setLoading(false))
  }, [userRole])

  useEffect(() => {
    load()
  }, [load])

  const paymentStatusFor = (schedule: Schedule) =>
    schedule.paymentStatus ?? (schedule.status === 'Confirmed' || schedule.status === 'Completed' ? 'Paid' : 'Pending')

  const summary = useMemo(() => {
    const scheduled = schedules.filter((s) => s.status === 'Scheduled').length
    const confirmed = schedules.filter((s) => s.status === 'Confirmed' || s.status === 'Completed').length
    const paymentPending = schedules.filter((s) => {
      const status = paymentStatusFor(s)
      return status === 'Pending' || status === 'Rejected'
    }).length
    return { total: schedules.length, scheduled, confirmed, paymentPending }
  }, [schedules])

  const emptyMessage = 'No assigned returns yet. Depot will assign you to a schedule.'

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
              <LocalShippingOutlinedIcon />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                My Returns
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5, maxWidth: 520 }}>
                Assigned container return schedules. Upload payment proof under Payments when scheduled.
              </Typography>
            </Box>
          </Box>
          <Button
            component={RouterLink}
            to="/trucker/payments"
            variant="contained"
            startIcon={<PaymentsOutlinedIcon />}
            sx={listHeroActionSx}
          >
            Payments
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
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
        <SummaryCard label="Total returns" value={summary.total} color={primaryDark} />
        <SummaryCard label="Scheduled" value={summary.scheduled} color="#0288D1" />
        <SummaryCard label="Confirmed" value={summary.confirmed} color="#2E7D32" />
        <SummaryCard label="Payment due" value={summary.paymentPending} color="#ED6C02" />
      </Box>

      <Paper elevation={0} sx={listTablePaperSx}>
        {loading ? (
          <ListLoadingState />
        ) : schedules.length === 0 ? (
          <Typography sx={{ py: 8, textAlign: 'center', color: 'text.secondary', px: 2 }}>
            {emptyMessage}
          </Typography>
        ) : (
          <>
            <ListMobileOnly>
              {schedules.map((item) => {
                const paymentStatus = paymentStatusFor(item)
                return (
                  <ListMobileCard key={item.id} onClick={() => navigate(`/trucker/returns/${item.id}`)}>
                    <ListMobileTitle>{item.referenceNo}</ListMobileTitle>
                    <ListMobileMeta>{isScheduleDetailsVisible(item) ? item.depotName : '—'}</ListMobileMeta>
                    <ListMobileMeta>
                      {isScheduleDetailsVisible(item)
                        ? item.date
                          ? `${formatScheduleDate(item.date)} · ${formatScheduleTime(item.time)}${item.slotNo ? ` · Slot ${item.slotNo}` : ''}`
                          : 'Return date not set'
                        : formatTruckerScheduleSlot(item, formatScheduleSlot)}
                    </ListMobileMeta>
                    <ListMobileChipRow>
                      <Chip
                        label={truckerScheduleStatusLabel(item)}
                        color={scheduleStatusColor[item.status] ?? 'default'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                      <Chip
                        label={statusLabel[paymentStatus] ?? paymentStatus}
                        color={paymentStatusColor[paymentStatus] ?? 'default'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </ListMobileChipRow>
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
                      <TableCell>Time</TableCell>
                      <TableCell>Slot</TableCell>
                      <TableCell>Schedule</TableCell>
                      <TableCell>Payment</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {schedules.map((item) => {
                      const paymentStatus = paymentStatusFor(item)
                      return (
                        <TableRow
                          key={item.id}
                          hover
                          sx={{ '&:last-child td': { borderBottom: 0 }, cursor: 'pointer' }}
                          onClick={() => navigate(`/trucker/returns/${item.id}`)}
                        >
                          <TableCell sx={{ fontWeight: 700, color: primaryDark }}>{item.referenceNo}</TableCell>
                          <TableCell>{isScheduleDetailsVisible(item) ? item.depotName : '—'}</TableCell>
                          <TableCell>
                            {isScheduleDetailsVisible(item) && item.date
                              ? formatScheduleDate(item.date)
                              : formatTruckerScheduleSlot(item, formatScheduleSlot)}
                          </TableCell>
                          <TableCell>
                            {isScheduleDetailsVisible(item) ? formatScheduleTime(item.time) : '—'}
                          </TableCell>
                          <TableCell>
                            {isScheduleDetailsVisible(item) && item.slotNo ? (
                              <Chip label={`Slot ${item.slotNo}`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={statusLabel[item.status] ?? item.status}
                              color={scheduleStatusColor[item.status] ?? 'default'}
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={statusLabel[paymentStatus] ?? paymentStatus}
                              color={paymentStatusColor[paymentStatus] ?? 'default'}
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
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

