import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import SearchIcon from '@mui/icons-material/Search'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { demurrageBillingDetailPath } from '../demurrage/DemurrageBillingDetailPage'
import DemurrageFeeLineEditor from '../../components/demurrage/DemurrageFeeLineEditor'
import {
  BillingContextCard,
  DemurrageFeeBreakdown,
  DemurrageHero,
  DialogTotalBar,
  SummaryCard,
  demurrageTabsPaperSx,
} from '../../components/demurrage/DemurrageBillingPrimitives'
import {
  DEFAULT_FEE_ROWS,
  billingToFeeRows,
  feeRowsToPayload,
  feeRowsTotal,
  isExpiredValidUntil,
  summarizeBillings,
  validateFeeRows,
  type FeeRow,
} from '../../components/demurrage/demurrageBillingUtils'
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
import {
  demurrageBillingApi,
  type DemurrageBilling,
  type EligibleDemurragePreAdvice,
} from '../../services/api'
import { formatDate } from '../../utils/datetime'
import { paymentStatusColor, paymentStatusLabel } from '../../utils/truckerPayment'

const STATUS_TABS = [
  { key: 'all', label: 'All', summaryColor: LIST_PRIMARY },
  { key: 'Pending', label: 'Outstanding', summaryColor: '#ED6C02' },
  { key: 'ForVerification', label: 'Under review', summaryColor: '#0288D1' },
  { key: 'Paid', label: 'Settled', summaryColor: '#2E7D32' },
  { key: 'Rejected', label: 'Rejected', summaryColor: '#D32F2F' },
] as const

type StatusTab = (typeof STATUS_TABS)[number]['key']

const tabEmptyMessage: Record<StatusTab, string> = {
  all: 'No demurrage billing records yet. Expired pre-forecast is billed automatically, or use Create billing.',
  Pending: 'No outstanding demurrage charges in this tab.',
  ForVerification: 'No payments are awaiting admin verification.',
  Paid: 'No settled demurrage billings yet.',
  Rejected: 'No rejected payments. Edit fees on outstanding billings if amounts need updating.',
}

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

