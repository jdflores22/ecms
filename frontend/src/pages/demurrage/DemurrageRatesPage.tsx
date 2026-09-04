import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  ListDesktopOnly,
  ListLoadingState,
  ListMobileCard,
  ListMobileChipRow,
  ListMobileMeta,
  ListMobileOnly,
  ListMobileTitle,
  listHeroActionSx,
  listMobileActionsSx,
  listPageRootSx,
  listTablePaperSx,
} from '../../components/layout/ListPagePrimitives'
import { ICS_PRIMARY } from '../../components/layout/DetailPagePrimitives'
import {
  containerSizeApi,
  demurrageDetentionRateApi,
  depotApi,
  paymentApi,
  shippingLineApi,
  type ContainerSizeMaster,
  type DemurrageDetentionRate,
  type Depot,
  type ShippingLine,
} from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { formatDateTime, formatPeso, todayIsoDate } from '../../utils/datetime'

const primaryDark = ICS_PRIMARY
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

type RateDialogMode = 'create' | 'edit' | null

interface RateFormState {
  shippingLineId: number | ''
  depotId: number | ''
  containerSizeId: number | ''
  demurrageAmount: string
  detentionAmount: string
  effectiveFrom: string
  effectiveTo: string
  isActive: boolean
}

const emptyForm = (): RateFormState => ({
  shippingLineId: '',
  depotId: '',
  containerSizeId: '',
  demurrageAmount: '3500',
  detentionAmount: '2500',
  effectiveFrom: todayIsoDate(),
  effectiveTo: '',
  isActive: true,
})

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

function scopeLabel(rate: DemurrageDetentionRate) {
  const depot = rate.depotName ?? 'All depots'
  const size = rate.containerSizeLabel ?? 'All sizes'
  return `${depot} · ${size}`
}

interface DemurrageRatesPageProps {
  variant: 'admin' | 'evaluator'
}

