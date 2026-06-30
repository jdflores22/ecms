import DownloadIcon from '@mui/icons-material/Download'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import PrintIcon from '@mui/icons-material/Print'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Typography,
} from '@mui/material'
import { LOGICTECK_QR, qrLookupStatusColor, qrLookupStatusLabel } from '../../config/logicteckQr'
import type { Payment, QrBooking, Schedule } from '../../services/api'
import { useAssetUrl } from '../../hooks/useAssetUrl'
import { formatDateTime, formatPeso, formatScheduleSlot } from '../../utils/datetime'
import { paymentStatusColor, paymentStatusLabel } from '../../utils/truckerPayment'
import { ICS_PRIMARY, InfoTile, hexToRgba, infoGridSx } from '../layout/DetailPagePrimitives'

const primaryDark = ICS_PRIMARY

const depotPaymentStatusLabel: Record<string, string> = {
  ...paymentStatusLabel,
  Paid: 'Verified',
  ForVerification: 'For verification',
}

type BookingQrPreviewDialogProps = {
  open: boolean
  onClose: () => void
  schedule: Schedule | null
  qrBooking: QrBooking | null
  qrImageUrl: string | null
  payment?: Payment | null
  onDownload?: () => void
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
  payment,
  onDownload,
  onPrint,
  onBookLogicteck,
  bookLogicteckLoading = false,
  showPrint = false,
}: BookingQrPreviewDialogProps) {
  const proofFileUrl = useAssetUrl(payment?.proofFile)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{LOGICTECK_QR.sectionTitle}</DialogTitle>
      <DialogContent>
        {qrBooking && schedule ? (
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
                {schedule.referenceNo}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {qrBooking.payload.containerNo} · {qrBooking.payload.depot}
              </Typography>
            </Paper>

            {qrImageUrl ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <Box
                  component="img"
                  src={qrImageUrl}
                  alt={`QR code ${qrBooking.qrCode}`}
                  sx={{
                    width: '100%',
                    maxWidth: 280,
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
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4, mb: 2 }}>
                <CircularProgress sx={{ color: primaryDark }} />
              </Box>
            )}

            <Box sx={infoGridSx}>
              <InfoTile label={LOGICTECK_QR.bookingIdLabel} value={qrBooking.qrCode} mono />
              <InfoTile label="Generated" value={formatDateTime(qrBooking.generatedAt)} />
              <InfoTile label="Container" value={qrBooking.payload.containerNo} mono />
              <InfoTile
                label="Return slot"
                value={formatScheduleSlot(qrBooking.payload.scheduleDate, qrBooking.payload.scheduleTime)}
              />
              <InfoTile label="Depot" value={qrBooking.payload.depot} />
              <InfoTile label="Trucker" value={qrBooking.payload.trucker} />
              <InfoTile
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

            {payment && (
              <>
                <Divider sx={{ my: 2.5 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <PaymentsOutlinedIcon sx={{ fontSize: 20, color: primaryDark }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Payment
                  </Typography>
                </Box>
                <Box sx={infoGridSx}>
                  <InfoTile label="Amount" value={formatPeso(payment.amount)} />
                  <InfoTile label="Trucker" value={payment.truckerName} />
                  <InfoTile
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
                  {payment.paidAt && (
                    <InfoTile label="Verified at" value={formatDateTime(payment.paidAt)} />
                  )}
                </Box>
                {payment.proofFile && isImageProof(payment.proofFile) && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                      Proof of payment
                    </Typography>
                    <Box
                      component="img"
                      src={proofFileUrl}
                      alt="Payment proof"
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
                )}
              </>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, lineHeight: 1.5 }}>
              {LOGICTECK_QR.integrationNote}
            </Typography>
          </>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onClose}>Close</Button>
        {qrBooking && onDownload && (
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={onDownload}
            sx={{ fontWeight: 600, borderRadius: 2 }}
          >
            Download
          </Button>
        )}
        {qrBooking && onBookLogicteck && (
          <Button
            variant="outlined"
            onClick={onBookLogicteck}
            disabled={bookLogicteckLoading}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {bookLogicteckLoading ? 'Sending…' : LOGICTECK_QR.bookLogicteck}
          </Button>
        )}
        {qrBooking && showPrint && onPrint && (
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={onPrint}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Print pass
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
