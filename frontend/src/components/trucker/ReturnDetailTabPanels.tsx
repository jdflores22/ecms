import DownloadIcon from '@mui/icons-material/Download'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import PrintIcon from '@mui/icons-material/Print'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { Box, Button, Chip, CircularProgress, Paper, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import ContainerIdentityPhotos from '../preAdvice/ContainerIdentityPhotos'
import {
  DetailTabPanel,
  ICS_PRIMARY,
  InfoTile,
  hexToRgba,
  infoGridSx,
} from '../layout/DetailPagePrimitives'
import { LOGICTECK_QR, qrLookupStatusColor, qrLookupStatusLabel } from '../../config/logicteckQr'
import type { Payment, PreAdvice, PreAdviceDocument, QrBooking, Schedule } from '../../services/api'
import { useAssetUrl } from '../../hooks/useAssetUrl'
import { formatDateTime, formatPeso, formatScheduleSlot } from '../../utils/datetime'
import {
  paymentStatusColor,
  paymentStatusLabel,
  truckerPaymentPath,
} from '../../utils/truckerPayment'

const primaryDark = ICS_PRIMARY

const qrDetailActionsSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  mt: 2,
}

const qrDetailButtonSx = {
  fontWeight: 600,
  borderRadius: 2,
  textTransform: 'none',
  py: 0.875,
}

export type ReturnDetailTab = 'details' | 'photos' | 'payment' | 'qr'

function isImageProof(path: string) {
  return /\.(jpe?g|png|gif|webp|bmp)$/i.test(path)
}

function isPdfProof(path: string) {
  return /\.pdf$/i.test(path)
}

type ReturnDetailTabPanelsProps = {
  activeTab: ReturnDetailTab
  schedule: Schedule
  preAdvice: PreAdvice
  payment: Payment | null
  documents: PreAdviceDocument[]
  documentsLoading: boolean
  paymentStatus: string
  paymentUploadNeeded: boolean
  showPaymentSection: boolean
  qrBooking: QrBooking | null
  qrImageUrl: string | null
  qrLoading: boolean
  onProofPreview: () => void
  onQrPreview: () => void
  onDownloadQr: () => void
  onPrintQr: (bookingId: number) => void
  onReloadDocuments: () => void
}