export default function DemurrageBillingPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<DemurrageBilling[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [activeTab, setActiveTab] = useState<StatusTab>('Pending')
  const [search, setSearch] = useState('')

  const [feeDialogOpen, setFeeDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedBilling, setSelectedBilling] = useState<DemurrageBilling | null>(null)
  const [feeRows, setFeeRows] = useState<FeeRow[]>([])
  const [feeError, setFeeError] = useState('')
  const [feeSaving, setFeeSaving] = useState(false)

  const [eligible, setEligible] = useState<EligibleDemurragePreAdvice[]>([])
  const [eligibleLoading, setEligibleLoading] = useState(false)
  const [selectedPreAdviceId, setSelectedPreAdviceId] = useState<number | ''>('')
  const [createFeeRows, setCreateFeeRows] = useState<FeeRow[]>(DEFAULT_FEE_ROWS)
  const [createError, setCreateError] = useState('')
  const [createSaving, setCreateSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    demurrageBillingApi
      .list()
      .then(({ data }) => setItems(data))
      .catch(() => setError('Failed to load demurrage billing.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const summary = useMemo(() => summarizeBillings(items), [items])

  const countByStatus = useMemo(() => {
    const counts = Object.fromEntries(STATUS_TABS.map((t) => [t.key, 0])) as Record<StatusTab, number>
    counts.all = items.length
    for (const item of items) {
      if (item.status in counts) counts[item.status as StatusTab]++
    }
    return counts
  }, [items])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = activeTab === 'all' ? items : items.filter((item) => item.status === activeTab)
    if (q) {
      list = list.filter(
        (item) =>
          item.referenceNo.toLowerCase().includes(q) ||
          item.containerNo.toLowerCase().includes(q) ||
          item.truckerName.toLowerCase().includes(q) ||
          item.preAdviceReferenceNo.toLowerCase().includes(q),
      )
    }
    return list
  }, [items, activeTab, search])

  const selectedEligible = useMemo(
    () => eligible.find((row) => row.preAdviceId === selectedPreAdviceId),
    [eligible, selectedPreAdviceId],
  )

  const canEditFees = (item: DemurrageBilling) => item.status === 'Pending' || item.status === 'Rejected'

  const openFeeEditor = (item: DemurrageBilling) => {
    setSelectedBilling(item)
    setFeeRows(billingToFeeRows(item))
    setFeeError('')
    setFeeDialogOpen(true)
  }

  const saveFees = async () => {
    if (!selectedBilling) return
    const validationError = validateFeeRows(feeRows)
    if (validationError) {
      setFeeError(validationError)
      return
    }

    setFeeSaving(true)
    setFeeError('')
    try {
      await demurrageBillingApi.updateFees(selectedBilling.id, feeRowsToPayload(feeRows))
      setFeeDialogOpen(false)
      setSuccessMessage(`Fees updated for ${selectedBilling.referenceNo}.`)
      load()
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to save fee lines.'
      setFeeError(message)
    } finally {
      setFeeSaving(false)
    }
  }

  const openCreateDialog = async () => {
    setCreateDialogOpen(true)
    setCreateError('')
    setSelectedPreAdviceId('')
    setCreateFeeRows(DEFAULT_FEE_ROWS.map((row) => ({ ...row })))
    setEligibleLoading(true)
    try {
      const { data } = await demurrageBillingApi.eligiblePreAdvices()
      setEligible(data)
    } catch {
      setCreateError('Failed to load eligible pre-forecast.')
      setEligible([])
    } finally {
      setEligibleLoading(false)
    }
  }

  const createBilling = async () => {
    if (selectedPreAdviceId === '') {
      setCreateError('Select a pre-forecast.')
      return
    }
    const validationError = validateFeeRows(createFeeRows)
    if (validationError) {
      setCreateError(validationError)
      return
    }

    setCreateSaving(true)
    setCreateError('')
    try {
      const { data } = await demurrageBillingApi.create({
        preAdviceId: selectedPreAdviceId,
        feeLines: feeRowsToPayload(createFeeRows),
      })
      setCreateDialogOpen(false)
      setSuccessMessage(`Billing ${data.referenceNo} created.`)
      setActiveTab('Pending')
      load()
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create billing.'
      setCreateError(message)
    } finally {
      setCreateSaving(false)
    }
  }

  return (
    <Box sx={listPageRootSx}>
      <DemurrageHero
        icon={<ReceiptLongOutlinedIcon />}
        title="Demurrage billing"
        description="Manage charges when pre-forecast expires without CY return. Add demurrage, detention, storage, and other fee lines — truckers must settle before re-filing the same container."
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => void openCreateDialog()}
            sx={listHeroActionSx}
          >
            Create billing
          </Button>
        }
      />

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
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, 1fr)' },
          gap: { xs: 1.5, sm: 2 },
          mb: 3,
        }}
      >
        <SummaryCard
          label="Outstanding"
          value={summary.outstandingCount}
          subValue={`${summary.outstandingTotal.toLocaleString('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })} due`}
          color="#ED6C02"
        />
        <SummaryCard label="Under review" value={summary.underReviewCount} color="#0288D1" />
        <SummaryCard label="Settled" value={summary.settledCount} color="#2E7D32" />
        <SummaryCard label="Total records" value={summary.totalRecords} color={LIST_PRIMARY} />
      </Box>

      <Paper elevation={0} sx={demurrageTabsPaperSx}>
        <Tabs
          value={activeTab}
          onChange={(_, value: StatusTab) => setActiveTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ px: 1, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          {STATUS_TABS.map((tab) => (
            <Tab
              key={tab.key}
              value={tab.key}
              label={`${tab.label} (${countByStatus[tab.key]})`}
              sx={{ fontWeight: 700, textTransform: 'none', minHeight: 48 }}
            />
          ))}
        </Tabs>

        <Box sx={{ p: { xs: 1.5, sm: 2 }, borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search reference, container, trucker, pre-forecast…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ ...fieldSx, maxWidth: { sm: 420 } }}
          />
        </Box>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2, mt: 2 }}>
          {search.trim() ? 'No records match your search.' : tabEmptyMessage[activeTab]}
        </Alert>
      ) : (
        <>
          <ListDesktopOnly>
            <TableContainer component={Paper} elevation={0} sx={{ ...listTablePaperSx, mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Reference</TableCell>
                    <TableCell>Container</TableCell>
                    <TableCell>Trucker</TableCell>
                    <TableCell>Valid until</TableCell>
                    <TableCell>Charges</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Pre-forecast</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                        <RouterLink to={demurrageBillingDetailPath(item.id, 'evaluator')}>{item.referenceNo}</RouterLink>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {item.containerNo}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.containerSize} · {item.containerType}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.truckerName}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatDate(item.demurrageValidUntil)}</Typography>
                        {isExpiredValidUntil(item.demurrageValidUntil) && (
                          <Chip label={`${item.daysOverdue}d overdue`} size="small" color="warning" sx={{ mt: 0.5, fontWeight: 700 }} />
                        )}
                      </TableCell>
                      <TableCell sx={{ minWidth: 160 }}>
                        <DemurrageFeeBreakdown item={item} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={paymentStatusLabel[item.status] ?? item.status}
                          size="small"
                          color={paymentStatusColor[item.status] ?? 'default'}
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>
                        <RouterLink to={`/evaluations/${item.preAdviceId}`}>{item.preAdviceReferenceNo}</RouterLink>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <Button
                            size="small"
                            variant="text"
                            endIcon={<OpenInNewIcon />}
                            onClick={() => navigate(demurrageBillingDetailPath(item.id, 'evaluator'))}
                            sx={{ fontWeight: 600 }}
                          >
                            View
                          </Button>
                          {canEditFees(item) && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<EditOutlinedIcon />}
                              onClick={() => openFeeEditor(item)}
                              sx={{ fontWeight: 600, borderRadius: 2 }}
                            >
                              Edit fees
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </ListDesktopOnly>

          <ListMobileOnly>
            {filtered.map((item) => (
              <ListMobileCard key={item.id} onClick={() => navigate(demurrageBillingDetailPath(item.id, 'evaluator'))}>
                <ListMobileTitle>{item.referenceNo}</ListMobileTitle>
                <ListMobileMeta>
                  {item.containerNo} · {item.truckerName}
                </ListMobileMeta>
                <ListMobileMeta>
                  Valid until {formatDate(item.demurrageValidUntil)}
                  {isExpiredValidUntil(item.demurrageValidUntil) ? ` · ${item.daysOverdue}d overdue` : ''}
                </ListMobileMeta>
                <Box sx={{ mt: 1 }}>
                  <DemurrageFeeBreakdown item={item} />
                </Box>
                <ListMobileChipRow>
                  <Chip
                    label={paymentStatusLabel[item.status] ?? item.status}
                    size="small"
                    color={paymentStatusColor[item.status] ?? 'default'}
                    sx={{ fontWeight: 700 }}
                  />
                  <Chip
                    label={item.preAdviceReferenceNo}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                    component={RouterLink}
                    to={`/evaluations/${item.preAdviceId}`}
                    clickable
                  />
                </ListMobileChipRow>
                {canEditFees(item) && (
                  <Box sx={listMobileActionsSx} onClick={(e) => e.stopPropagation()}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<EditOutlinedIcon />}
                      onClick={() => openFeeEditor(item)}
                      sx={{ fontWeight: 600, borderRadius: 2 }}
                    >
                      Edit fees
                    </Button>
                  </Box>
                )}
              </ListMobileCard>
            ))}
          </ListMobileOnly>
        </>
      )}

      <Dialog open={feeDialogOpen} onClose={() => !feeSaving && setFeeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Edit billing fees</DialogTitle>
        <DialogContent dividers>
          {selectedBilling && (
            <BillingContextCard
              referenceNo={selectedBilling.referenceNo}
              containerNo={selectedBilling.containerNo}
              truckerName={selectedBilling.truckerName}
              validUntil={selectedBilling.demurrageValidUntil}
              daysOverdue={selectedBilling.daysOverdue}
            />
          )}
          {feeError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {feeError}
            </Alert>
          )}
          <DemurrageFeeLineEditor rows={feeRows} onChange={setFeeRows} disabled={feeSaving} />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setFeeDialogOpen(false)} disabled={feeSaving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void saveFees()} disabled={feeSaving} sx={{ fontWeight: 700, borderRadius: 2 }}>
            {feeSaving ? 'Saving…' : 'Save fees'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createDialogOpen} onClose={() => !createSaving && setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Create demurrage billing</DialogTitle>
        <DialogContent dividers>
          {createError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {createError}
            </Alert>
          )}
          {eligibleLoading ? (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 5 }}>
              <CircularProgress size={28} />
            </Box>
          ) : eligible.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              No expired pre-forecast waiting for billing. Records are also created automatically when demurrage validity
              passes.
            </Alert>
          ) : (
            <>
              <FormControl fullWidth margin="normal" size="small" sx={fieldSx}>
                <InputLabel id="eligible-pre-forecast-label">Expired pre-forecast</InputLabel>
                <Select
                  labelId="eligible-pre-forecast-label"
                  label="Expired pre-forecast"
                  value={selectedPreAdviceId}
                  onChange={(e) => setSelectedPreAdviceId(e.target.value as number)}
                >
                  {eligible.map((row) => (
                    <MenuItem key={row.preAdviceId} value={row.preAdviceId}>
                      {row.referenceNo} · {row.containerNo} · {row.truckerName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedEligible && (
                <BillingContextCard
                  referenceNo={selectedEligible.referenceNo}
                  containerNo={selectedEligible.containerNo}
                  truckerName={selectedEligible.truckerName}
                  validUntil={selectedEligible.demurrageValidUntil}
                  daysOverdue={selectedEligible.daysOverdue}
                />
              )}

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                Fee lines
              </Typography>
              <DemurrageFeeLineEditor rows={createFeeRows} onChange={setCreateFeeRows} disabled={createSaving} />
              <DialogTotalBar total={feeRowsTotal(createFeeRows)} label="Billing total" />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={createSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void createBilling()}
            disabled={createSaving || eligibleLoading || eligible.length === 0}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {createSaving ? 'Creating…' : 'Create billing'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
