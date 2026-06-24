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
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink, Navigate, useNavigate, useParams } from 'react-router-dom'
import PaymentProgressStrip, { buildPaymentProgressSteps } from '../../components/trucker/PaymentProgressStrip'
import {
  DetailBackButton,
  DetailErrorState,
  DetailHero,
  DetailHeroAside,
  DetailLoadingState,
  ECMS_PRIMARY,
  InfoTile,
  TimezoneChip,
  hexToRgba,
  infoGridSx,
  sectionPaperSx,
} from '../../components/layout/DetailPagePrimitives'
import { LOGICTECK_QR } from '../../config/logicteckQr'
import { paymentApi, preAdviceApi, scheduleApi, type Payment, type PreAdvice, type Schedule } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { formatDateTime, formatPeso, formatScheduleSlot } from '../../utils/datetime'
import {
  needsPaymentUpload,
  paymentStatusColor,
  paymentStatusLabel,
  resolvePaymentStatus,
  showPaymentStatus,
} from '../../utils/truckerPayment'

const primaryDark = ECMS_PRIMARY
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

const panelHeaderSx = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 2,
  mb: 2,
  flexWrap: 'wrap',
}

function heroPaymentChipStyle(status: string): { bgcolor: string; color: string } {
  switch (status) {
    case 'Pending':
      return { bgcolor: 'rgba(237, 108, 2, 0.92)', color: '#fff' }
    case 'ForVerification':
      return { bgcolor: 'rgba(2, 136, 209, 0.92)', color: '#fff' }
    case 'Paid':
      return { bgcolor: 'rgba(46, 125, 50, 0.92)', color: '#fff' }
    case 'Rejected':
      return { bgcolor: 'rgba(198, 40, 40, 0.92)', color: '#fff' }
    default:
      return { bgcolor: 'rgba(255,255,255,0.18)', color: '#fff' }
  }
}

function isImageProof(path: string) {
  return /\.(jpe?g|png|gif|webp|bmp)$/i.test(path)
}

function isPdfProof(path: string) {
  return /\.pdf$/i.test(path)
}

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

function statusAlert(
  paymentStatus: string,
  paymentUploadNeeded: boolean,
  scheduleStatus: string,
): { severity: 'warning' | 'info' | 'error' | 'success'; message: string } | null {
  if (paymentUploadNeeded && paymentStatus === 'Pending') {
    return {
      severity: 'warning',
      message: 'Payment proof is required. Upload your proof in the panel on the right.',
    }
  }
  if (paymentStatus === 'ForVerification') {
    return { severity: 'info', message: 'Payment proof submitted and awaiting depot verification.' }
  }
  if (paymentStatus === 'Rejected' && scheduleStatus === 'Scheduled') {
    return { severity: 'error', message: 'Your payment proof was rejected. Upload a new proof below.' }
  }
  if (paymentStatus === 'Paid') {
    return {
      severity: 'success',
      message: `Payment verified. ${LOGICTECK_QR.integrationComingSoon}.`,
    }
  }
  return null
}

const formActionRowSx = {
  display: 'flex',
  flexDirection: { xs: 'column-reverse', sm: 'row' },
  justifyContent: { xs: 'stretch', sm: 'flex-end' },
  gap: 1,
  pt: 1,
  '& .MuiButton-root': {
    width: { xs: '100%', sm: 'auto' },
    minWidth: { xs: 'unset', sm: 120 },
  },
}