export default function DemurrageRatesPage({ variant }: DemurrageRatesPageProps) {
  const user = useAppSelector((s) => s.auth.user)
  const isAdmin = variant === 'admin'
  const isEvaluator = variant === 'evaluator'

  const [rates, setRates] = useState<DemurrageDetentionRate[]>([])
  const [lines, setLines] = useState<ShippingLine[]>([])
  const [depots, setDepots] = useState<Depot[]>([])
  const [sizes, setSizes] = useState<ContainerSizeMaster[]>([])
  const [fallbackDemurrage, setFallbackDemurrage] = useState('3500')
  const [fallbackDetention, setFallbackDetention] = useState('2500')
  const [fallbackUpdatedAt, setFallbackUpdatedAt] = useState<string | null>(null)
  const [lineFilter, setLineFilter] = useState<number | 'all'>('all')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fallbackSaving, setFallbackSaving] = useState(false)

  const [dialog, setDialog] = useState<RateDialogMode>(null)
  const [selected, setSelected] = useState<DemurrageDetentionRate | null>(null)
  const [form, setForm] = useState<RateFormState>(emptyForm)

  const evaluatorLineId = user?.shippingLineId ?? null

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (isAdmin) {
        const [ratesRes, linesRes, depotsRes, sizesRes, settingsRes] = await Promise.all([
          demurrageDetentionRateApi.list(
            lineFilter !== 'all' ? { shippingLineId: lineFilter } : undefined,
          ),
          shippingLineApi.list(),
          depotApi.list(),
          containerSizeApi.list(),
          paymentApi.getSettings(),
        ])
        setRates(ratesRes.data)
        setLines(linesRes.data.filter((l) => l.isActive))
        setDepots(depotsRes.data.filter((d) => d.isActive))
        setSizes(sizesRes.data.filter((s) => s.isActive))
        setFallbackDemurrage(String(settingsRes.data.demurrageFeeAmount))
        setFallbackDetention(String(settingsRes.data.detentionFeeAmount))
        setFallbackUpdatedAt(settingsRes.data.updatedAt)
      } else {
        const [ratesRes, depotsRes, sizesRes] = await Promise.all([
          demurrageDetentionRateApi.list(),
          depotApi.list(),
          containerSizeApi.list(),
        ])
        setRates(ratesRes.data)
        setDepots(depotsRes.data.filter((d) => d.isActive))
        setSizes(sizesRes.data.filter((s) => s.isActive))
      }
    } catch {
      setError('Failed to load demurrage and detention rates.')
    } finally {
      setLoading(false)
    }
  }, [isAdmin, lineFilter])

  useEffect(() => {
    void load()
  }, [load])

  const filteredRates = useMemo(() => {
    if (!isAdmin || lineFilter === 'all') return rates
    return rates.filter((r) => r.shippingLineId === lineFilter)
  }, [rates, isAdmin, lineFilter])

  const activeCount = useMemo(() => filteredRates.filter((r) => r.isActive).length, [filteredRates])

  if (!user) return null
  if (isAdmin && user.role !== 'Administrator') return <Navigate to="/" replace />
  if (isEvaluator && user.role !== 'ShippingLineEvaluator') return <Navigate to="/" replace />

  const openCreate = () => {
    const next = emptyForm()
    if (isEvaluator && evaluatorLineId) next.shippingLineId = evaluatorLineId
    if (isAdmin && lineFilter !== 'all') next.shippingLineId = lineFilter
    setForm(next)
    setSelected(null)
    setDialog('create')
  }

  const openEdit = (rate: DemurrageDetentionRate) => {
    setSelected(rate)
    setForm({
      shippingLineId: rate.shippingLineId,
      depotId: rate.depotId ?? '',
      containerSizeId: rate.containerSizeId ?? '',
      demurrageAmount: String(rate.demurrageAmount),
      detentionAmount: String(rate.detentionAmount),
      effectiveFrom: rate.effectiveFrom,
      effectiveTo: rate.effectiveTo ?? '',
      isActive: rate.isActive,
    })
    setDialog('edit')
  }

  const saveRate = async () => {
    if (form.shippingLineId === '') {
      setError('Shipping line is required.')
      return
    }
    const demurrageAmount = Number(form.demurrageAmount)
    const detentionAmount = Number(form.detentionAmount)
    if (demurrageAmount <= 0 || detentionAmount <= 0) {
      setError('Demurrage and detention amounts must be greater than zero.')
      return
    }

    const payload = {
      shippingLineId: Number(form.shippingLineId),
      depotId: form.depotId === '' ? null : Number(form.depotId),
      containerSizeId: form.containerSizeId === '' ? null : Number(form.containerSizeId),
      demurrageAmount,
      detentionAmount,
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo.trim() ? form.effectiveTo : null,
      isActive: form.isActive,
    }

    setSubmitting(true)
    setError('')
    try {
      if (dialog === 'create') {
        await demurrageDetentionRateApi.create(payload)
        setSuccessMessage('Rate rule created.')
      } else if (selected) {
        await demurrageDetentionRateApi.update(selected.id, payload)
        setSuccessMessage('Rate rule updated.')
      }
      setDialog(null)
      await load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save rate rule.'))
    } finally {
      setSubmitting(false)
    }
  }

  const deactivateRate = async (rate: DemurrageDetentionRate) => {
    setError('')
    try {
      await demurrageDetentionRateApi.deactivate(rate.id)
      setSuccessMessage(`Deactivated rule for ${rate.shippingLineName}.`)
      await load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to deactivate rate rule.'))
    }
  }

  const saveFallback = async () => {
    const demurrageAmount = Number(fallbackDemurrage)
    const detentionAmount = Number(fallbackDetention)
    if (demurrageAmount <= 0 || detentionAmount <= 0) {
      setError('Fallback amounts must be greater than zero.')
      return
    }
    setFallbackSaving(true)
    setError('')
    try {
      const { data } = await paymentApi.updateDemurrageSettings(demurrageAmount, detentionAmount)
      setFallbackDemurrage(String(data.demurrageFeeAmount))
      setFallbackDetention(String(data.detentionFeeAmount))
      setFallbackUpdatedAt(data.updatedAt)
      setSuccessMessage('System fallback rates updated.')
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to update fallback rates.'))
    } finally {
      setFallbackSaving(false)
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
            <PaymentsOutlinedIcon sx={{ color: primaryDark }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: primaryDark }}>
              Demurrage & detention rates
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 720 }}>
              {isAdmin
                ? 'Configure per shipping line rules used when expired free-time billing is auto-created. Falls back to system defaults when no rule matches.'
                : 'Manage demurrage and detention amounts for your shipping line. Rules apply automatically on new expired free-time billing.'}
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={listHeroActionSx}>
          Add rule
        </Button>
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

      {isAdmin && (
        <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
            System fallback (no matching rule)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Used when no active rule matches shipping line, depot, and container size.
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr auto' }, gap: 2, alignItems: 'end' }}>
            <TextField
              label="Demurrage (PHP)"
              type="number"
              value={fallbackDemurrage}
              onChange={(e) => setFallbackDemurrage(e.target.value)}
              sx={fieldSx}
              slotProps={{ htmlInput: { min: 1 } }}
            />
            <TextField
              label="Detention (PHP)"
              type="number"
              value={fallbackDetention}
              onChange={(e) => setFallbackDetention(e.target.value)}
              sx={fieldSx}
              slotProps={{ htmlInput: { min: 1 } }}
            />
            <Button variant="contained" onClick={() => void saveFallback()} disabled={fallbackSaving} sx={{ fontWeight: 700, borderRadius: 2 }}>
              {fallbackSaving ? 'Saving…' : 'Save fallback'}
            </Button>
          </Box>
          {fallbackUpdatedAt && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Last updated {formatDateTime(fallbackUpdatedAt)}
            </Typography>
          )}
        </Paper>
      )}

      {isAdmin && (
        <Box sx={{ mb: 2, maxWidth: 320 }}>
          <FormControl fullWidth size="small" sx={fieldSx}>
            <InputLabel>Filter shipping line</InputLabel>
            <Select
              label="Filter shipping line"
              value={lineFilter}
              onChange={(e) => setLineFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <MenuItem value="all">All lines</MenuItem>
              {lines.map((line) => (
                <MenuItem key={line.id} value={line.id}>
                  {line.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      <Paper elevation={0} sx={{ ...listTablePaperSx, mb: 2 }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Rate rules
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
            {activeCount} active · {filteredRates.length} total
          </Typography>
        </Box>

        {loading ? (
          <ListLoadingState />
        ) : filteredRates.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Typography color="text.secondary">No rate rules yet. Add one to override the system fallback.</Typography>
          </Box>
        ) : (
          <>
            <ListDesktopOnly>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {isAdmin && <TableCell sx={{ fontWeight: 700 }}>Shipping line</TableCell>}
                      <TableCell sx={{ fontWeight: 700 }}>Scope</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Demurrage</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Detention</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Effective</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRates.map((rate) => (
                      <TableRow key={rate.id} hover>
                        {isAdmin && <TableCell>{rate.shippingLineName}</TableCell>}
                        <TableCell>{scopeLabel(rate)}</TableCell>
                        <TableCell align="right">{formatPeso(rate.demurrageAmount)}</TableCell>
                        <TableCell align="right">{formatPeso(rate.detentionAmount)}</TableCell>
                        <TableCell>
                          {rate.effectiveFrom}
                          {rate.effectiveTo ? ` → ${rate.effectiveTo}` : ' → open'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={rate.isActive ? 'Active' : 'Inactive'}
                            color={rate.isActive ? 'success' : 'default'}
                            variant={rate.isActive ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => openEdit(rate)}>
                            Edit
                          </Button>
                          {rate.isActive && (
                            <Button size="small" color="warning" onClick={() => void deactivateRate(rate)} sx={{ ml: 1 }}>
                              Deactivate
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </ListDesktopOnly>

            <ListMobileOnly>
              {filteredRates.map((rate) => (
                <ListMobileCard key={rate.id}>
                  <ListMobileTitle>{isAdmin ? rate.shippingLineName : scopeLabel(rate)}</ListMobileTitle>
                  {isAdmin && <ListMobileMeta>{scopeLabel(rate)}</ListMobileMeta>}
                  <ListMobileChipRow>
                    <Chip size="small" label={`Demurrage ${formatPeso(rate.demurrageAmount)}`} />
                    <Chip size="small" label={`Detention ${formatPeso(rate.detentionAmount)}`} />
                    <Chip size="small" label={rate.isActive ? 'Active' : 'Inactive'} color={rate.isActive ? 'success' : 'default'} />
                  </ListMobileChipRow>
                  <ListMobileMeta>
                    {rate.effectiveFrom}
                    {rate.effectiveTo ? ` → ${rate.effectiveTo}` : ' → open'}
                  </ListMobileMeta>
                  <Box sx={listMobileActionsSx}>
                    <Button size="small" variant="outlined" onClick={() => openEdit(rate)}>
                      Edit
                    </Button>
                    {rate.isActive && (
                      <Button size="small" color="warning" onClick={() => void deactivateRate(rate)}>
                        Deactivate
                      </Button>
                    )}
                  </Box>
                </ListMobileCard>
              ))}
            </ListMobileOnly>
          </>
        )}
      </Paper>

      <Dialog open={dialog !== null} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{dialog === 'create' ? 'Add rate rule' : 'Edit rate rule'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
          {isAdmin && (
            <FormControl fullWidth sx={fieldSx}>
              <InputLabel>Shipping line</InputLabel>
              <Select
                label="Shipping line"
                value={form.shippingLineId}
                onChange={(e) => setForm({ ...form, shippingLineId: Number(e.target.value) })}
              >
                {lines.map((line) => (
                  <MenuItem key={line.id} value={line.id}>
                    {line.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>Depot / CY</InputLabel>
            <Select
              label="Depot / CY"
              value={form.depotId}
              onChange={(e) => {
                const raw = String(e.target.value)
                setForm({ ...form, depotId: raw === '' ? '' : Number(raw) })
              }}
            >
              <MenuItem value="">All depots</MenuItem>
              {depots.map((depot) => (
                <MenuItem key={depot.id} value={depot.id}>
                  {depot.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>Container size</InputLabel>
            <Select
              label="Container size"
              value={form.containerSizeId}
              onChange={(e) => {
                const raw = String(e.target.value)
                setForm({ ...form, containerSizeId: raw === '' ? '' : Number(raw) })
              }}
            >
              <MenuItem value="">All sizes</MenuItem>
              {sizes.map((size) => (
                <MenuItem key={size.id} value={size.id}>
                  {size.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Demurrage amount (PHP)"
            type="number"
            value={form.demurrageAmount}
            onChange={(e) => setForm({ ...form, demurrageAmount: e.target.value })}
            sx={fieldSx}
            slotProps={{ htmlInput: { min: 1 } }}
          />
          <TextField
            label="Detention amount (PHP)"
            type="number"
            value={form.detentionAmount}
            onChange={(e) => setForm({ ...form, detentionAmount: e.target.value })}
            sx={fieldSx}
            slotProps={{ htmlInput: { min: 1 } }}
          />
          <TextField
            label="Effective from"
            type="date"
            value={form.effectiveFrom}
            onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
            sx={fieldSx}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Effective to (optional)"
            type="date"
            value={form.effectiveTo}
            onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })}
            sx={fieldSx}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveRate()} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save rule'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
