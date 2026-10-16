import DownloadIcon from '@mui/icons-material/Download'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import PrintIcon from '@mui/icons-material/Print'
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import { type ReactNode, useEffect, useState } from 'react'
import { confirmedPreForecastCopy } from '../../config/confirmedPreForecast'
import { LOGICTECK_QR, qrLookupStatusColor, qrLookupStatusLabel } from '../../config/logicteckQr'
import type { Payment, PreAdvice, QrBooking, Schedule } from '../../services/api'
import { formatDateTime, formatPeso, formatScheduleSlot } from '../../utils/datetime'
import { paymentStatusColor, paymentStatusLabel } from '../../utils/truckerPayment'
import { qrPassContainerHeadline, qrPassPreForecastReference } from '../../utils/qrPassDisplay'
import { isScheduleDetailsVisible } from '../../utils/truckerSchedule'
import PreAdviceBackToBackChip from '../preAdvice/PreAdviceBackToBackChip'
import { ICS_PRIMARY, hexToRgba } from '../layout/DetailPagePrimitives'
import { QrImageSkeleton } from '../layout/SkeletonPrimitives'
import AssetImage from '../layout/AssetImage'

const primaryDark = ICS_PRIMARY

const depotPaymentStatusLabel: Record<string, string> = {
  ...paymentStatusLabel,
  Paid: 'Verified',
  ForVerification: 'For verification',
}

const detailGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: { xs: 1.5, sm: 2 },
  columnGap: { xs: 1.5, sm: 3 },
  alignItems: 'start',
} as const

