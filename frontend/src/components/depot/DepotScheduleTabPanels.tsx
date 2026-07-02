import DownloadIcon from '@mui/icons-material/Download'
import EditIcon from '@mui/icons-material/Edit'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import ContainerIdentityPhotos from '../preAdvice/ContainerIdentityPhotos'
import { useAssetUrl } from '../../hooks/useAssetUrl'
import { DetailTabPanel, ICS_PRIMARY, hexToRgba, infoGridSx } from '../layout/DetailPagePrimitives'
import { qrLookupStatusLabel } from '../../config/logicteckQr'
import type {
  Payment,
  PreAdvice,
  PreAdviceDocument,
  QrBooking,
  Schedule,
} from '../../services/api'
import {
  clampScheduleDateToBounds,
  formatDateTime,
  formatDepotScheduleAllowedRange,
  formatDepotScheduleDateHelper,
  formatPeso,
  formatScheduleDate,
  type DepotScheduleDateBounds,
} from '../../utils/datetime'
import { formatContainerSummary } from '../../utils/containerSize'
import { scheduleStatusLabel } from '../../utils/scheduleStatus'

const primaryDark = ICS_PRIMARY
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

export type DepotScheduleTab = 'details' | 'photos' | 'schedule' | 'payment' | 'qr'

const paymentStatusColor: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  Pending: 'warning',
  ForVerification: 'warning',
  Paid: 'success',
  Rejected: 'error',
}

const paymentStatusLabel: Record<string, string> = {
  ForVerification: 'For verification',
  Paid: 'Verified',
  Rejected: 'Rejected',
  Pending: 'Pending upload',
}

function InfoTile({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        height: '100%',
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: hexToRgba(primaryDark, 0.02),
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          mt: 0.75,
          fontWeight: 600,
          fontSize: '0.95rem',
          wordBreak: 'break-word',
          ...(mono && { fontFamily: 'monospace' }),
        }}
      >
        {value}
      </Typography>
    </Paper>
  )
}

function isImageProof(path: string) {
  return /\.(jpe?g|png|gif|webp|bmp)$/i.test(path)
}

function isPdfProof(path: string) {
  return /\.pdf$/i.test(path)
}

function requestingTruckerName(schedule: Schedule, preAdvice: PreAdvice) {
  return schedule.truckerName ?? preAdvice.truckerName
}

type DepotScheduleTabPanelsProps = {
  activeTab: DepotScheduleTab
  depotView?: boolean
  schedule: Schedule
  preAdvice: PreAdvice
  documents: PreAdviceDocument[]
  documentsLoading: boolean
  payment: Payment | null
  showPaymentSection: boolean
  canVerifyPayment: boolean
  qrBooking: QrBooking | null
  qrImageUrl: string | null
  qrLoading: boolean
  canAssign: boolean
  showAssignForm: boolean
  showScheduledSummary: boolean
  editing: boolean
  date: string
  depotRemarks: string
  scheduleDateBounds: DepotScheduleDateBounds
  actionError: string
  submitting: boolean
  onReloadDocuments: () => void
  onProofPreview: () => void
  onDownloadQr: () => void
  onEditSchedule: () => void
  onDateChange: (value: string) => void
  onDepotRemarksChange: (value: string) => void
  onCancelEdit: () => void
  onOpenConfirm: () => void
}

