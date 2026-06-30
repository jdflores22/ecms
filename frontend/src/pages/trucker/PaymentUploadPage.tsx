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
  Paper,
  Typography,
  useMediaQuery,
  useTheme,
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
  ICS_PRIMARY,
  InfoTile,
  TimezoneChip,
  hexToRgba,
  infoGridSx,
  sectionPaperSx,
} from '../../components/layout/DetailPagePrimitives'
import { LOGICTECK_QR } from '../../config/logicteckQr'
import { paymentApi, preAdviceApi, scheduleApi, type Payment, type PreAdvice, type Schedule } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { useAssetUrl } from '../../hooks/useAssetUrl'
import { formatDateTime, formatPeso, formatScheduleSlot } from '../../utils/datetime'
import { extractPaymentProofMetadata } from '../../utils/paymentProofOcr'
import {
  needsPaymentUpload,
  paymentStatusColor,
  paymentStatusLabel,
  resolvePaymentStatus,
  showPaymentStatus,
} from '../../utils/truckerPayment'

const primaryDark = ICS_PRIMARY

const panelHeaderSx = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 2,
  mb: 2,
  flexWrap: 'wrap',
  minWidth: 0,
}

const mobileAlertSx = {
  mb: 3,
  borderRadius: 2,
  '& .MuiAlert-message': {
    width: '100%',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
  },
}

const uploadDropzoneSx = {
  p: { xs: 2, sm: 3 },
  borderRadius: 2.5,
  border: '2px dashed',
  minWidth: 0,
  width: '100%',
  boxSizing: 'border-box',
  overflow: 'hidden',
  textAlign: 'center',
  transition: 'border-color 0.15s ease, background-color 0.15s ease',
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
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  '& .MuiButton-root': {
    width: { xs: '100%', sm: 'auto' },
    minWidth: { xs: 0, sm: 120 },
    maxWidth: '100%',
  },
}

const confirmDialogActionsSx = {
  px: 3,
  pb: { xs: 3, sm: 2 },
  pt: { xs: 1, sm: 0 },
  flexDirection: { xs: 'column-reverse', sm: 'row' },
  gap: 1,
  '& .MuiButton-root': {
    width: { xs: '100%', sm: 'auto' },
    minWidth: { xs: 0, sm: 120 },
    mx: { xs: 0, sm: undefined },
  },
}

