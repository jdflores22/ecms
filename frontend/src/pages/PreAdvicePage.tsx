import { ListLoadingState } from '../components/layout/ListPagePrimitives'
import { Alert, Box, Button, Chip, FormControl, IconButton, InputLabel, MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import FilterListIcon from '@mui/icons-material/FilterList'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { hexToRgba } from '../components/layout/DetailPagePrimitives'
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
} from '../components/layout/ListPagePrimitives'
import { isPreAdviceManager } from '../config/roleConfig'
import { LOGICTECK_QR, qrLogicteckStatusFromPreAdvice, qrLookupStatusColor } from '../config/logicteckQr'
import { preAdviceApi, type PreAdvice, type PreAdviceLookups } from '../services/api'
import { useAppSelector } from '../store/hooks'
import { formatDateTime, parsePhEndOfDay, parsePhStartOfDay } from '../utils/datetime'
import { PreAdviceStatusChip } from '../components/preAdvice/PreAdviceStatusChip'

const primaryDark = LIST_PRIMARY
const primaryLight = '#00A3E0'

const STATUS_OPTIONS = [
  'All',
  'Draft',
  'Submitted',
  'UnderEvaluation',
  'Approved',
  'Rejected',
  'ForCompliance',
  'Cancelled',
] as const

const filterStatusLabel: Record<string, string> = {
  UnderEvaluation: 'Under evaluation',
  ForCompliance: 'For compliance',
}

function startOfDay(date: string) {
  return parsePhStartOfDay(date)
}

function endOfDay(date: string) {
  return parsePhEndOfDay(date)
}