function DetailGridField({
  label,
  value,
  mono,
  span = 1,
}: {
  label: string
  value: ReactNode
  mono?: boolean
  span?: 1 | 2
}) {
  return (
    <Box sx={{ gridColumn: span === 2 ? { xs: '1', sm: '1 / -1' } : undefined, minWidth: 0 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}
      >
        {label}
      </Typography>
      <Typography
        component="div"
        variant="body2"
        sx={{
          mt: 0.5,
          fontWeight: 600,
          wordBreak: 'break-word',
          ...(mono && { fontFamily: 'monospace', fontSize: '0.875rem' }),
        }}
      >
        {value}
      </Typography>
    </Box>
  )
}

type BookingQrPreviewDialogProps = {
  open: boolean
  onClose: () => void
  schedule: Schedule | null
  qrBooking: QrBooking | null
  qrImageUrl: string | null
  preAdvice?: PreAdvice | null
  payment?: Payment | null
  onDownload?: () => void
  onDownloadConfirmationPdf?: () => void
  onPrint?: () => void
  onBookLogicteck?: () => void
  bookLogicteckLoading?: boolean
  showPrint?: boolean
}

function isImageProof(path: string) {
  return /\.(jpe?g|png|gif|webp|bmp)$/i.test(path)
}

export default function BookingQrPreviewDialog({
  open,
  onClose,
  schedule,
  qrBooking,
  qrImageUrl,
  preAdvice,
  payment,
  onDownload,
  onDownloadConfirmationPdf,
  onPrint,
  onBookLogicteck,
  bookLogicteckLoading = false,
  showPrint = false,
}: BookingQrPreviewDialogProps) {
  const [tab, setTab] = useState<'details' | 'downloads'>('details')

  useEffect(() => {
    if (open) setTab('details')
  }, [open, qrBooking?.id])

  const showSlotDetails = schedule ? isScheduleDetailsVisible(schedule) : true
  const containerHeadline = qrPassContainerHeadline(preAdvice, qrBooking, schedule?.referenceNo)
  const preForecastRef = qrPassPreForecastReference(preAdvice, qrBooking)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{LOGICTECK_QR.sectionTitle}</DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        {qrBooking && schedule ? (
          <>
            <Tabs
              value={tab}
              onChange={(_, value) => setTab(value)}
              variant="fullWidth"
              sx={{
                mb: 2,
                minHeight: 40,
                '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', minHeight: 44 },
              }}
            >
              <Tab value="details" label="Details" />
              <Tab value="downloads" label="Generated pre-forecast" />
            </Tabs>

            {tab === 'details' ? (
              <>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {containerHeadline}
                  </Typography>
                  {preAdvice ? <PreAdviceBackToBackChip item={preAdvice} /> : null}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {confirmedPreForecastCopy.label} {preForecastRef}
                  {showSlotDetails ? ` · ${qrBooking.payload.depot}` : ''}
                </Typography>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: hexToRgba(primaryDark, 0.02),
                  }}
                >
                  <Box sx={detailGridSx}>
                    <DetailGridField label="Container" value={qrBooking.payload.containerNo} mono />
                    <DetailGridField label={LOGICTECK_QR.bookingIdLabel} value={qrBooking.qrCode} mono />
                    <DetailGridField label="Generated" value={formatDateTime(qrBooking.generatedAt)} />
                    {showSlotDetails ? (
                      <DetailGridField
                        label="Return slot"
                        value={formatScheduleSlot(qrBooking.payload.scheduleDate, qrBooking.payload.scheduleTime)}
                      />
                    ) : null}
                    {showSlotDetails ? (
                      <DetailGridField label="Depot" value={qrBooking.payload.depot} />
                    ) : null}
                    <DetailGridField label="Trucker" value={qrBooking.payload.trucker} />
                    <DetailGridField
                      label={LOGICTECK_QR.validationStatusLabel}
                      value={
                        <Chip
                          label={qrLookupStatusLabel(qrBooking)}
                          size="small"
                          color={qrLookupStatusColor(qrLookupStatusLabel(qrBooking))}
                          sx={{ fontWeight: 600 }}
                        />
                      }
                    />
                  </Box>

                  {payment ? (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <PaymentsOutlinedIcon sx={{ fontSize: 20, color: primaryDark }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Payment</Typography>
                      </Box>
                      <Box sx={detailGridSx}>
                        <DetailGridField label="Amount" value={formatPeso(payment.amount)} />
                        <DetailGridField label="Trucker" value={payment.truckerName} />
                        <DetailGridField
                          label="Status"
                          value={
                            <Chip
                              label={depotPaymentStatusLabel[payment.status] ?? payment.status}
                              size="small"
                              color={paymentStatusColor[payment.status] ?? 'default'}
                              sx={{ fontWeight: 600 }}
                            />
                          }
                        />
                        {payment.paidAt ? (
                          <DetailGridField label="Verified at" value={formatDateTime(payment.paidAt)} />
                        ) : null}
                      </Box>
                      {payment.proofFile && isImageProof(payment.proofFile) ? (
                        <Box sx={{ mt: 2 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontWeight: 600, display: 'block', mb: 1 }}
                          >
                            Proof of payment
                          </Typography>
                          <AssetImage
                            path={payment.proofFile}
                            alt="Payment proof"
                            skeletonHeight={160}
                            skeletonMaxHeight={200}
                            sx={{
                              width: '100%',
                              maxWidth: 320,
                              maxHeight: 200,
                              objectFit: 'contain',
                              borderRadius: 2,
                              border: '1px solid',
                              borderColor: 'divider',
                              bgcolor: '#fafafa',
                            }}
                          />
                        </Box>
                      ) : null}
                    </>
                  ) : null}
                </Paper>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, lineHeight: 1.5 }}>
                  {LOGICTECK_QR.integrationNote}
                </Typography>
              </>
            ) : (
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Download files
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {confirmedPreForecastCopy.pdfSubtitle}. Use the same ICS reference for LOGICTECK and depot gate-in.
                </Typography>

                {qrImageUrl ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
                    <Box
                      component="img"
                      src={qrImageUrl}
                      alt={`QR code ${qrBooking.qrCode}`}
                      sx={{
                        width: '100%',
                        maxWidth: 240,
                        height: 'auto',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: '#fff',
                        p: 1.5,
                      }}
                    />
                  </Box>
                ) : (
                  <QrImageSkeleton />
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  {onDownload ? (
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<QrCode2OutlinedIcon />}
                      onClick={onDownload}
                      sx={{ fontWeight: 600, borderRadius: 2, justifyContent: 'flex-start', py: 1.25 }}
                    >
                      Download QR image
                    </Button>
                  ) : null}
                  {onDownloadConfirmationPdf ? (
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<PictureAsPdfOutlinedIcon />}
                      onClick={onDownloadConfirmationPdf}
                      sx={{ fontWeight: 600, borderRadius: 2, justifyContent: 'flex-start', py: 1.25 }}
                    >
                      {confirmedPreForecastCopy.pdfTitle}
                    </Button>
                  ) : null}
                  {showPrint && onPrint ? (
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<PrintIcon />}
                      onClick={onPrint}
                      sx={{ fontWeight: 700, borderRadius: 2, justifyContent: 'flex-start', py: 1.25 }}
                    >
                      Print QR pass
                    </Button>
                  ) : null}
                </Box>
              </Paper>
            )}
          </>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onClose}>Close</Button>
        {tab === 'downloads' && onDownload ? (
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={onDownload}
            sx={{ fontWeight: 600, borderRadius: 2 }}
          >
            Download QR
          </Button>
        ) : null}
        {qrBooking && onBookLogicteck ? (
          <Button
            variant="contained"
            onClick={onBookLogicteck}
            disabled={bookLogicteckLoading}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {bookLogicteckLoading ? LOGICTECK_QR.openLogicteckLoading : LOGICTECK_QR.openLogicteckConfirm}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  )
}