export default function TruckerPaymentUploadPage() {
  const theme = useTheme()
  const confirmFullScreen = useMediaQuery(theme.breakpoints.down('sm'))
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
  const [configuredFee, setConfiguredFee] = useState<number | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const proofFileUrl = useAssetUrl(payment?.proofFile)

  const load = useCallback(() => {
    if (!scheduleId || user?.role !== 'Trucker') return
    setLoading(true)
    setError('')

    Promise.all([scheduleApi.get(scheduleId), paymentApi.mine(), paymentApi.getSettings()])
      .then(async ([scheduleRes, paymentsRes, settingsRes]) => {
        const item = scheduleRes.data
        const existing = paymentsRes.data.find((p) => p.scheduleId === item.id) ?? null
        setSchedule(item)
        setPayment(existing)
        setConfiguredFee(settingsRes.data.returnFeeAmount)

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

  const displayAmount = payment?.amount ?? configuredFee ?? 0

  const handleUpload = async () => {
    if (!schedule || !file) return
    setSubmitting(true)
    setActionError('')
    try {
      let metadata
      if (file.type.startsWith('image/')) {
        try {
          const extracted = await extractPaymentProofMetadata(file)
          metadata = {
            proofReferenceNo: extracted.referenceNo,
            proofTransactionAt: extracted.transactionAt,
          }
        } catch {
          /* upload without OCR metadata */
        }
      }
      await paymentApi.upload(schedule.id, file, metadata)
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
    if (!file) {
      setActionError('Please choose a proof file to upload.')
      return
    }
    if (displayAmount <= 0) {
      setActionError('Payment amount is not configured. Contact the administrator.')
      return
    }
    setConfirmOpen(true)
  }

  return (
    <Box sx={{ minWidth: 0, maxWidth: '100%', overflowX: 'hidden' }}>
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
                <Alert severity={contextualAlert.severity} sx={mobileAlertSx}>
                  {contextualAlert.message}
                </Alert>
              )}

              {actionError && !confirmOpen && (
                <Alert severity="error" sx={{ ...mobileAlertSx, mb: 3 }} onClose={() => setActionError('')}>
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
                  minWidth: 0,
                  width: '100%',
                }}
              >
                {/* Summary */}
                <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 0, overflow: 'hidden' }}>
                  <Box sx={panelHeaderSx}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
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
                      sx={{
                        fontWeight: 600,
                        flexShrink: 0,
                        alignSelf: { xs: 'stretch', sm: 'flex-start' },
                        width: { xs: '100%', sm: 'auto' },
                      }}
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
                <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 0, overflow: 'hidden' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {paymentUploadNeeded ? 'Upload payment proof' : 'Payment proof'}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2.5, overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                  >
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
                            src={proofFileUrl}
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
                      <Alert severity="info" sx={{ mb: 2, borderRadius: 2, '& .MuiAlert-message': { overflowWrap: 'anywhere', wordBreak: 'break-word' } }}>
                        Pay {formatPeso(displayAmount)} as the pre-forecasted fee set by the administrator. Upload your
                        proof below — you cannot change the fee amount here.
                      </Alert>

                      <Button
                        component="label"
                        fullWidth
                        sx={{
                          display: 'block',
                          p: 0,
                          mb: 2,
                          minWidth: 0,
                          maxWidth: '100%',
                          textTransform: 'none',
                          '&:hover': { bgcolor: 'transparent' },
                        }}
                      >
                        <Paper
                          elevation={0}
                          sx={{
                            ...uploadDropzoneSx,
                            borderColor: file ? primaryDark : 'divider',
                            bgcolor: file ? hexToRgba(primaryDark, 0.04) : hexToRgba(primaryDark, 0.02),
                            '&:hover': {
                              borderColor: primaryDark,
                              bgcolor: hexToRgba(primaryDark, 0.06),
                            },
                          }}
                        >
                          <CloudUploadOutlinedIcon
                            sx={{ fontSize: 40, color: file ? primaryDark : 'text.secondary', mb: 1 }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: file ? primaryDark : 'text.primary',
                              overflowWrap: 'anywhere',
                              wordBreak: 'break-all',
                              px: { xs: 0.5, sm: 1 },
                            }}
                          >
                            {file ? file.name : 'Choose proof file'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, px: 1 }}>
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
                          sx={{
                            fontWeight: 700,
                            borderRadius: 2,
                            px: { xs: 2, sm: 3 },
                            whiteSpace: 'normal',
                          }}
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
        fullScreen={confirmFullScreen}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {saveSuccess ? 'Proof submitted' : 'Confirm payment proof'}
        </DialogTitle>
        <DialogContent dividers={confirmFullScreen}>
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

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, overflowWrap: 'anywhere' }}>
                Please confirm the pre-forecasted fee and proof file below. The depot will review your upload before
                confirming your return.
              </Typography>

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 2,
                  borderRadius: 2,
                  textAlign: 'center',
                  bgcolor: hexToRgba(primaryDark, 0.04),
                  border: '1px solid',
                  borderColor: hexToRgba(primaryDark, 0.12),
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                  Pre-advised fee
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: primaryDark, mt: 0.5 }}>
                  {formatPeso(displayAmount)}
                </Typography>
              </Paper>

              {actionError && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                  {actionError}
                </Alert>
              )}

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'auto 1fr' },
                  gap: 1,
                  rowGap: 1.25,
                  typography: 'body2',
                }}
              >
                <Typography color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  Proof file
                </Typography>
                <Box sx={{ gridColumn: { xs: '1', sm: 'auto / span 2' } }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'block', sm: 'none' }, mb: 0.5 }}>
                    Proof file
                  </Typography>
                  <Typography sx={{ fontWeight: 600, wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                    {file?.name ?? '—'}
                  </Typography>
                </Box>
                {schedule?.date && (
                  <>
                    <Typography color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                      Return slot
                    </Typography>
                    <Box sx={{ gridColumn: { xs: '1', sm: 'auto / span 2' } }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'block', sm: 'none' }, mb: 0.5 }}>
                        Return slot
                      </Typography>
                      <Typography sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
                        {formatScheduleSlot(schedule.date, schedule.time)}
                      </Typography>
                    </Box>
                  </>
                )}
              </Box>
            </>
          )}
        </DialogContent>
        {!submitting && !saveSuccess && (
          <DialogActions sx={confirmDialogActionsSx}>
            <Button onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => void handleUpload()}
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
                  src={proofFileUrl}
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
                  href={proofFileUrl}
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
              href={proofFileUrl}
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
