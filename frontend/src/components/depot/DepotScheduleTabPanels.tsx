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
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import ContainerIdentityPhotos from '../preAdvice/ContainerIdentityPhotos'
import { resolveAssetUrl } from '../../utils/assetUrl'
import { DetailTabPanel, ICS_PRIMARY, hexToRgba, infoGridSx } from '../layout/DetailPagePrimitives'
import { qrLookupStatusColor, qrLookupStatusLabel } from '../../config/logicteckQr'
import type {
  Payment,
  PreAdvice,
  PreAdviceDocument,
  QrBooking,
  Schedule,
} from '../../services/api'
import {
  formatDateTime,
  formatPeso,
  formatScheduleDate,
  formatScheduleSlot,
  formatScheduleTime,
  getDepotScheduleTimeOptions,
  isBeforeToday,
  isValidTime24,
  SYSTEM_TIMEZONE,
} from '../../utils/datetime'

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
  time: string
  minScheduleDate: string
  actionError: string
  submitting: boolean
  onReloadDocuments: () => void
  onProofPreview: () => void
  onDownloadQr: () => void
  onEditSchedule: () => void
  onDateChange: (value: string) => void
  onTimeChange: (value: string) => void
  onCancelEdit: () => void
  onOpenConfirm: () => void
}

export default function DepotScheduleTabPanels({
  activeTab,
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
  time,
  minScheduleDate,
  actionError,
  submitting,
  onReloadDocuments,
  onProofPreview,
  onDownloadQr,
  onEditSchedule,
  onDateChange,
  onTimeChange,
  onCancelEdit,
  onOpenConfirm,
}: DepotScheduleTabPanelsProps) {
  const truckerName = requestingTruckerName(schedule, preAdvice)
  const timeOptions = useMemo(
    () => getDepotScheduleTimeOptions(schedule.time || time),
    [schedule.time, time],
  )

  return (
    <Box sx={{ pt: { xs: 2, sm: 2.5 } }}>
      <DetailTabPanel value="details" activeTab={activeTab}>
        <Box sx={infoGridSx}>
          <InfoTile label="Requesting trucker" value={truckerName} />
          <InfoTile label="Shipping line" value={preAdvice.shippingLineName} />
          <InfoTile
            label="Container"
            value={`${preAdvice.containerNo} (${preAdvice.containerSize}&apos; ${preAdvice.containerType})`}
            mono
          />
          <InfoTile label="Depot (CY)" value={schedule.depotName} />
          {schedule.date && (
            <InfoTile label="Return schedule" value={formatScheduleSlot(schedule.date, schedule.time)} />
          )}
          <InfoTile label="Submitted" value={formatDateTime(preAdvice.createdAt)} />
          <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
            <InfoTile label="Submitted by remarks" value={preAdvice.remarks || '—'} />
          </Box>
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
                <InfoTile
                  label="Return date & time"
                  value={`${formatScheduleDate(schedule.date)} · ${formatScheduleTime(schedule.time)} ${SYSTEM_TIMEZONE.label}`}
                />
                <InfoTile label="Requesting trucker" value={truckerName} />
                <InfoTile label="Status" value={schedule.status} />
              </Box>
            )}

            {showAssignForm && (
              <>
                {actionError && (
                  <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                    {actionError}
                  </Alert>
                )}

                <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                  The trucker is fixed from the pre-advice request ({truckerName}). Assign return date and
                  time from the available slots below.
                </Alert>

                <Box sx={{ ...infoGridSx, mt: 2 }}>
                  <TextField
                    fullWidth
                    label="Date"
                    type="date"
                    value={date}
                    onChange={(e) => {
                      const next = e.target.value
                      if (next && isBeforeToday(next)) return
                      onDateChange(next)
                    }}
                    sx={fieldSx}
                    helperText="Today or a future date only (PHT)"
                    slotProps={{
                      inputLabel: { shrink: true },
                      htmlInput: { min: minScheduleDate },
                    }}
                  />
                  <FormControl fullWidth sx={fieldSx}>
                    <InputLabel shrink>Time (24-hour)</InputLabel>
                    <Select
                      label="Time (24-hour)"
                      value={timeOptions.includes(time) ? time : ''}
                      onChange={(e) => onTimeChange(String(e.target.value))}
                      displayEmpty
                      sx={{ fontFamily: 'monospace' }}
                      MenuProps={{
                        slotProps: {
                          paper: {
                            sx: { maxHeight: 240 },
                          },
                          list: {
                            sx: { maxHeight: 240, overflow: 'auto', py: 0 },
                          },
                        },
                      }}
                    >
                      <MenuItem value="" disabled>
                        <em>Select time</em>
                      </MenuItem>
                      {timeOptions.map((slot) => (
                        <MenuItem key={slot} value={slot}>
                          {formatScheduleTime(`${slot}:00`)}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>HH:mm — full day from 00:00 to 23:30</FormHelperText>
                  </FormControl>
                  <InfoTile label="Requesting trucker" value={truckerName} />
                </Box>

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
                    disabled={submitting || !isValidTime24(time)}
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
                    src={resolveAssetUrl(payment.proofFile)}
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
                    href={resolveAssetUrl(payment.proofFile)}
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
                    href={resolveAssetUrl(payment.proofFile)}
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
                label="Return date & time"
                value={formatScheduleSlot(qrBooking.payload.scheduleDate, qrBooking.payload.scheduleTime)}
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
    </Box>
  )
}