export default function TruckerPaymentUploadPage() {
  const { scheduleId: scheduleIdParam } = useParams()
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const scheduleId = Number(scheduleIdParam)

  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [preAdvice, setPreAdvice] = useState<PreAdvice | null>(null)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [proofPreviewOpen, setProofPreviewOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  const [amount, setAmount] = useState('5000')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const load = useCallback(() => {
    if (!scheduleId || user?.role !== 'Trucker') return
    setLoading(true)
    setError('')

    Promise.all([scheduleApi.get(scheduleId), paymentApi.mine()])
      .then(async ([scheduleRes, paymentsRes]) => {
        const item = scheduleRes.data
        const existing = paymentsRes.data.find((p) => p.scheduleId === item.id) ?? null
        setSchedule(item)
        setPayment(existing)
        setAmount(String(existing?.amount ?? 5000))

        const preAdviceRes = await preAdviceApi.get(item.preAdviceId)
        setPreAdvice(preAdviceRes.data)
      })
      .catch(() => setError('Payment request not found or not assigned to you.'))
      .finally(() => setLoading(false))
  }, [scheduleId, user?.role])

  useEffect(() => {
    load()
  }, [load])

  if (user?.role !== 'Trucker') {
    return <Navigate to="/" replace />
  }

  if (!scheduleId || Number.isNaN(scheduleId)) {
    return <Navigate to="/trucker/payments" replace />
  }

  const paymentStatus = schedule ? resolvePaymentStatus(schedule, payment) : 'Pending'
  const paymentUploadNeeded = schedule ? needsPaymentUpload(schedule, payment) : false
  const paymentVisible = schedule ? showPaymentStatus(schedule, payment) : false

  const showPaymentContent =
    paymentVisible &&
    (paymentUploadNeeded ||
      Boolean(
        payment &&
          (payment.proofFile ||
            payment.status === 'ForVerification' ||
            payment.status === 'Paid' ||
            payment.status === 'Rejected'),
      ))

  const progressSteps = buildPaymentProgressSteps(
    paymentStatus,
    Boolean(payment?.proofFile || file),
    paymentUploadNeeded,
  )

  const contextualAlert =
    schedule && showPaymentContent ? statusAlert(paymentStatus, paymentUploadNeeded, schedule.status) : null

  const displayAmount = payment?.amount ?? Number(amount)

  const handleUpload = async () => {
    if (!schedule || !file) return
    setSubmitting(true)
    setActionError('')
    try {
      await paymentApi.upload(schedule.id, Number(amount), file)
      setFile(null)
      setSaveSuccess(true)
      window.setTimeout(() => {
        navigate('/trucker/payments', {
          state: {
            message: `Payment proof for ${schedule.referenceNo} submitted. Depot will verify your upload.`,
          },
        })
      }, 1500)
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Upload failed. Check file and try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  const openConfirm = () => {
    setActionError('')
    setSaveSuccess(false)
    if (!amount || Number(amount) <= 0) {
      setActionError('Please enter a valid payment amount.')
      return
    }
    if (!file) {
      setActionError('Please choose a proof file to upload.')
      return
    }
    setConfirmOpen(true)
  }

  return (
    <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
      <DetailBackButton to="/trucker/payments" label="Back to payments" />

      {loading ? (
        <DetailLoadingState />
      ) : error ? (
        <DetailErrorState message={error} />
      ) : schedule && preAdvice ? (
        <>
          <DetailHero
            icon={<PaymentsOutlinedIcon />}
            title={`Payment — ${schedule.referenceNo}`}
            subtitle={
              <>
                {preAdvice.containerNo} · {schedule.depotName}
              </>
            }
            chips={
              <>
                {paymentVisible && (
                  <Chip
                    label={paymentStatusLabel[paymentStatus] ?? paymentStatus}
                    size="small"
                    sx={{ fontWeight: 700, ...heroPaymentChipStyle(paymentStatus) }}
                  />
                )}
                <TimezoneChip />
              </>
            }
            aside={
              schedule.date ? (
                <DetailHeroAside
                  label="Return slot"
                  primary={formatScheduleSlot(schedule.date, schedule.time)}
                  secondary={schedule.slotNo > 0 ? `Slot ${schedule.slotNo}` : undefined}
                />
              ) : undefined
            }
          />

          {showPaymentContent ? (
            <>
              {contextualAlert && (
                <Alert severity={contextualAlert.severity} sx={{ mb: 3, borderRadius: 2 }}>
                  {contextualAlert.message}
                </Alert>
              )}

              {actionError && !confirmOpen && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setActionError('')}>
                  {actionError}
                </Alert>
              )}

              <PaymentProgressStrip steps={progressSteps} />

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', lg: '5fr 7fr' },
                  gap: 3,
                  alignItems: 'start',
                }}
              >
                {/* Summary */}
                <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 0 }}>
                  <Box sx={panelHeaderSx}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Payment summary
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        Return context for this payment
                      </Typography>
                    </Box>
                    <Button
                      component={RouterLink}
                      to={`/trucker/returns/${schedule.id}`}
                      size="small"
                      variant="text"
                      endIcon={<OpenInNewIcon />}
                      sx={{ fontWeight: 600, flexShrink: 0 }}
                    >
                      Return details
                    </Button>
                  </Box>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      mb: 2,
                      borderRadius: 2.5,
                      textAlign: 'center',
                      bgcolor: hexToRgba(primaryDark, 0.04),
                      border: '1px solid',
                      borderColor: hexToRgba(primaryDark, 0.12),
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}
                    >
                      {paymentUploadNeeded ? 'Amount to pay' : 'Amount paid'}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: primaryDark, mt: 0.5 }}>
                      {formatPeso(displayAmount)}
                    </Typography>
                    <Chip
                      label={paymentStatusLabel[paymentStatus] ?? paymentStatus}
                      size="small"
                      color={paymentStatusColor[paymentStatus] ?? 'default'}
                      sx={{ fontWeight: 600, mt: 1.5 }}
                    />
                  </Paper>

                  <Box sx={infoGridSx}>
                    <InfoTile label="Reference" value={schedule.referenceNo} mono />
                    <InfoTile label="Container" value={preAdvice.containerNo} mono />
                    <InfoTile label="Depot (CY)" value={schedule.depotName} />
                    {schedule.date && (
                      <InfoTile label="Return slot" value={formatScheduleSlot(schedule.date, schedule.time)} />
                    )}
                    {payment?.paidAt && (
                      <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                        <InfoTile label="Last uploaded" value={formatDateTime(payment.paidAt)} />
                      </Box>
                    )}
                  </Box>
                </Paper>

                {/* Proof / Upload */}
                <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {paymentUploadNeeded ? 'Upload payment proof' : 'Payment proof'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                    {paymentUploadNeeded
                      ? 'Attach a clear image or PDF of your payment receipt for depot verification.'
                      : 'Your submitted proof of payment for this return.'}
                  </Typography>

                  {payment?.proofFile && (
                    <Box sx={{ mb: paymentUploadNeeded ? 3 : 0 }}>
                      {isImageProof(payment.proofFile) ? (
                        <Box
                          component="button"
                          type="button"
                          onClick={() => setProofPreviewOpen(true)}
                          sx={{
                            display: 'block',
                            width: '100%',
                            p: 0,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2.5,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            bgcolor: '#fafafa',
                            transition: 'box-shadow 0.15s ease',
                            '&:hover': { boxShadow: '0 4px 16px rgba(11, 61, 145, 0.12)' },
                          }}
                        >
                          <Box
                            component="img"
                            src={payment.proofFile}
                            alt="Payment proof"
                            sx={{
                              width: '100%',
                              maxHeight: 360,
                              objectFit: 'contain',
                              display: 'block',
                            }}
                          />
                        </Box>
                      ) : (
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2.5,
                            borderRadius: 2.5,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: hexToRgba(primaryDark, 0.02),
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            flexWrap: 'wrap',
                          }}
                        >
                          <PictureAsPdfOutlinedIcon sx={{ fontSize: 48, color: primaryDark }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {isPdfProof(payment.proofFile) ? 'PDF proof file' : 'Proof file'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Tap to open and review your uploaded proof.
                            </Typography>
                          </Box>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<VisibilityOutlinedIcon />}
                            onClick={() => setProofPreviewOpen(true)}
                            sx={{ fontWeight: 600, borderRadius: 2 }}
                          >
                            View proof
                          </Button>
                        </Paper>
                      )}
                    </Box>
                  )}

                  {paymentUploadNeeded && (
                    <>
                      <TextField
                        fullWidth
                        label="Amount (PHP)"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        sx={{ ...fieldSx, mb: 2 }}
                        slotProps={{
                          input: {
                            startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                          },
                        }}
                      />

                      <Button
                        component="label"
                        fullWidth
                        sx={{
                          display: 'block',
                          p: 0,
                          mb: 2,
                          textTransform: 'none',
                          '&:hover': { bgcolor: 'transparent' },
                        }}
                      >
                        <Paper
                          elevation={0}
                          sx={{
                            p: 3,
                            borderRadius: 2.5,
                            border: '2px dashed',
                            borderColor: file ? primaryDark : 'divider',
                            bgcolor: file ? hexToRgba(primaryDark, 0.04) : hexToRgba(primaryDark, 0.02),
                            textAlign: 'center',
                            transition: 'border-color 0.15s ease, background-color 0.15s ease',
                            '&:hover': {
                              borderColor: primaryDark,
                              bgcolor: hexToRgba(primaryDark, 0.06),
                            },
                          }}
                        >
                          <CloudUploadOutlinedIcon
                            sx={{ fontSize: 40, color: file ? primaryDark : 'text.secondary', mb: 1 }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 700, color: file ? primaryDark : 'text.primary' }}>
                            {file ? file.name : 'Choose proof file'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            Image or PDF · max recommended 10 MB
                          </Typography>
                        </Paper>
                        <input
                          type="file"
                          hidden
                          accept="image/*,.pdf"
                          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        />
                      </Button>

                      <Box sx={formActionRowSx}>
                        <Button onClick={() => navigate('/trucker/payments')} disabled={submitting} sx={{ fontWeight: 600 }}>
                          Cancel
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={<UploadFileIcon sx={{ display: { xs: 'none', sm: 'inline-flex' } }} />}
                          onClick={openConfirm}
                          disabled={submitting || !file}
                          sx={{ fontWeight: 700, borderRadius: 2, px: 3 }}
                        >
                          Submit proof
                        </Button>
                      </Box>
                    </>
                  )}

                  {!paymentUploadNeeded && !payment?.proofFile && (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        borderRadius: 2.5,
                        bgcolor: hexToRgba(primaryDark, 0.03),
                        border: '1px solid',
                        borderColor: hexToRgba(primaryDark, 0.1),
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        No proof file on record yet. Check back after you submit payment.
                      </Typography>
                    </Paper>
                  )}
                </Paper>
              </Box>
            </>
          ) : (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Payment is not required for this return yet.{' '}
              <Button
                component={RouterLink}
                to={`/trucker/returns/${schedule.id}`}
                size="small"
                sx={{ fontWeight: 600, ml: 0.5 }}
              >
                View return details
              </Button>
            </Alert>
          )}
        </>
      ) : null}

      <Dialog
        open={confirmOpen}
        onClose={() => !submitting && !saveSuccess && setConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {saveSuccess ? 'Proof submitted' : 'Confirm payment proof'}
        </DialogTitle>
        <DialogContent>
          {submitting ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
              <CircularProgress size={40} sx={{ color: primaryDark }} />
              <Typography color="text.secondary" align="center">
                Uploading payment proof…
              </Typography>
            </Box>
          ) : saveSuccess ? (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              Payment proof submitted successfully. Depot will verify your upload. Returning to payments…
            </Alert>
          ) : (
            <>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  mb: 2,
                  borderRadius: 2,
                  bgcolor: hexToRgba(primaryDark, 0.04),
                  border: '1px solid',
                  borderColor: hexToRgba(primaryDark, 0.1),
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {schedule?.referenceNo}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {preAdvice?.containerNo} · {schedule?.depotName}
                </Typography>
              </Paper>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Please confirm the payment details below. The depot will review your proof before confirming your
                return.
              </Typography>

              {actionError && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                  {actionError}
                </Alert>
              )}

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  gap: 1,
                  rowGap: 1.25,
                  typography: 'body2',
                }}
              >
                <Typography color="text.secondary">Amount</Typography>
                <Typography sx={{ fontWeight: 600 }}>{formatPeso(Number(amount))}</Typography>
                <Typography color="text.secondary">Proof file</Typography>
                <Typography sx={{ fontWeight: 600, wordBreak: 'break-all' }}>{file?.name ?? '—'}</Typography>
                {schedule?.date && (
                  <>
                    <Typography color="text.secondary">Return slot</Typography>
                    <Typography sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
                      {formatScheduleSlot(schedule.date, schedule.time)}
                    </Typography>
                  </>
                )}
              </Box>
            </>
          )}
        </DialogContent>
        {!submitting && !saveSuccess && (
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={submitting}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              Confirm & submit
            </Button>
          </DialogActions>
        )}
      </Dialog>

      <Dialog open={proofPreviewOpen} onClose={() => setProofPreviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Payment proof</DialogTitle>
        <DialogContent>
          {payment?.proofFile && (
            <>
              {isImageProof(payment.proofFile) ? (
                <Box
                  component="img"
                  src={payment.proofFile}
                  alt="Payment proof"
                  sx={{
                    width: '100%',
                    maxHeight: 480,
                    objectFit: 'contain',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: '#fafafa',
                  }}
                />
              ) : (
                <Button
                  variant="outlined"
                  href={payment.proofFile}
                  target="_blank"
                  rel="noreferrer"
                  endIcon={<OpenInNewIcon />}
                  sx={{ fontWeight: 600, borderRadius: 2 }}
                >
                  Open proof file
                </Button>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setProofPreviewOpen(false)}>Close</Button>
          {payment?.proofFile && (
            <Button
              variant="contained"
              href={payment.proofFile}
              target="_blank"
              rel="noreferrer"
              endIcon={<OpenInNewIcon />}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              Open in new tab
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}
