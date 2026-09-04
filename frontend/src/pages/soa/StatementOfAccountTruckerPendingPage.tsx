import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Paper,
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
import { useNavigate, useParams } from 'react-router-dom'
import {
  DetailBackButton,
  DetailErrorState,
  DetailHero,
  DetailHeroAside,
  DetailLoadingState,
  InfoTile,
  infoGridSx,
} from '../../components/layout/DetailPagePrimitives'
import {
  statementOfAccountApi,
  type EligibleSoaBilling,
  type ShippingLineCreditLine,
  type SoaTruckerRegister,
} from '../../services/api'
import { formatPeso, todayIsoDate } from '../../utils/datetime'

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

export default function StatementOfAccountTruckerPendingPage() {
  const { truckerId: truckerIdParam } = useParams()
  const truckerId = Number(truckerIdParam)
  const navigate = useNavigate()
  const listPath = '/evaluations/statement-of-accounts'

  const [trucker, setTrucker] = useState<SoaTruckerRegister | null>(null)
  const [creditLine, setCreditLine] = useState<ShippingLineCreditLine | null>(null)
  const [billings, setBillings] = useState<EligibleSoaBilling[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [creditApplied, setCreditApplied] = useState('0')
  const [dueDate, setDueDate] = useState(todayIsoDate())
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!truckerId || Number.isNaN(truckerId)) return
    setLoading(true)
    setError('')
    try {
      const [registerRes, billingsRes, creditRes] = await Promise.all([
        statementOfAccountApi.eligibleTruckers(),
        statementOfAccountApi.eligibleBillings(truckerId),
        statementOfAccountApi.getCreditLine(),
      ])
      const match = registerRes.data.find((t) => t.truckerId === truckerId) ?? null
      if (!match) {
        setError('Trucker account not found or has no billings pending SOA release.')
        setTrucker(null)
        setBillings([])
        return
      }
      setTrucker(match)
      setBillings(billingsRes.data)
      setSelectedIds(billingsRes.data.map((b) => b.demurrageBillingId))
      setCreditLine(creditRes.data)
    } catch {
      setError('Failed to load trucker SOA details.')
    } finally {
      setLoading(false)
    }
  }, [truckerId])

  useEffect(() => {
    void load()
  }, [load])

  const selectedTotal = useMemo(
    () =>
      billings
        .filter((b) => selectedIds.includes(b.demurrageBillingId))
        .reduce((sum, b) => sum + b.totalAmount, 0),
    [billings, selectedIds],
  )

  const toggleBilling = (billingId: number) => {
    setSelectedIds((prev) =>
      prev.includes(billingId) ? prev.filter((id) => id !== billingId) : [...prev, billingId],
    )
  }

  const releaseSoa = async () => {
    if (!trucker || selectedIds.length === 0) {
      setActionError('Select at least one billing to include in the SOA.')
      return
    }
    setSaving(true)
    setActionError('')
    try {
      const { data } = await statementOfAccountApi.create({
        truckerId: trucker.truckerId,
        demurrageBillingIds: selectedIds,
        creditApplied: Number(creditApplied) || 0,
        remarks: remarks.trim() || undefined,
        issueImmediately: true,
        dueDate,
      })
      navigate(`/evaluations/statement-of-accounts/${data.id}`)
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Failed to release SOA.'))
    } finally {
      setSaving(false)
    }
  }

  if (!truckerId || Number.isNaN(truckerId)) {
    return (
      <Box>
        <DetailBackButton to={listPath} label="Back to statements" />
        <DetailErrorState message="Invalid trucker reference." />
      </Box>
    )
  }

  if (loading) {
    return (
      <Box>
        <DetailBackButton to={listPath} label="Back to statements" />
        <DetailLoadingState />
      </Box>
    )
  }

  if (error || !trucker) {
    return (
      <Box>
        <DetailBackButton to={listPath} label="Back to statements" />
        <DetailErrorState message={error || 'Trucker not found.'} />
      </Box>
    )
  }

  return (
    <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
      <DetailBackButton to={listPath} label="Back to statements" />

      {actionError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setActionError('')}>
          {actionError}
        </Alert>
      )}

      <DetailHero
        icon={<LocalShippingOutlinedIcon />}
        title={trucker.truckerName}
        subtitle="Trucker account — pending SOA release"
        aside={
          <DetailHeroAside
            label="Outstanding charges"
            primary={formatPeso(trucker.totalAmount)}
            secondary={`${trucker.billingCount} billing${trucker.billingCount === 1 ? '' : 's'}`}
          />
        }
      />

      <Box sx={{ ...infoGridSx, mb: 3 }}>
        <InfoTile
          label="Charge period"
          value={
            trucker.oldestExpiredOn === trucker.latestExpiredOn
              ? trucker.oldestExpiredOn
              : `${trucker.oldestExpiredOn} → ${trucker.latestExpiredOn}`
          }
        />
        {creditLine && (
          <>
            <InfoTile label="Credit limit" value={formatPeso(creditLine.creditLimit)} />
            <InfoTile label="Available credit" value={formatPeso(creditLine.availableCredit)} />
            <InfoTile label="Utilized" value={formatPeso(creditLine.utilizedAmount)} />
          </>
        )}
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Billings to include ({selectedIds.length} of {billings.length})
          </Typography>
          <Typography variant="caption" color="text.secondary">
            All outstanding billings are selected by default. Uncheck any you want to exclude.
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell sx={{ fontWeight: 700 }}>Billing ref</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Container</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Pre-forecast</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Expired on</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {billings.map((row) => (
                <TableRow key={row.demurrageBillingId} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.includes(row.demurrageBillingId)}
                      onChange={() => toggleBilling(row.demurrageBillingId)}
                    />
                  </TableCell>
                  <TableCell>{row.referenceNo}</TableCell>
                  <TableCell>{row.containerNo}</TableCell>
                  <TableCell>{row.preAdviceReferenceNo}</TableCell>
                  <TableCell>{row.expiredOn}</TableCell>
                  <TableCell align="right">{formatPeso(row.totalAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>
          Release SOA
        </Typography>
        <Box sx={{ display: 'grid', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            SOA total: <strong>{formatPeso(selectedTotal)}</strong>
          </Typography>
          <TextField
            label="Credit applied (PHP)"
            type="number"
            value={creditApplied}
            onChange={(e) => setCreditApplied(e.target.value)}
            sx={fieldSx}
            helperText={
              creditLine ? `Available credit: ${formatPeso(creditLine.availableCredit)}` : undefined
            }
            slotProps={{ htmlInput: { min: 0, max: selectedTotal } }}
          />
          <TextField
            label="Due date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            sx={fieldSx}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            multiline
            minRows={2}
            sx={fieldSx}
          />
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        <Button
          variant="contained"
          onClick={() => void releaseSoa()}
          disabled={saving || selectedIds.length === 0}
          sx={{ fontWeight: 700, borderRadius: 2 }}
        >
          {saving ? 'Issuing…' : 'Release SOA'}
        </Button>
      </Box>
    </Box>
  )
}
