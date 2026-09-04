import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import SearchIcon from '@mui/icons-material/Search'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import {
  Alert,
  Box,
  Button,
  Chip,
  InputAdornment,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  ListDesktopOnly,
  ListLoadingState,
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
import {
  statementOfAccountApi,
  type ShippingLineCreditLine,
  type SoaTruckerRegister,
  type StatementOfAccount,
} from '../../services/api'
import { formatPeso } from '../../utils/datetime'

const primaryDark = LIST_PRIMARY
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'Draft', label: 'Draft' },
  { key: 'Issued', label: 'Issued' },
  { key: 'ForVerification', label: 'Under review' },
  { key: 'Paid', label: 'Paid' },
  { key: 'Cancelled', label: 'Cancelled' },
] as const

type StatusTab = (typeof STATUS_TABS)[number]['key']

function normalizeStatus(status: StatementOfAccount['status']) {
  if (typeof status === 'string') return status
  return ['Draft', 'Issued', 'ForVerification', 'Paid', 'Cancelled'][status] ?? 'Draft'
}

function statusColor(status: string) {
  switch (status) {
    case 'Issued':
      return 'warning'
    case 'ForVerification':
      return 'info'
    case 'Paid':
      return 'success'
    case 'Cancelled':
      return 'default'
    default:
      return 'default'
  }
}

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

