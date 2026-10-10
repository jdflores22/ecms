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
  TextField,
  Typography,
} from '@mui/material'
import { ChipRowSkeleton } from '../layout/SkeletonPrimitives'
import { Link as RouterLink } from 'react-router-dom'
import ContainerIdentityPhotos from '../preAdvice/ContainerIdentityPhotos'
import { useAssetUrl } from '../../hooks/useAssetUrl'
import { DetailTabPanel, InfoTile, infoGridSx } from '../layout/DetailPagePrimitives'
import DepotScheduleContainerDetailsTabPanel from './DepotScheduleContainerDetailsTabPanel'
import {
  DepotDetailTile,
  DepotScheduleInfoGrid,
  DepotScheduleSection,
} from './DepotScheduleFieldGrid'
import { DEPOT_SCHEDULE_REMARK_PRESETS } from '../../utils/depotScheduleRemarks'
import { QrImageSkeleton } from '../layout/SkeletonPrimitives'
import AssetImage from '../layout/AssetImage'
import { qrLookupStatusLabel } from '../../config/logicteckQr'
import type {
  HourlySlotAvailability,
  Payment,
  PreAdvice,
  PreAdviceDocument,
  QrBooking,
  Schedule,
} from '../../services/api'
import {
  clampScheduleDateToBounds,
  formatArrivalWindow,
  formatDateTime,
  formatDepotOperatingRange,
  formatDepotScheduleAllowedRange,
  EMPTY_RETURN_OPERATING_HOUR_END,
  EMPTY_RETURN_OPERATING_HOUR_START,
  formatDepotScheduleDateHelper,
  formatPeso,
  formatScheduleDate,
  formatScheduleTimeHundreds,
  normalizeTime24Input,
  formatScheduleTime,
  type DepotScheduleDateBounds,
} from '../../utils/datetime'

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
  showAssignForm: boolean
  showScheduledSummary: boolean
  showEditAssignment?: boolean
  editing: boolean
  date: string
  time: string
  hourlySlots: HourlySlotAvailability | null
  hourlySlotsLoading: boolean
  depotRemarks: string
  scheduleDateBounds: DepotScheduleDateBounds
  actionError: string
  submitting: boolean
  onReloadDocuments: () => void
  onProofPreview: () => void
  onDownloadQr: () => void
  onEditSchedule: () => void
  onDateChange: (value: string) => void
  onTimeChange: (value: string) => void
  onDepotRemarksChange: (value: string) => void
  onCancelEdit: () => void
  onOpenConfirm: () => void
  onOpenPhotosTab?: () => void
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
  showAssignForm,
  showScheduledSummary,
  showEditAssignment = false,
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
  onTimeChange,
  onDepotRemarksChange,
  onCancelEdit,
  onOpenConfirm,
  onOpenPhotosTab,
  time,
  hourlySlots,
  hourlySlotsLoading,
}: DepotScheduleTabPanelsProps) {
  const truckerName = requestingTruckerName(schedule, preAdvice)
  const proofFileUrl = useAssetUrl(payment?.proofFile)

  return (
    <Box sx={{ pt: { xs: 2, sm: 2.5 } }}>
      <DetailTabPanel value="details" activeTab={activeTab}>
        <DepotScheduleContainerDetailsTabPanel
          schedule={schedule}
          preAdvice={preAdvice}
          truckerName={truckerName}
          depotRemarksDraft={depotRemarks}
        />
      </DetailTabPanel>

      <DetailTabPanel value="photos" activeTab={activeTab}>
        {depotView && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            Review the container identity photos uploaded by the trucker before assigning the return date.
          </Alert>
        )}
        <ContainerIdentityPhotos
          preAdviceId={preAdvice.id}
          documents={documents}
          loading={documentsLoading}
          canManage={false}
          onChange={onReloadDocuments}
        />
      </DetailTabPanel>

      <DetailTabPanel value="schedule" activeTab={activeTab}>
        {!showAssignForm && !showScheduledSummary ? (
          <Typography variant="body2" color="text.secondary">
            This return can no longer be assigned from the depot schedule view.
          </Typography>
        ) : (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: showScheduledSummary ? 2 : 0 }}>
              {showEditAssignment && (
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

            {showScheduledSummary && !showAssignForm && (
              <DepotScheduleSection title="Current assignment">
                <DepotScheduleInfoGrid>
                  <DepotDetailTile label="Return date" value={formatScheduleDate(schedule.date)} />
                  <DepotDetailTile label="Return time" value={formatScheduleTimeHundreds(schedule.time)} />
                  <DepotDetailTile
                    label="Arrival window"
                    value={formatArrivalWindow(schedule.date, schedule.time)}
                    span
                  />
                  {schedule.depotRemarks && (
                    <DepotDetailTile label="Depot remarks" value={schedule.depotRemarks} span />
                  )}
                </DepotScheduleInfoGrid>
              </DepotScheduleSection>
            )}

            {showAssignForm && (
              <>
                {depotView && onOpenPhotosTab && (
                  <Alert
                    severity="info"
                    sx={{ mb: 2, borderRadius: 2 }}
                    action={
                      <Button color="inherit" size="small" onClick={onOpenPhotosTab} sx={{ fontWeight: 600 }}>
                        View photos
                      </Button>
                    }
                  >
                    Review container identity photos before confirming the return date.
                  </Alert>
                )}
                {actionError && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                    {actionError}
                  </Alert>
                )}

                {editing && schedule.date && (
                  <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                    Current: {formatScheduleDate(schedule.date)} · {formatScheduleTimeHundreds(schedule.time)} —{' '}
                    {truckerName}
                  </Alert>
                )}

                <DepotScheduleSection title="Free time & allowed dates">
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                    <Chip
                      size="small"
                      color="primary"
                      variant="outlined"
                      label={
                        scheduleDateBounds.demurrageValidUntil
                          ? `Free time until ${formatScheduleDate(scheduleDateBounds.demurrageValidUntil)}`
                          : 'Free time not set'
                      }
                      sx={{ fontWeight: 700 }}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`Allowed: ${formatDepotScheduleAllowedRange(scheduleDateBounds)}`}
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Trucker: <strong>{truckerName}</strong>. Pick a return date inside the allowed range (
                    {formatDepotScheduleDateHelper(scheduleDateBounds)}).
                  </Typography>
                  {!scheduleDateBounds.hasValidWindow && (
                    <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                      {scheduleDateBounds.demurrageValidUntil
                        ? 'Free time expired or no dates left in the window. Ask ICS to extend free time on the pre-forecast.'
                        : 'Free time is not set on this pre-forecast. Contact ICS before assigning a return date.'}
                    </Alert>
                  )}
                </DepotScheduleSection>

                <DepotScheduleSection title="Return date & time">
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

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      Hourly slot · {date ? formatScheduleDate(date) : 'select a date'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
                      {formatDepotOperatingRange(
                        hourlySlots?.operatingHourStart ?? EMPTY_RETURN_OPERATING_HOUR_START,
                        hourlySlots?.operatingHourEnd ?? EMPTY_RETURN_OPERATING_HOUR_END,
                      )}{' '}
                      · ±2 hours arrival window (PHT)
                    </Typography>
                    {hourlySlotsLoading ? (
                      <ChipRowSkeleton chips={6} />
                    ) : (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {(hourlySlots?.slots ?? []).map((slot) => {
                          const slotTime = normalizeTime24Input(formatScheduleTime(slot.time))
                          const selected = time === slotTime
                          const disabled = !slot.isAvailable && !selected
                          return (
                            <Chip
                              key={slot.time}
                              label={`${slot.timeLabel} · ${slot.bookedCount}/${slot.maxContainers}`}
                              clickable={!disabled}
                              color={selected ? 'primary' : 'default'}
                              variant={selected ? 'filled' : 'outlined'}
                              disabled={disabled}
                              onClick={() => onTimeChange(slotTime)}
                              sx={{
                                fontWeight: selected ? 700 : 600,
                                opacity: disabled ? 0.45 : 1,
                              }}
                            />
                          )
                        })}
                      </Box>
                    )}
                    {hourlySlots && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Daily capacity: {hourlySlots.dailyBookedCount}/{hourlySlots.dailyLimit} returns
                      </Typography>
                    )}
                  </Box>
                </DepotScheduleSection>

                <DepotScheduleSection title="Message to trucker">
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Canned response
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                    {DEPOT_SCHEDULE_REMARK_PRESETS.map((preset) => (
                      <Chip
                        key={preset.id}
                        label={preset.label}
                        size="small"
                        clickable
                        variant={depotRemarks === preset.text ? 'filled' : 'outlined'}
                        color={depotRemarks === preset.text ? 'primary' : 'default'}
                        onClick={() => onDepotRemarksChange(preset.text)}
                        sx={{ fontWeight: 600 }}
                      />
                    ))}
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
                    sx={fieldSx}
                    slotProps={{ htmlInput: { maxLength: 2000 } }}
                    helperText="Included in the schedule notification to the trucker."
                  />
                </DepotScheduleSection>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
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
                    disabled={submitting || !date || !time || !scheduleDateBounds.hasValidWindow}
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
                  <AssetImage
                    path={payment.proofFile}
                    alt="Payment proof"
                    onClick={onProofPreview}
                    skeletonHeight={200}
                    sx={{
                      width: '100%',
                      maxWidth: 320,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
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
          <QrImageSkeleton />
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