export default function ReturnDetailTabPanels({
  activeTab,
  schedule,
  preAdvice,
  payment,
  documents,
  documentsLoading,
  paymentStatus,
  paymentUploadNeeded,
  showPaymentSection,
  qrBooking,
  qrImageUrl,
  qrLoading,
  onProofPreview,
  onQrPreview,
  onDownloadQr,
  onPrintQr,
  onReloadDocuments,
}: ReturnDetailTabPanelsProps) {
  const proofFileUrl = useAssetUrl(payment?.proofFile)

  return (
    <Box sx={{ pt: { xs: 2, sm: 2.5 } }}>
      <DetailTabPanel value="details" activeTab={activeTab}>
        <Box sx={infoGridSx}>
          <InfoTile label="Trucker" value={preAdvice.truckerName} />
          <InfoTile label="Shipping line" value={preAdvice.shippingLineName} />
          <InfoTile
            label="Container"
            value={`${preAdvice.containerNo} (${preAdvice.containerSize}' ${preAdvice.containerType})`}
            mono
          />
          <InfoTile label="Depot (CY)" value={schedule.depotName} />
          {schedule.date && (
            <InfoTile label="Return schedule" value={formatScheduleSlot(schedule.date, schedule.time)} />
          )}
          {schedule.slotNo > 0 && <InfoTile label="Slot" value={`Slot ${schedule.slotNo}`} />}
          {schedule.truckerName && <InfoTile label="Trucker" value={schedule.truckerName} />}
          <InfoTile label="Submitted" value={formatDateTime(preAdvice.createdAt)} />
          <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
            <InfoTile label="Trucker remarks" value={preAdvice.remarks || '—'} />
          </Box>
          {schedule.depotRemarks && (
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
              <InfoTile label="Depot remarks" value={schedule.depotRemarks} />
            </Box>
          )}
        </Box>
      </DetailTabPanel>

      <DetailTabPanel value="photos" activeTab={activeTab}>
        <ContainerIdentityPhotos
          preAdviceId={preAdvice.id}
          documents={documents}
          loading={documentsLoading}
          canManage={false}
          onChange={onReloadDocuments}
        />
      </DetailTabPanel>

      <DetailTabPanel value="payment" activeTab={activeTab}>
        {showPaymentSection ? (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                component={RouterLink}
                to={truckerPaymentPath(schedule.id)}
                size="small"
                variant={paymentUploadNeeded ? 'contained' : 'outlined'}
                startIcon={paymentUploadNeeded ? <PaymentsOutlinedIcon /> : <OpenInNewIcon />}
                sx={{ fontWeight: 600, borderRadius: 2 }}
              >
                {paymentUploadNeeded ? 'Upload payment' : 'Open payment page'}
              </Button>
            </Box>

            <Box sx={{ ...infoGridSx, mb: payment?.proofFile ? { xs: 2, sm: 3 } : 0 }}>
              <InfoTile
                label="Status"
                value={
                  <Chip
                    label={paymentStatusLabel[paymentStatus] ?? paymentStatus}
                    size="small"
                    color={paymentStatusColor[paymentStatus] ?? 'default'}
                    sx={{ fontWeight: 600 }}
                  />
                }
              />
              <InfoTile label="Amount" value={payment ? formatPeso(payment.amount) : '—'} />
              {payment?.paidAt && <InfoTile label="Uploaded" value={formatDateTime(payment.paidAt)} />}
            </Box>

            {payment?.proofFile && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Proof of payment
                </Typography>
                {isImageProof(payment.proofFile) ? (
                  <Box
                    component="img"
                    src={proofFileUrl}
                    alt="Payment proof"
                    onClick={onProofPreview}
                    sx={{
                      width: '100%',
                      maxWidth: 420,
                      maxHeight: 320,
                      objectFit: 'contain',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: '#fafafa',
                      cursor: 'pointer',
                    }}
                  />
                ) : (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: hexToRgba(primaryDark, 0.02),
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      flexWrap: 'wrap',
                    }}
                  >
                    <PictureAsPdfOutlinedIcon sx={{ fontSize: 40, color: primaryDark }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {isPdfProof(payment.proofFile) ? 'PDF proof file' : 'Proof file'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Open to review your uploaded proof.
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<VisibilityOutlinedIcon />}
                      onClick={onProofPreview}
                      sx={{ fontWeight: 600, borderRadius: 2 }}
                    >
                      View proof
                    </Button>
                  </Paper>
                )}
              </Box>
            )}
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {schedule.status === 'WaitingSchedule'
              ? 'Payment will be required after the depot assigns your return slot.'
              : 'No payment action is needed for this return yet.'}
          </Typography>
        )}
      </DetailTabPanel>

      <DetailTabPanel value="qr" activeTab={activeTab}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            component={RouterLink}
            to="/trucker/qr"
            size="small"
            variant="outlined"
            endIcon={<OpenInNewIcon />}
            sx={{ fontWeight: 600, borderRadius: 2 }}
          >
            All QR codes
          </Button>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {LOGICTECK_QR.scheduleSectionHint}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, lineHeight: 1.5 }}>
          {LOGICTECK_QR.integrationNote}
        </Typography>

        {qrLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
            <CircularProgress size={24} sx={{ color: primaryDark }} />
            <Typography variant="body2" color="text.secondary">
              Loading QR code…
            </Typography>
          </Box>
        ) : qrBooking ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'auto 1fr' },
              gap: 2,
              alignItems: 'start',
            }}
          >
            {qrImageUrl && (
              <Box
                component="button"
                type="button"
                onClick={onQrPreview}
                sx={{
                  width: { xs: '100%', sm: 200 },
                  maxWidth: 200,
                  p: 0,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: '#fff',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s ease',
                  '&:hover': { boxShadow: '0 4px 16px rgba(11, 61, 145, 0.15)' },
                }}
              >
                <Box
                  component="img"
                  src={qrImageUrl}
                  alt={`QR code ${qrBooking.qrCode}`}
                  sx={{ width: '100%', height: 'auto', display: 'block', p: 1 }}
                />
              </Box>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Booking reference: {qrBooking.qrCode}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {qrBooking.payload.containerNo} · {qrBooking.payload.depot} ·{' '}
                {formatScheduleSlot(qrBooking.payload.scheduleDate, qrBooking.payload.scheduleTime)}
              </Typography>

              <Box sx={infoGridSx}>
                <InfoTile label="Generated" value={formatDateTime(qrBooking.generatedAt)} />
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

              <Box sx={qrDetailActionsSx}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<VisibilityOutlinedIcon />}
                  onClick={onQrPreview}
                  disabled={!qrImageUrl}
                  sx={{ ...qrDetailButtonSx, fontWeight: 700 }}
                >
                  View QR
                </Button>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={onDownloadQr}
                    sx={qrDetailButtonSx}
                  >
                    Download
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    size="small"
                    startIcon={<PrintIcon />}
                    onClick={() => onPrintQr(qrBooking.id)}
                    sx={qrDetailButtonSx}
                  >
                    Print
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: hexToRgba(primaryDark, 0.03),
              border: '1px solid',
              borderColor: hexToRgba(primaryDark, 0.1),
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: paymentUploadNeeded ? 2 : 0 }}>
              {LOGICTECK_QR.emptyState}
            </Typography>
            {paymentUploadNeeded && (
              <Button
                component={RouterLink}
                to={truckerPaymentPath(schedule.id)}
                size="small"
                variant="contained"
                startIcon={<PaymentsOutlinedIcon />}
                sx={{ fontWeight: 600, borderRadius: 2 }}
              >
                Upload payment
              </Button>
            )}
          </Box>
        )}
      </DetailTabPanel>
    </Box>
  )
}
