import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import FilterListIcon from '@mui/icons-material/FilterList'
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined'
import SearchIcon from '@mui/icons-material/Search'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { auditApi, type AuditLog, type AuditLogPage } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { formatDate, formatTime } from '../../utils/datetime'

const primaryDark = '#0B3D91'
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

const MODULES = ['', 'Auth', 'PreForecast', 'PreAdvice', 'Evaluation', 'Schedule', 'Payment', 'Profile', 'User', 'Container', 'Depot', 'ShippingLine', 'QR', 'DemurrageBilling']

const MODULE_LABELS: Record<string, string> = {
  PreForecast: 'Pre-forecast',
  PreAdvice: 'Pre-forecast',
}

const moduleColor: Record<string, 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'> = {
  Auth: 'primary',
  Evaluation: 'warning',
  PreForecast: 'info',
  PreAdvice: 'info',
  Schedule: 'secondary',
  Payment: 'success',
  Profile: 'default',
  User: 'secondary',
  Container: 'info',
  Depot: 'warning',
  ShippingLine: 'primary',
  QR: 'success',
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function SummaryCard({ label, value, color }: { label: string; value: number | string; color: string }) {
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

export default function AuditLogPage() {
  const currentUser = useAppSelector((s) => s.auth.user)
  const [data, setData] = useState<AuditLogPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [module, setModule] = useState('')
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [filterTick, setFilterTick] = useState(0)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    auditApi
      .list({
        module: module || undefined,
        action: action || undefined,
        from: from ? `${from}T00:00:00Z` : undefined,
        to: to ? `${to}T23:59:59Z` : undefined,
        page: page + 1,
        pageSize: rowsPerPage,
      })
      .then(({ data: res }) => setData(res))
      .catch(() => setError('Failed to load audit logs.'))
      .finally(() => setLoading(false))
  }, [module, action, from, to, page, rowsPerPage, filterTick])

  useEffect(() => {
    load()
  }, [load])

  const hasFilters = module !== '' || action !== '' || from !== '' || to !== ''

  const summary = useMemo(
    () => ({
      total: data?.total ?? 0,
      onPage: data?.items.length ?? 0,
      page: data ? data.page : page + 1,
      pageCount: data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1,
    }),
    [data, page],
  )

  if (currentUser?.role !== 'Administrator') {
    return <Navigate to="/" replace />
  }

  const handleSearch = () => {
    setPage(0)
    setFilterTick((t) => t + 1)
  }

  const clearFilters = () => {
    setModule('')
    setAction('')
    setFrom('')
    setTo('')
    setPage(0)
    setFilterTick((t) => t + 1)
  }

  return (
    <Box>
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
            <HistoryOutlinedIcon />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              Audit Log
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5, maxWidth: 520 }}>
              Review system actions across authentication, evaluations, payments, and more.
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
        <SummaryCard label="Total entries" value={summary.total} color={primaryDark} />
        <SummaryCard label="On this page" value={summary.onPage} color="#00A3E0" />
        <SummaryCard label="Current page" value={summary.page} color="#2E7D32" />
        <SummaryCard label="Total pages" value={summary.pageCount} color="#5C6BC0" />
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: '#fff',
          boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <FilterListIcon fontSize="small" sx={{ color: primaryDark }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Filters
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end' }}>
          <FormControl sx={{ minWidth: 160, ...fieldSx }}>
            <InputLabel>Module</InputLabel>
            <Select label="Module" value={module} onChange={(e) => setModule(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {MODULES.filter(Boolean).map((m) => (
                <MenuItem key={m} value={m}>
                  {MODULE_LABELS[m] ?? m}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Action contains"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            size="small"
            sx={{ minWidth: 180, ...fieldSx }}
          />
          <TextField
            label="From"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            size="small"
            sx={fieldSx}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="To"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            size="small"
            sx={fieldSx}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Apply filters
          </Button>
          {hasFilters && (
            <Button variant="outlined" onClick={clearFilters} sx={{ fontWeight: 600, borderRadius: 2 }}>
              Clear
            </Button>
          )}
        </Box>
      </Paper>

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
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress sx={{ color: primaryDark }} />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: hexToRgba(primaryDark, 0.04),
                    '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', py: 1.75 },
                  }}
                >
                  <TableCell>Timestamp</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Module</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!data?.items.length ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
                      No audit entries found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((row: AuditLog) => (
                    <TableRow key={row.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatDate(row.timestamp)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatTime(row.timestamp)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: primaryDark }}>{row.username}</TableCell>
                      <TableCell>
                        <Chip
                          label={MODULE_LABELS[row.module] ?? row.module}
                          size="small"
                          color={moduleColor[row.module] ?? 'default'}
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {row.action}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
                          {row.details ?? '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <TablePagination
          component="div"
          count={data?.total ?? 0}
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
      </Paper>
    </Box>
  )
}
