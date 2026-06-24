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
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import ContainerIdentityPhotos from '../preAdvice/ContainerIdentityPhotos'
import { DetailTabPanel, ECMS_PRIMARY, hexToRgba, infoGridSx } from '../layout/DetailPagePrimitives'
import { LOGICTECK_QR, qrLookupStatusLabel } from '../../config/logicteckQr'
import type {
  Payment,
  PreAdvice,
  PreAdviceDocument,
  QrBooking,
  Schedule,
  SlotAvailability,
  UserListItem,
} from '../../services/api'
import {
  formatDateTime,
  formatPeso,
  formatScheduleDate,
  formatScheduleSlot,
  formatScheduleTime,
  isBeforeToday,
  SYSTEM_TIMEZONE,
} from '../../utils/datetime'

const primaryDark = ECMS_PRIMARY
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

type DepotScheduleTabPanelsProps = {
  activeTab: DepotScheduleTab
  schedule: Schedule
  preAdvice: PreAdvice
  documents: PreAdviceDocument[]
  documentsLoading: boolean
  payment: Payment | null
  showPaymentSection: boolean
  qrBooking: QrBooking | null
  qrImageUrl: string | null
  qrLoading: boolean
  canAssign: boolean
  showAssignForm: boolean
  showScheduledSummary: boolean
  editing: boolean
  date: string
  time: string
  slotNo: number
  truckerId: number | ''
  truckers: UserListItem[]
  slotInfo: SlotAvailability | null
  slotsLoading: boolean
  availableSlots: { slotNo: number; available: boolean; referenceNo?: string | null }[]
  minScheduleDate: string
  actionError: string
  submitting: boolean
  onReloadDocuments: () => void
  onProofPreview: () => void
  onDownloadQr: () => void
  onEditSchedule: () => void
  onDateChange: (value: string) => void
  onTimeChange: (value: string) => void
  onSlotChange: (value: number) => void
  onTruckerChange: (value: number) => void
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
  qrBooking,
  qrImageUrl,
  qrLoading,
  canAssign,
  showAssignForm,
  showScheduledSummary,
  editing,
  date,
  time,
  slotNo,
  truckerId,
  truckers,
  slotInfo,
  slotsLoading,
  availableSlots,
  minScheduleDate,
  actionError,
  submitting,
  onReloadDocuments,
  onProofPreview,
  onDownloadQr,
  onEditSchedule,
  onDateChange,
  onTimeChange,
  onSlotChange,
  onTruckerChange,
  onCancelEdit,
  onOpenConfirm,
}: DepotScheduleTabPanelsProps) {
  return (
    <Box sx={{ pt: { xs: 2, sm: 2.5 } }}>
      <DetailTabPanel value="details" activeTab={activeTab}>
        <Box sx={infoGridSx}>
          <InfoTile label="Broker" value={preAdvice.brokerName} />
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
            <InfoTile label="Broker remarks" value={preAdvice.remarks || '—'} />
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
                <InfoTile label="Slot" value={`Slot ${schedule.slotNo}`} />
                <InfoTile label="Assigned trucker" value={schedule.truckerName ?? '—'} />
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

                {slotInfo && (
                  <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                    {slotInfo.bookedCount} of {slotInfo.dailyLimit} slots booked on{' '}
                    {formatScheduleDate(slotInfo.date)} · {availableSlots.length} available
                  </Alert>
                )}

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
                  <TextField
                    fullWidth
                    label="Time"
                    type="time"
                    value={time}
                    onChange={(e) => onTimeChange(e.target.value)}
                    sx={fieldSx}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <FormControl
                    fullWidth
                    required
                    disabled={slotsLoading || availableSlots.length === 0}
                    sx={fieldSx}
                  >
                    <InputLabel>Slot</InputLabel>
                    <Select label="Slot" value={slotNo} onChange={(e) => onSlotChange(Number(e.target.value))}>
                      {slotInfo?.slots.map((slot) => (
                        <MenuItem key={slot.slotNo} value={slot.slotNo} disabled={!slot.available}>
                          Slot {slot.slotNo}
                          {!slot.available && slot.referenceNo ? ` — booked (${slot.referenceNo})` : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth required sx={fieldSx}>
                    <InputLabel>Trucker</InputLabel>
                    <Select
                      label="Trucker"
                      value={truckerId}
                      onChange={(e) => onTruckerChange(e.target.value as number)}
                    >
                      {truckers.map((t) => (
                        <MenuItem key={t.id} value={t.id}>
                          {t.fullName} ({t.username})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {slotsLoading && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                    <CircularProgress size={18} sx={{ color: primaryDark }} />
                    <Typography variant="caption" color="text.secondary">
                      Loading available slots…
                    </Typography>
                  </Box>
                )}

                {availableSlots.length === 0 && !slotsLoading && (
                  <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                    No slots available for this date. Pick another date or free a booking.
                  </Typography>
                )}

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
                    disabled={submitting || slotsLoading || availableSlots.length === 0}
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
            {payment.status === 'ForVerification' && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                  component={RouterLink}
                  to="/depot/payments"
                  size="small"
                  variant="contained"
                  endIcon={<OpenInNewIcon />}
                  sx={{ fontWeight: 600, borderRadius: 2 }}
                >
                  Verify payment
                </Button>
              </Box>
            )}

            <Box sx={{ ...infoGridSx, mb: payment.proofFile ? 2 : 0 }}>
              <InfoTile
                label="Status"
                value={
                  <Chip
                    label={paymentStatusLabel[payment.status] ?? payment.status}
                    size="small"
                    color={paymentStatusColor[payment.status] ?? 'default'}
                    sx={{ fontWeight: 600 }}
                  />
                }
              />
              <InfoTile label="Amount" value={formatPeso(payment.amount)} />
              {payment.paidAt && <InfoTile label="Uploaded" value={formatDateTime(payment.paidAt)} />}
              {payment.truckerName && <InfoTile label="Trucker" value={payment.truckerName} />}
            </Box>

            {payment.proofFile && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Proof of payment
                </Typography>
                {isImageProof(payment.proofFile) ? (
                  <Box
                    component="img"
                    src={payment.proofFile}
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
                        Open to review before verifying payment.
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
            No payment proof uploaded yet. The trucker will submit proof after this return is scheduled.
          </Typography>
        )}
      </DetailTabPanel>

      <DetailTabPanel value="qr" activeTab={activeTab}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {LOGICTECK_QR.scheduleSectionHint}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, lineHeight: 1.5 }}>
          {LOGICTECK_QR.integrationNote}
        </Typography>

        {qrLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
            <CircularProgress size={24} sx={{ color: primaryDark }} />
            <Typography variant="body2" color="text.secondary">
              Loading booking QR…
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
                component="img"
                src={qrImageUrl}
                alt={`QR code ${qrBooking.qrCode}`}
                sx={{
                  width: { xs: '100%', sm: 200 },
                  maxWidth: 200,
                  height: 'auto',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: '#fff',
                  p: 1,
                }}
              />
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Booking reference: {qrBooking.qrCode}
              </Typography>
              <Box sx={{ ...infoGridSx, mb: 2 }}>
                <InfoTile label="Generated" value={formatDateTime(qrBooking.generatedAt)} />
                <InfoTile label="Container" value={qrBooking.payload.containerNo} mono />
                <InfoTile
                  label="Return slot"
                  value={formatScheduleSlot(qrBooking.payload.scheduleDate, qrBooking.payload.scheduleTime)}
                />
                <InfoTile
                  label={LOGICTECK_QR.validationStatusLabel}
                  value={
                    <Chip
                      label={qrLookupStatusLabel(qrBooking.isUsed)}
                      size="small"
                      color={qrBooking.isUsed ? 'default' : 'success'}
                      sx={{ fontWeight: 600 }}
                    />
                  }
                />
              </Box>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={onDownloadQr}
                sx={{ fontWeight: 600, borderRadius: 2 }}
              >
                Download QR
              </Button>
            </Box>
          </Box>
        ) : (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: hexToRgba(primaryDark, 0.03),
              border: '1px solid',
              borderColor: hexToRgba(primaryDark, 0.1),
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {LOGICTECK_QR.emptyState}
            </Typography>
          </Paper>
        )}
      </DetailTabPanel>
    </Box>
  )
}