export default function StatementOfAccountsPage() {
  const [items, setItems] = useState<StatementOfAccount[]>([])
  const [creditLine, setCreditLine] = useState<ShippingLineCreditLine | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [activeTab, setActiveTab] = useState<StatusTab>('all')
  const [search, setSearch] = useState('')

  const [truckerRegister, setTruckerRegister] = useState<SoaTruckerRegister[]>([])
  const [registerLoading, setRegisterLoading] = useState(false)

  const [creditLimitEdit, setCreditLimitEdit] = useState('')
  const [creditSaving, setCreditSaving] = useState(false)

  const loadRegister = useCallback(async () => {
    setRegisterLoading(true)
    try {
      const { data } = await statementOfAccountApi.eligibleTruckers()
      setTruckerRegister(data)
    } catch {
      setTruckerRegister([])
    } finally {
      setRegisterLoading(false)
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [soaRes, creditRes] = await Promise.all([
        statementOfAccountApi.list(),
        statementOfAccountApi.getCreditLine(),
      ])
      setItems(soaRes.data)
      setCreditLine(creditRes.data)
      setCreditLimitEdit(String(creditRes.data.creditLimit))
      await loadRegister()
    } catch {
      setError('Failed to load statements of account.')
    } finally {
      setLoading(false)
    }
  }, [loadRegister])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      const status = normalizeStatus(item.status)
      if (activeTab !== 'all' && status !== activeTab) return false
      if (!q) return true
      return (
        item.referenceNo.toLowerCase().includes(q)
        || item.truckerName.toLowerCase().includes(q)
        || (item.remarks ?? '').toLowerCase().includes(q)
      )
    })
  }, [items, activeTab, search])

  const saveCreditLine = async () => {
    const limit = Number(creditLimitEdit)
    if (limit <= 0) {
      setError('Credit limit must be greater than zero.')
      return
    }
    setCreditSaving(true)
    setError('')
    try {
      const { data } = await statementOfAccountApi.updateCreditLine({
        creditLimit: limit,
        isActive: true,
      })
      setCreditLine(data)
      setSuccessMessage('Credit line updated.')
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to update credit line.'))
    } finally {
      setCreditSaving(false)
    }
  }

  return (
    <Box sx={listPageRootSx}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', minWidth: 0 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: 'rgba(11, 61, 145, 0.08)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <DescriptionOutlinedIcon sx={{ color: primaryDark }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: primaryDark }}>
              Statement of accounts
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 720 }}>
              View trucker accounts with outstanding billings and release SOA from their details page.
            </Typography>
          </Box>
        </Box>
      </Box>

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

      {creditLine && (
        <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', mb: 2 }}>
            <AccountBalanceWalletOutlinedIcon sx={{ color: primaryDark, mt: 0.25 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Credit line · {creditLine.shippingLineName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Available {formatPeso(creditLine.availableCredit)} of {formatPeso(creditLine.creditLimit)} limit
                {' · '}Utilized {formatPeso(creditLine.utilizedAmount)}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr auto' }, gap: 2, alignItems: 'end' }}>
            <TextField
              label="Credit limit (PHP)"
              type="number"
              value={creditLimitEdit}
              onChange={(e) => setCreditLimitEdit(e.target.value)}
              sx={fieldSx}
              slotProps={{ htmlInput: { min: 1 } }}
            />
            <Button variant="outlined" onClick={() => void saveCreditLine()} disabled={creditSaving} sx={{ fontWeight: 700, borderRadius: 2 }}>
              {creditSaving ? 'Saving…' : 'Update limit'}
            </Button>
          </Box>
        </Paper>
      )}

      <Paper elevation={0} sx={{ ...listTablePaperSx, mb: 3 }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <LocalShippingOutlinedIcon sx={{ color: primaryDark }} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Trucker register — ready for SOA release
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Truckers with outstanding demurrage billings not yet on an active SOA
              </Typography>
            </Box>
          </Box>
          <Chip
            size="small"
            label={`${truckerRegister.length} account${truckerRegister.length === 1 ? '' : 's'}`}
            sx={{ fontWeight: 700 }}
          />
        </Box>
        {registerLoading ? (
          <ListLoadingState />
        ) : truckerRegister.length === 0 ? (
          <Typography sx={{ py: 4, px: 2, textAlign: 'center', color: 'text.secondary' }}>
            No trucker accounts with billings pending SOA release.
          </Typography>
        ) : (
          <>
            <ListDesktopOnly>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Trucker account</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Billings</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Total charges</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Charge period</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {truckerRegister.map((row) => (
                      <TableRow key={row.truckerId} hover>
                        <TableCell>{row.truckerName}</TableCell>
                        <TableCell align="right">{row.billingCount}</TableCell>
                        <TableCell align="right">{formatPeso(row.totalAmount)}</TableCell>
                        <TableCell>
                          {row.oldestExpiredOn}
                          {row.oldestExpiredOn !== row.latestExpiredOn ? ` → ${row.latestExpiredOn}` : ''}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            component={RouterLink}
                            to={`/evaluations/statement-of-accounts/trucker/${row.truckerId}`}
                            startIcon={<VisibilityOutlinedIcon />}
                            sx={{ fontWeight: 700, borderRadius: 2 }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </ListDesktopOnly>

            <ListMobileOnly>
              {truckerRegister.map((row) => (
                <ListMobileCard key={row.truckerId}>
                  <ListMobileTitle>{row.truckerName}</ListMobileTitle>
                  <ListMobileMeta>
                    {row.billingCount} billing{row.billingCount === 1 ? '' : 's'} · {formatPeso(row.totalAmount)}
                  </ListMobileMeta>
                  <ListMobileChipRow>
                    <Chip size="small" label={`${row.oldestExpiredOn} → ${row.latestExpiredOn}`} />
                  </ListMobileChipRow>
                  <Box sx={listMobileActionsSx}>
                    <Button
                      size="small"
                      variant="outlined"
                      component={RouterLink}
                      to={`/evaluations/statement-of-accounts/trucker/${row.truckerId}`}
                      startIcon={<VisibilityOutlinedIcon />}
                    >
                      View
                    </Button>
                  </Box>
                </ListMobileCard>
              ))}
            </ListMobileOnly>
          </>
        )}
      </Paper>

      <Paper elevation={0} sx={{ mb: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 1, '& .MuiTab-root': { fontWeight: 600, textTransform: 'none' } }}
        >
          {STATUS_TABS.map((tab) => (
            <Tab key={tab.key} label={tab.label} value={tab.key} />
          ))}
        </Tabs>
      </Paper>

      <TextField
        fullWidth
        size="small"
        placeholder="Search SOA ref, trucker…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2, ...fieldSx }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      <Paper elevation={0} sx={listTablePaperSx}>
        {loading ? (
          <ListLoadingState />
        ) : filtered.length === 0 ? (
          <Typography sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
            No statements of account in this view.
          </Typography>
        ) : (
          <>
            <ListDesktopOnly>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>SOA ref</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Trucker</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Due</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Due date</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((item) => {
                      const status = normalizeStatus(item.status)
                      return (
                        <TableRow key={item.id} hover>
                          <TableCell>{item.referenceNo}</TableCell>
                          <TableCell>{item.truckerName}</TableCell>
                          <TableCell align="right">{formatPeso(item.totalAmount)}</TableCell>
                          <TableCell align="right">{formatPeso(item.amountDue)}</TableCell>
                          <TableCell>
                            <Chip size="small" label={status} color={statusColor(status)} />
                          </TableCell>
                          <TableCell>{item.dueDate ?? '—'}</TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              component={RouterLink}
                              to={`/evaluations/statement-of-accounts/${item.id}`}
                              endIcon={<OpenInNewIcon />}
                            >
                              Open
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </ListDesktopOnly>

            <ListMobileOnly>
              {filtered.map((item) => {
                const status = normalizeStatus(item.status)
                return (
                  <ListMobileCard key={item.id}>
                    <ListMobileTitle>{item.referenceNo}</ListMobileTitle>
                    <ListMobileMeta>{item.truckerName}</ListMobileMeta>
                    <ListMobileChipRow>
                      <Chip size="small" label={formatPeso(item.totalAmount)} />
                      <Chip size="small" label={`Due ${formatPeso(item.amountDue)}`} />
                      <Chip size="small" label={status} color={statusColor(status)} />
                    </ListMobileChipRow>
                    <Box sx={listMobileActionsSx}>
                      <Button
                        size="small"
                        variant="outlined"
                        component={RouterLink}
                        to={`/evaluations/statement-of-accounts/${item.id}`}
                      >
                        Open
                      </Button>
                    </Box>
                  </ListMobileCard>
                )
              })}
            </ListMobileOnly>
          </>
        )}
      </Paper>
    </Box>
  )
}