export default function DepotScheduleTabPanels({
  activeTab,
  depotView = false,
  schedule,
  preAdvice,
  documents,
  documentsLoading,
  payment,
  showPaymentSection,
  canVerifyPayment,
  qrBooking,
  qrImageUrl,
  qrLoading,
  canAssign,
  showAssignForm,
  showScheduledSummary,
  editing,
  date,
  depotRemarks,
  scheduleDateBounds,
  actionError,
  submitting,
  onReloadDocuments,
  onProofPreview,
  onDownloadQr,
  onEditSchedule,
  onDateChange,
  onDepotRemarksChange,
  onCancelEdit,
  onOpenConfirm,
}: DepotScheduleTabPanelsProps) {
  const truckerName = requestingTruckerName(schedule, preAdvice)
  const proofFileUrl = useAssetUrl(payment?.proofFile)

  return (
    <Box sx={{ pt: { xs: 2, sm: 2.5 } }}>
      <DetailTabPanel value="details" activeTab={activeTab}>
        <Box sx={infoGridSx}>
          <InfoTile label="Reference no." value={schedule.referenceNo} mono />
          <InfoTile label="Requesting trucker" value={truckerName} />
          <InfoTile label="Shipping line" value={preAdvice.shippingLineName} />
          <InfoTile
            label="Container"
            value={formatContainerSummary(
              preAdvice.containerNo,
              preAdvice.containerSize,
              preAdvice.containerType,
            )}
            mono
          />
          <InfoTile label="Depot (CY)" value={schedule.depotName} />
          {preAdvice.demurrageValidUntil && (
            <InfoTile
              label="Demurrage validity"
              value={`Until ${formatScheduleDate(preAdvice.demurrageValidUntil)}`}
            />
          )}
          {schedule.date && schedule.status !== 'WaitingSchedule' && (
            <InfoTile label="Return date" value={formatScheduleDate(schedule.date)} />
          )}
          <InfoTile
            label="Status"
            value={scheduleStatusLabel(schedule.status)}
          />
          <InfoTile label="Submitted" value={formatDateTime(preAdvice.createdAt)} />
          <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
            <InfoTile label="Trucker remarks" value={preAdvice.remarks || '—'} />
          </Box>
          {(schedule.depotRemarks || depotRemarks.trim()) && (
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
              <InfoTile
                label="Depot remarks"
                value={schedule.depotRemarks || depotRemarks.trim() || '—'}
              />
            </Box>
          )}
        </Box>
      </DetailTabPanel>

      {!depotView && (
        <DetailTabPanel value="photos" activeTab={activeTab}>
          <ContainerIdentityPhotos
            preAdviceId={preAdvice.id}
            documents={documents}
            loading={documentsLoading}
            canManage={false}
            onChange={onReloadDocuments}
          />
        </DetailTabPanel>
      )}

      <DetailTabPanel value="schedule" activeTab={activeTab}>
        {!canAssign ? (
          <Typography variant="body2" color="text.secondary">
            This return can no longer be assigned from the depot schedule view.
          </Typography>
        ) : (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: showScheduledSummary ? 2 : 0 }}>
              {showScheduledSummary && (
                <Button
                  startIcon={<EditIcon />}
                  variant="outlined"
                  onClick={onEditSchedule}
                  sx={{ fontWeight: 600, borderRadius: 2 }}
                >
                  Edit assignment
                </Button>
              )}
            </Box>

            {showScheduledSummary && (
              <Box sx={infoGridSx}>
                <InfoTile label="Return date" value={formatScheduleDate(schedule.date)} />
                <InfoTile label="Requesting trucker" value={truckerName} />
                <InfoTile label="Status" value={scheduleStatusLabel(schedule.status)} />
                {schedule.depotRemarks && (
                  <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                    <InfoTile label="Depot remarks" value={schedule.depotRemarks} />
                  </Box>
                )}
                {preAdvice.demurrageValidUntil && (
                  <InfoTile
                    label="Demurrage validity"
                    value={`Until ${formatScheduleDate(preAdvice.demurrageValidUntil)}`}
                  />
                )}
              </Box>
            )}

            {showAssignForm && (
              <>
                {actionError && (
                  <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                    {actionError}
                  </Alert>
                )}

                <Box sx={{ ...infoGridSx, mt: showScheduledSummary ? 2 : 0 }}>
                  <InfoTile
                    label="Demurrage validity"
                    value={
                      scheduleDateBounds.demurrageValidUntil
                        ? `Until ${formatScheduleDate(scheduleDateBounds.demurrageValidUntil)}`
                        : 'Not set'
                    }
                  />
                  <InfoTile
                    label="Allowed return dates"
                    value={formatDepotScheduleAllowedRange(scheduleDateBounds)}
                  />
                </Box>

                <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                  The trucker is fixed from the pre-forecast request ({truckerName}). Choose a return
                  date within demurrage validity
                  {scheduleDateBounds.demurrageValidUntil && (
                    <>
                      {' '}
                      (until <strong>{formatScheduleDate(scheduleDateBounds.demurrageValidUntil)}</strong>)
                    </>
                  )}
                  {' '}and the allowed range above.
                </Alert>

                {!scheduleDateBounds.hasValidWindow && (
                  <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                    {scheduleDateBounds.demurrageValidUntil
                      ? 'Demurrage validity has expired or no dates remain in the allowed window. Contact the shipping line evaluator.'
                      : 'Demurrage validity is not set. Contact the shipping line evaluator before assigning a return date.'}
                  </Alert>
                )}

                <Box sx={{ ...infoGridSx, mt: 2 }}>
                  <TextField
                    fullWidth
                    label="Return date"
                    type="date"
                    value={date}
                    onChange={(e) => {
                      const next = e.target.value
                      if (!next) {
                        onDateChange('')
                        return
                      }
                      if (
                        next < scheduleDateBounds.minDate ||
                        (scheduleDateBounds.maxDate && next > scheduleDateBounds.maxDate)
                      ) {
                        return
                      }
                      onDateChange(next)
                    }}
                    onBlur={() => {
                      if (!date) return
                      onDateChange(
                        clampScheduleDateToBounds(
                          date,
                          scheduleDateBounds.minDate,
                          scheduleDateBounds.maxDate,
                        ),
                      )
                    }}
                    sx={fieldSx}
                    disabled={!scheduleDateBounds.hasValidWindow}
                    helperText={formatDepotScheduleDateHelper(scheduleDateBounds)}
                    slotProps={{
                      inputLabel: { shrink: true },
                      htmlInput: {
                        min: scheduleDateBounds.minDate,
                        max: scheduleDateBounds.maxDate ?? undefined,
                      },
                    }}
                  />
                  <InfoTile label="Requesting trucker" value={truckerName} />
                </Box>

                <TextField
                  fullWidth
                  label="Depot remarks (optional)"
                  value={depotRemarks}
                  onChange={(e) => onDepotRemarksChange(e.target.value)}
                  multiline
                  minRows={2}
                  maxRows={6}
                  placeholder="Gate instructions, contact person, special handling, etc."
                  sx={{ ...fieldSx, mt: 2 }}
                  slotProps={{ htmlInput: { maxLength: 2000 } }}
                  helperText="Shown to the trucker with the schedule notification."
                />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
                  {schedule.status === 'Scheduled' && editing ? (
                    <Button onClick={onCancelEdit} disabled={submitting} sx={{ fontWeight: 600 }}>
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      component={RouterLink}
                      to="/depot/schedules"
                      disabled={submitting}
                      sx={{ fontWeight: 600 }}
                    >
                      Back to list
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    onClick={onOpenConfirm}
                    disabled={submitting || !date || !scheduleDateBounds.hasValidWindow}
                    sx={{ fontWeight: 700, borderRadius: 2 }}
                  >
                    {schedule.status === 'WaitingSchedule' ? 'Save & notify trucker' : 'Save changes'}
                  </Button>
                </Box>
              </>
            )}
          </>
        )}
      </DetailTabPanel>

      {!depotView && (
        <DetailTabPanel value="payment" activeTab={activeTab}>
        {showPaymentSection && payment ? (
          <>
            {payment.status === 'ForVerification' && canVerifyPayment && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                  component={RouterLink}
                  to="/admin/payments"
                  size="small"
                  variant="contained"
                  endIcon={<OpenInNewIcon />}
                  sx={{ fontWeight: 600, borderRadius: 2 }}
                >
                  Verify payment
                </Button>
              </Box>
            )}

            <Box sx={infoGridSx}>
              <InfoTile label="Amount" value={formatPeso(payment.amount)} />
              <InfoTile
                label="Status"
                value={
                  <Chip
                    label={paymentStatusLabel[payment.status] ?? payment.status}
                    color={paymentStatusColor[payment.status] ?? 'default'}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                }
              />
              {payment.truckerName && <InfoTile label="Trucker" value={payment.truckerName} />}
              {payment.paidAt && <InfoTile label="Paid at" value={formatDateTime(payment.paidAt)} />}
            </Box>

            {payment.proofFile && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                  Payment proof
                </Typography>
                {isImageProof(payment.proofFile) ? (
                  <Box
                    component="img"
                    src={proofFileUrl}
                    alt="Payment proof"
                    onClick={onProofPreview}
                    sx={{
                      width: '100%',
                      maxWidth: 320,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                    }}
                  />
                ) : isPdfProof(payment.proofFile) ? (
                  <Button
                    variant="outlined"
                    startIcon={<PictureAsPdfOutlinedIcon />}
                    href={proofFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    sx={{ fontWeight: 600, borderRadius: 2 }}
                  >
                    View PDF proof
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    startIcon={<VisibilityOutlinedIcon />}
                    href={proofFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    sx={{ fontWeight: 600, borderRadius: 2 }}
                  >
                    Open proof file
                  </Button>
                )}
              </Box>
            )}
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No payment proof uploaded yet. The trucker will submit proof after this return is scheduled.
          </Typography>
        )}
      </DetailTabPanel>
      )}

      {!depotView && (
      <DetailTabPanel value="qr" activeTab={activeTab}>
        {qrLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: primaryDark }} />
          </Box>
        ) : qrBooking && qrImageUrl ? (
          <>
            <Box sx={infoGridSx}>
              <InfoTile label="Booking ID" value={qrBooking.qrCode} mono />
              <InfoTile
                label="Return date"
                value={formatScheduleDate(qrBooking.payload.scheduleDate)}
              />
              <InfoTile
                label="LOGICTECK status"
                value={qrLookupStatusLabel(qrBooking)}
              />
            </Box>
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Box
                component="img"
                src={qrImageUrl}
                alt="Booking QR"
                sx={{
                  width: '100%',
                  maxWidth: 280,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: '#fff',
                }}
              />
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={onDownloadQr}
                sx={{ mt: 2, fontWeight: 600, borderRadius: 2 }}
              >
                Download QR
              </Button>
            </Box>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            QR code is issued after payment is verified and the return is confirmed.
          </Typography>
        )}
      </DetailTabPanel>
      )}
    </Box>
  )
}
