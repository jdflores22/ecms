import {
  Alert,
  Autocomplete,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import ContentPasteIcon from '@mui/icons-material/ContentPaste'
import HistoryIcon from '@mui/icons-material/History'
import SyncAltOutlinedIcon from '@mui/icons-material/SyncAltOutlined'
import axios from 'axios'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '../../store/hooks'
import {
  withdrawalApi,
  type Withdrawal,
  type WithdrawalFormConfig,
} from '../../services/api'
import { extractAtwDocumentMetadata } from '../../utils/atwDocumentOcr'
import { todayIsoDate, shiftIsoDate } from '../../utils/datetime'
import {
  clearWithdrawalDraft,
  emptyWithdrawalFormValues,
  loadWithdrawalDraft,
  normalizeWithdrawalDraft,
  saveWithdrawalDraft,
} from '../../utils/withdrawalDraftStorage'
import BulkContainerPasteDialog from './BulkContainerPasteDialog'
import WithdrawalForm, {
  type WithdrawalFormValues,
} from './WithdrawalForm'
import WithdrawalProgressChecklist from './WithdrawalProgressChecklist'

const steps = ['Booking', 'Shipment', 'ATW document', 'Review & Book']

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string' && msg.trim()) return msg
  }
  return fallback
}

interface BookingDetails {
  plateNumber: string
  driverName: string
  purpose: 'Repositioning' | 'Export'
}

function emptyValues(): WithdrawalFormValues {
  const today = todayIsoDate()
  return emptyWithdrawalFormValues(today, shiftIsoDate(today, 14))
}

function withdrawalToFormValues(item: Withdrawal): WithdrawalFormValues {
  return {
    atwNumber: item.atwNumber,
    shippingLineId: item.shippingLineId,
    lines: item.lines.map((line) => ({
      containerNo: line.containerNo,
      containerSizeId: line.containerSizeId,
      containerTypeId: line.containerTypeId,
    })),
    currentDepotId: item.currentDepotId,
    destination: item.destination,
    issueDate: item.issueDate,
    expirationDate: item.expirationDate,
    remarks: item.remarks ?? '',
  }
}

interface WithdrawalNewWizardProps {
  formConfig: WithdrawalFormConfig
  onError: (message: string) => void
}