export default function PreAdvicePage() {
  const user = useAppSelector((s) => s.auth.user)
  const [items, setItems] = useState<PreAdvice[]>([])
  const [lookups, setLookups] = useState<PreAdviceLookups | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [shippingLineFilter, setShippingLineFilter] = useState<number | 'All'>('All')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const load = () => {
    setLoading(true)
    setLoadError('')
    const lookupsPromise = isPreAdviceManager(user?.role)
      ? preAdviceApi.lookups()
      : Promise.resolve({ data: null as PreAdviceLookups | null })

    Promise.all([preAdviceApi.list(), lookupsPromise])
      .then(([listRes, lookupsRes]) => {
        setItems(listRes.data)
        setLookups(lookupsRes.data)
      })
      .catch(() => setLoadError('Failed to load pre-forecast. Log out and sign in again if this continues.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [user?.role])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== 'All' && item.status !== statusFilter) return false
      if (shippingLineFilter !== 'All' && item.shippingLineId !== shippingLineFilter) return false
      const created = new Date(item.createdAt)
      if (dateFrom && created < startOfDay(dateFrom)) return false
      if (dateTo && created > endOfDay(dateTo)) return false
      return true
    })
  }, [items, statusFilter, shippingLineFilter, dateFrom, dateTo])

  const summary = useMemo(() => {
    const forCompliance = items.filter((i) => i.status === 'ForCompliance').length
    const pending = items.filter((i) =>
      ['Submitted', 'UnderEvaluation', 'ForCompliance'].includes(i.status),
    ).length
    const approved = items.filter((i) => i.status === 'Approved').length
    const draft = items.filter((i) => i.status === 'Draft').length
    return { total: items.length, pending, approved, draft, forCompliance }
  }, [items])

  const hasFilters =
    statusFilter !== 'All' || shippingLineFilter !== 'All' || dateFrom !== '' || dateTo !== ''

  const clearFilters = () => {
    setStatusFilter('All')
    setShippingLineFilter('All')
    setDateFrom('')
    setDateTo('')
  }

  const summaryCards = [
    { label: 'Total requests', value: summary.total, color: primaryDark },
    { label: 'Draft', value: summary.draft, color: '#64748B' },
    { label: 'Pending review', value: summary.pending, color: '#ED6C02' },
    { label: 'Approved', value: summary.approved, color: '#2E7D32' },
  ]

  return (
    <Box sx={listPageRootSx}>
      {loadError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {loadError}
        </Alert>
      )}
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
              <DescriptionOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                Pre-forecast requests
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5, maxWidth: 520 }}>
                Create and manage empty container return requests.
              </Typography>
            </Box>
          </Box>
          <Button
            component={RouterLink}
            to="/preforecast/new"
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              ...listHeroActionSx,
              px: 2.5,
            }}
          >
            New pre-forecast
          </Button>
        </Box>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        {summaryCards.map((card) => (
          <Paper
            key={card.label}
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
              {card.label}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: card.color, mt: 0.5 }}>
              {card.value}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 2,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: '#fff',
          boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              bgcolor: hexToRgba(primaryDark, 0.08),
              color: primaryDark,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <FilterListIcon fontSize="small" />
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Filters
          </Typography>
          {hasFilters && (
            <Chip
              label={`Showing ${filteredItems.length} of ${items.length}`}
              size="small"
              sx={{ bgcolor: hexToRgba(primaryLight, 0.12), color: primaryDark, fontWeight: 600 }}
            />
          )}
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr) auto' },
            gap: 2,
            alignItems: 'end',
          }}
        >
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              {STATUS_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>
                  {s === 'All' ? 'All statuses' : filterStatusLabel[s] ?? s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Shipping line</InputLabel>
            <Select
              label="Shipping line"
              value={shippingLineFilter}
              onChange={(e) =>
                setShippingLineFilter(e.target.value === 'All' ? 'All' : Number(e.target.value))
              }
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="All">All shipping lines</MenuItem>
              {(lookups?.shippingLines ?? []).map((line) => (
                <MenuItem key={line.id} value={line.id}>
                  {line.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            size="small"
            label="From date"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <TextField
            fullWidth
            size="small"
            label="To date"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <Button
            variant="outlined"
            onClick={clearFilters}
            disabled={!hasFilters}
            sx={{ borderRadius: 2, fontWeight: 600, minHeight: 40 }}
          >
            Clear
          </Button>
        </Box>
      </Paper>

      <Paper elevation={0} sx={listTablePaperSx}>
        {loading ? (
          <ListLoadingState />
        ) : filteredItems.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center', px: 2 }}>
            <Typography color="text.secondary" sx={{ mb: 1 }}>
              {items.length === 0
                ? 'No pre-forecast requests yet.'
                : 'No requests match the selected filters.'}
            </Typography>
            {items.length === 0 && (
              <Button
                component={RouterLink}
                to="/preforecast/new"
                variant="contained"
                startIcon={<AddIcon />}
                sx={{ mt: 1, width: { xs: '100%', sm: 'auto' }, maxWidth: 320 }}
              >
                Create your first request
              </Button>
            )}
          </Box>
        ) : (
          <>
            <ListMobileOnly>
              {filteredItems.map((item) => (
                <ListMobileCard key={item.id}>
                  <ListMobileTitle>{item.referenceNo}</ListMobileTitle>
                  <ListMobileMeta>{item.shippingLineName}</ListMobileMeta>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5, fontFamily: 'monospace', fontWeight: 600, wordBreak: 'break-all' }}
                  >
                    {item.containerNo}
                  </Typography>
                  <ListMobileMeta>{formatDateTime(item.createdAt)}</ListMobileMeta>
                  <ListMobileChipRow>
                    <PreAdviceStatusChip status={item.status} scheduleStatus={item.scheduleStatus} />
                    {item.hasQrBooking && (
                      <>
                        <Chip
                          label={item.qrCode ?? 'QR ready'}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600, fontFamily: 'monospace' }}
                        />
                        {qrLogicteckStatusFromPreAdvice(item) && (
                          <Chip
                            label={qrLogicteckStatusFromPreAdvice(item)!}
                            size="small"
                            color={qrLookupStatusColor(qrLogicteckStatusFromPreAdvice(item)!)}
                            sx={{ fontWeight: 600 }}
                          />
                        )}
                      </>
                    )}
                  </ListMobileChipRow>
                  <Box sx={listMobileActionsSx}>
                    {item.hasQrBooking && (
                      <Button
                        component={RouterLink}
                        to={`/preforecast/${item.id}?tab=qr`}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600, borderRadius: 2 }}
                      >
                        {LOGICTECK_QR.viewQr}
                      </Button>
                    )}
                    <Button
                      component={RouterLink}
                      to={`/preforecast/${item.id}?tab=overview`}
                      size="small"
                      variant="contained"
                      startIcon={<OpenInNewIcon />}
                      sx={{ fontWeight: 600, borderRadius: 2 }}
                    >
                      View details
                    </Button>
                  </Box>
                </ListMobileCard>
              ))}
            </ListMobileOnly>

            <ListDesktopOnly>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow
                      sx={{
                        bgcolor: hexToRgba(primaryDark, 0.04),
                        '& .MuiTableCell-head': {
                          fontWeight: 700,
                          color: 'text.secondary',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          py: 1.75,
                        },
                      }}
                    >
                      <TableCell>Reference</TableCell>
                      <TableCell>Shipping line</TableCell>
                      <TableCell>Container</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>ICS QR</TableCell>
                      <TableCell>LOGICTECK status</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow
                        key={item.id}
                        hover
                        sx={{
                          '&:last-child td': { borderBottom: 0 },
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <TableCell>
                          <Typography
                            component={RouterLink}
                            to={`/preforecast/${item.id}?tab=overview`}
                            sx={{
                              fontWeight: 700,
                              color: primaryDark,
                              textDecoration: 'none',
                              '&:hover': { color: primaryLight },
                            }}
                          >
                            {item.referenceNo}
                          </Typography>
                        </TableCell>
                        <TableCell>{item.shippingLineName}</TableCell>
                        <TableCell>
                          <Typography
                            component="span"
                            sx={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 600 }}
                          >
                            {item.containerNo}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <PreAdviceStatusChip status={item.status} scheduleStatus={item.scheduleStatus} />
                        </TableCell>
                        <TableCell>
                          {item.hasQrBooking ? (
                            <Typography
                              component={RouterLink}
                              to={`/preforecast/${item.id}?tab=qr`}
                              variant="body2"
                              sx={{
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                color: primaryDark,
                                textDecoration: 'none',
                                '&:hover': { color: primaryLight },
                              }}
                            >
                              {item.qrCode}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {qrLogicteckStatusFromPreAdvice(item) ? (
                            <Chip
                              label={qrLogicteckStatusFromPreAdvice(item)!}
                              size="small"
                              color={qrLookupStatusColor(qrLogicteckStatusFromPreAdvice(item)!)}
                              sx={{ fontWeight: 600 }}
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDateTime(item.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="View details">
                            <IconButton
                              component={RouterLink}
                              to={`/preforecast/${item.id}?tab=overview`}
                              size="small"
                              sx={{
                                color: primaryDark,
                                bgcolor: hexToRgba(primaryDark, 0.06),
                                '&:hover': { bgcolor: hexToRgba(primaryLight, 0.15) },
                              }}
                            >
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
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