export default function WithdrawalNewWizard({ formConfig, onError }: WithdrawalNewWizardProps) {
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const truckingCompany = user?.fullName?.trim() || user?.username || ''
  const fileRef = useRef<HTMLInputElement>(null)
  const [activeStep, setActiveStep] = useState(0)
  const [values, setValues] = useState<WithdrawalFormValues>(() =>
    normalizeWithdrawalDraft(loadWithdrawalDraft(), emptyValues(), { clearDepot: true }),
  )
  const [issuedItems, setIssuedItems] = useState<Withdrawal[]>([])
  const [previousItems, setPreviousItems] = useState<Withdrawal[]>([])
  const [atwFile, setAtwFile] = useState<File | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrNote, setOcrNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [showQuickStart, setShowQuickStart] = useState(false)
  const [booking, setBooking] = useState<BookingDetails>({
    plateNumber: '',
    driverName: '',
    purpose: 'Repositioning',
  })
  const [nextBookingNumber, setNextBookingNumber] = useState('')
  const hasSavedDraft = useMemo(() => Boolean(loadWithdrawalDraft()), [])

  useEffect(() => {
    saveWithdrawalDraft(values)
  }, [values])

  useEffect(() => {
    withdrawalApi.nextBookingNumber()
      .then(({ data }) => setNextBookingNumber(data.nextBookingNumber))
      .catch(() => {})
  }, [])

  useEffect(() => {
    withdrawalApi.list().then(({ data }) => {
      setIssuedItems(data.filter((w) => w.status === 'Issued'))
      setPreviousItems(data.filter((w) => w.status !== 'Draft').slice(0, 5))
    }).catch(() => {})
  }, [])

  const completeLines = useMemo(
    () =>
      values.lines.filter(
        (l) =>
          (l.containerNo ?? '').trim() &&
          l.containerSizeId !== '' &&
          l.containerTypeId !== '',
      ),
    [values.lines],
  )

  const shipmentStepValid = useMemo(
    () =>
      Boolean(
        (values.atwNumber ?? '').trim() &&
          values.shippingLineId !== '' &&
          (values.destination ?? '').trim() &&
          values.issueDate &&
          values.expirationDate &&
          completeLines.length > 0,
      ),
    [values, completeLines.length],
  )

  const progressItems = useMemo(
    () => [
      { key: 'booking', label: 'Booking # ready', done: Boolean(nextBookingNumber) },
      {
        key: 'truck',
        label: 'Trucking details set',
        done: Boolean(
          truckingCompany &&
            (booking.plateNumber ?? '').trim() &&
            (booking.driverName ?? '').trim(),
        ),
      },
      { key: 'atw', label: 'ATW number entered', done: Boolean((values.atwNumber ?? '').trim()) },
      { key: 'line', label: 'Shipping line selected', done: values.shippingLineId !== '' },
      { key: 'dest', label: 'Destination set', done: Boolean((values.destination ?? '').trim()) },
      { key: 'dates', label: 'Validity dates set', done: Boolean(values.issueDate && values.expirationDate) },
      {
        key: 'containers',
        label: 'Containers added',
        done: completeLines.length > 0,
      },
      { key: 'cert', label: 'ATW certificate attached', done: Boolean(atwFile) },
    ],
    [booking, values, atwFile, nextBookingNumber, truckingCompany, completeLines.length],
  )

  const applySmartDefaults = useCallback(
    (shippingLineId: number) => {
      const rules = formConfig.shippingLineRules.find((r) => r.shippingLineId === shippingLineId)
      const today = todayIsoDate()
      setValues((prev) => ({
        ...prev,
        shippingLineId,
        issueDate: prev.issueDate || today,
        expirationDate: prev.expirationDate || shiftIsoDate(today, rules?.defaultValidityDays ?? 14),
        currentDepotId:
          rules && rules.contractDepotIds.length > 0 ? rules.contractDepotIds[0] : '',
      }))
    },
    [formConfig.shippingLineRules],
  )

  const handleOcr = async (file: File) => {
    setAtwFile(file)
    setOcrLoading(true)
    setOcrNote('')
    try {
      const meta = await extractAtwDocumentMetadata(file)
      setValues((prev) => ({
        ...prev,
        atwNumber: meta.atwNumber ?? prev.atwNumber,
        issueDate: meta.issueDate ?? prev.issueDate,
        expirationDate: meta.expirationDate ?? prev.expirationDate,
        destination: meta.destination ?? prev.destination,
        lines:
          meta.containerNumbers.length > 0
            ? meta.containerNumbers.map((containerNo) => ({
                containerNo,
                containerSizeId: '' as const,
                containerTypeId: '' as const,
              }))
            : prev.lines,
      }))
      setOcrNote(
        meta.containerNumbers.length > 0
          ? `Detected ${meta.containerNumbers.length} container(s) from the document. Set size and type for each row.`
          : 'Document scanned. Review extracted fields before continuing.',
      )
    } catch {
      setOcrNote('Could not read the document automatically. Enter details manually.')
    } finally {
      setOcrLoading(false)
    }
  }

  const finalizeBook = async () => {
    if (!shipmentStepValid) {
      onError('Complete shipment details: ATW number, shipping line, destination, dates, and at least one container with size and type.')
      return
    }
    if (!atwFile) {
      onError('Attach the ATW certificate before booking.')
      return
    }

    setSubmitting(true)
    onError('')
    try {
      const lines = completeLines.map((l) => ({
        containerNo: (l.containerNo ?? '').trim().toUpperCase(),
        containerSizeId: l.containerSizeId as number,
        containerTypeId: l.containerTypeId as number,
      }))

      const { data } = await withdrawalApi.book({
        plateNumber: (booking.plateNumber ?? '').trim(),
        driverName: (booking.driverName ?? '').trim(),
        atwNumber: (values.atwNumber ?? '').trim().toUpperCase(),
        shippingLineId: values.shippingLineId as number,
        purpose: booking.purpose,
        lines,
        destination: (values.destination ?? '').trim(),
        issueDate: values.issueDate,
        expirationDate: values.expirationDate,
        remarks: (values.remarks ?? '').trim() || undefined,
      })
      if (atwFile) {
        await withdrawalApi.uploadDocument(data.id, atwFile)
      }
      clearWithdrawalDraft()
      navigate(`/trucker/withdrawals/${data.id}`)
    } catch (err) {
      onError(apiErrorMessage(err, 'Failed to book ICS withdrawal.'))
      setSubmitting(false)
    }
  }

  const bookingStepValid =
    truckingCompany &&
    (booking.plateNumber ?? '').trim() &&
    (booking.driverName ?? '').trim()

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto' }}>
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3, display: { xs: 'none', sm: 'flex' } }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Box sx={{ display: { xs: 'flex', sm: 'none' }, mb: 2, gap: 0.75, flexWrap: 'wrap' }}>
        {steps.map((label, index) => (
          <Chip
            key={label}
            size="small"
            label={label}
            variant={index === activeStep ? 'filled' : 'outlined'}
            color={index === activeStep ? 'primary' : 'default'}
          />
        ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 320px' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5, md: 3 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Book ICS — booking details
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                ICS assigns the booking number automatically. Enter trucking details below; container yard assignment comes later from the shipping line.
              </Typography>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                <TextField
                  label="Booking #"
                  value={nextBookingNumber || 'Generating…'}
                  slotProps={{ input: { readOnly: true } }}
                  helperText="Auto-increment · assigned when you book"
                />
                <FormControl fullWidth>
                  <InputLabel>Purpose</InputLabel>
                  <Select
                    label="Purpose"
                    value={booking.purpose}
                    onChange={(e) =>
                      setBooking((b) => ({ ...b, purpose: e.target.value as BookingDetails['purpose'] }))
                    }
                  >
                    <MenuItem value="Repositioning">Repositioning</MenuItem>
                    <MenuItem value="Export">Export</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Trucking company"
                  value={truckingCompany || '—'}
                  slotProps={{ input: { readOnly: true } }}
                  helperText="From your ICS trucker profile"
                />
                <TextField
                  label="Plate #"
                  required
                  value={booking.plateNumber}
                  onChange={(e) => setBooking((b) => ({ ...b, plateNumber: e.target.value.toUpperCase() }))}
                />
                <TextField
                  label="Driver name"
                  required
                  value={booking.driverName}
                  onChange={(e) => setBooking((b) => ({ ...b, driverName: e.target.value }))}
                  sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button variant="contained" disabled={!bookingStepValid} onClick={() => setActiveStep(1)}>
                  Continue to shipment
                </Button>
              </Box>
            </Box>
          )}

          {activeStep === 1 && (
            <Box>
              {hasSavedDraft && (
                <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>
                  A saved draft was restored from this browser.
                </Alert>
              )}

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, justifyContent: 'space-between' }}>
                <Button size="small" startIcon={<ContentPasteIcon />} onClick={() => setBulkOpen(true)}>
                  Bulk paste containers
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<HistoryIcon />}
                  onClick={() => setShowQuickStart((v) => !v)}
                >
                  {showQuickStart ? 'Hide quick start options' : 'Show quick start options'}
                </Button>
              </Box>

              {showQuickStart && (
                <Paper
                  elevation={0}
                  sx={{ mb: 2, p: 2, borderRadius: 2, border: '1px dashed', borderColor: 'divider', bgcolor: 'grey.50' }}
                >
                  {issuedItems.length > 0 && (
                    <Box sx={{ mb: previousItems.length > 0 ? 2 : 0 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                        Continue with issued ATW ({issuedItems.length})
                      </Typography>
                      <Box sx={{ display: 'grid', gap: 1, maxHeight: 180, overflowY: 'auto', pr: 0.5 }}>
                        {issuedItems.map((item) => (
                          <Button
                            key={item.id}
                            fullWidth
                            variant="outlined"
                            sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
                            onClick={() => navigate(`/trucker/withdrawals/${item.id}`)}
                          >
                            {item.atwNumber} · {item.containerSummary}
                          </Button>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {previousItems.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                        Copy from previous request
                      </Typography>
                      <Box sx={{ display: 'grid', gap: 1, maxHeight: 180, overflowY: 'auto', pr: 0.5 }}>
                        {previousItems.map((item) => (
                          <Button
                            key={item.id}
                            fullWidth
                            variant="outlined"
                            sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
                            onClick={() => {
                              setValues({ ...withdrawalToFormValues(item), currentDepotId: '' })
                              setShowQuickStart(false)
                            }}
                          >
                            {item.referenceNo} — {item.atwNumber}
                          </Button>
                        ))}
                      </Box>
                    </Box>
                  )}

                  <Button
                    variant="text"
                    size="small"
                    startIcon={<SyncAltOutlinedIcon />}
                    disabled
                    sx={{ mt: 1, justifyContent: 'flex-start' }}
                  >
                    Import from LOGICTECK (not configured)
                  </Button>
                </Paper>
              )}

              {values.lines.some((l) => (l.containerNo ?? '').trim() && (l.containerSizeId === '' || l.containerTypeId === '')) && (
                <Alert severity="warning" sx={{ borderRadius: 2, mb: 2 }}>
                  Each container needs a size and type before you can continue. OCR may fill numbers only — set size and type for every row.
                </Alert>
              )}

              <WithdrawalForm
                lookups={formConfig}
                formConfig={formConfig}
                initial={values}
                controlledValues={values}
                onValuesChange={setValues}
                onShippingLineChange={applySmartDefaults}
                hideActions
                bookMode
                onSubmit={() => {}}
              />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, gap: 1, flexWrap: 'wrap' }}>
                <Button onClick={() => setActiveStep(0)}>Back</Button>
                <Button
                  variant="contained"
                  disabled={!shipmentStepValid}
                  onClick={() => setActiveStep(2)}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  Continue to ATW upload
                </Button>
              </Box>
            </Box>
          )}

          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Upload ATW certificate
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                PDF or image. OCR will try to fill ATW number, dates, destination, and container numbers.
              </Typography>
              <input
                ref={fileRef}
                type="file"
                hidden
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleOcr(file)
                }}
              />
              <Button
                variant="outlined"
                startIcon={ocrLoading ? <CircularProgress size={16} /> : <CloudUploadOutlinedIcon />}
                onClick={() => fileRef.current?.click()}
                disabled={ocrLoading}
              >
                {atwFile ? `Selected: ${atwFile.name}` : 'Choose ATW document'}
              </Button>
              {ocrNote && (
                <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                  {ocrNote}
                </Alert>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, gap: 1, flexWrap: 'wrap' }}>
                <Button onClick={() => setActiveStep(1)} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                  Back
                </Button>
                <Button
                  variant="contained"
                  onClick={() => setActiveStep(3)}
                  disabled={!atwFile || !shipmentStepValid}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  Review &amp; book
                </Button>
              </Box>
            </Box>
          )}

          {activeStep === 3 && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Review &amp; book ICS
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                <Typography variant="body2"><strong>Booking #:</strong> {nextBookingNumber || 'Auto-assigned on book'}</Typography>
                <Typography variant="body2"><strong>Trucking:</strong> {truckingCompany} · {booking.plateNumber} · {booking.driverName}</Typography>
                <Typography variant="body2"><strong>Purpose:</strong> {booking.purpose}</Typography>
                <Typography variant="body2"><strong>ATW:</strong> {values.atwNumber}</Typography>
                <Typography variant="body2"><strong>Destination:</strong> {values.destination}</Typography>
                <Typography variant="body2"><strong>Containers:</strong> {values.lines.filter((l) => l.containerNo).length}</Typography>
                <Typography variant="body2"><strong>ATW document:</strong> {atwFile ? atwFile.name : 'Not attached'}</Typography>
              </Box>

              <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                After booking, your shipping line will assign the container yard, then the depot will set your pick-up day.
              </Alert>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end' }}>
                <Button onClick={() => setActiveStep(2)} disabled={submitting} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                  Back
                </Button>
                <Button
                  variant="contained"
                  disabled={submitting || !atwFile || !shipmentStepValid}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                  onClick={() => void finalizeBook()}
                >
                  {submitting ? 'Booking…' : 'Book ICS'}
                </Button>
              </Box>
            </Box>
          )}
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            position: { lg: 'sticky' },
            top: { lg: 88 },
          }}
        >
          <WithdrawalProgressChecklist items={progressItems} />
          <Box sx={{ mt: 2.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Destinations
            </Typography>
            <Autocomplete
              size="small"
              options={formConfig.destinations.map((d) => d.label)}
              freeSolo
              value={values.destination}
              onChange={(_, v) => setValues((prev) => ({ ...prev, destination: v ?? '' }))}
              onInputChange={(_, v) => setValues((prev) => ({ ...prev, destination: v }))}
              renderInput={(params) => <TextField {...params} label="Quick pick" />}
            />
          </Box>
          {values.shippingLineId !== '' && (
            <Box sx={{ mt: 2 }}>
              <Chip
                size="small"
                label={`Default validity: ${
                  formConfig.shippingLineRules.find((r) => r.shippingLineId === values.shippingLineId)?.defaultValidityDays ?? 14
                } days`}
                sx={{ fontWeight: 600 }}
              />
            </Box>
          )}
        </Paper>
      </Box>

      <BulkContainerPasteDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onApply={(containerNos) => {
          setValues((prev) => ({
            ...prev,
            lines: [
              ...prev.lines.filter((l) => l.containerNo.trim()),
              ...containerNos.map((containerNo) => ({
                containerNo,
                containerSizeId: '' as const,
                containerTypeId: '' as const,
              })),
            ],
          }))
        }}
      />
    </Box>
  )
}
