import DownloadIcon from '@mui/icons-material/Download'
import PaymentOutlinedIcon from '@mui/icons-material/PaymentOutlined'
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined'
import SendIcon from '@mui/icons-material/Send'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import ContainerIdentityPhotos from './ContainerIdentityPhotos'
import PreAdviceFullDossier from './PreAdviceFullDossier'
import PreAdviceForm, { type PreAdviceFormSubmitValues } from './PreAdviceForm'
import {
  DetailTabPanel,
  ICS_PRIMARY,
  InfoTile,
  hexToRgba,
  infoGridSx,
} from '../layout/DetailPagePrimitives'
import { InlineLoadingSkeleton, QrImageSkeleton } from '../layout/SkeletonPrimitives'
import { LOGICTECK_QR, qrLookupStatusColor, qrLookupStatusLabel } from '../../config/logicteckQr'
import type {
  PreAdvice,
  PreAdviceDocument,
  PreAdviceLookups,
  QrBooking,
  Schedule,
} from '../../services/api'
import { formatDateTime, formatScheduleSlot } from '../../utils/datetime'
import { canBookLogicteck } from '../../utils/logicteckBooking'
import { formatContainerSizeLabel } from '../../utils/containerSize'
import { getPreAdviceListStatus, isScheduleForPayment, lightStatusChipSx } from '../../utils/scheduleStatus'
import { truckerPaymentPath } from '../../utils/truckerPayment'

const primaryDark = ICS_PRIMARY

export type PreAdviceDetailTab = 'overview' | 'details' | 'photos' | 'schedule' | 'qr'

type StatusGuidance = {
  severity: 'info' | 'success' | 'warning' | 'error'
  message: string
}

type PreAdviceDetailTabPanelsProps = {
  activeTab: PreAdviceDetailTab
  item: PreAdvice
  preAdviceId: number
  documents: PreAdviceDocument[]
  documentsLoading: boolean
  canManageDocuments: boolean
  photoError: string
  onPhotoError: (message: string) => void
  editing: boolean
  lookups: PreAdviceLookups | null
  submitting: boolean
  statusGuidance: StatusGuidance | null
  actionError: string
  onDismissActionError: () => void
  schedule: Schedule | null
  scheduleLoading: boolean
  qrBooking: QrBooking | null
  qrImageUrl: string | null
  qrLoading: boolean
  onReloadDocuments: () => void
  onDocumentsChange?: (documents: PreAdviceDocument[]) => void
  onUpdate: (values: PreAdviceFormSubmitValues) => void
  onCancelEdit: () => void
  onDownloadQr: () => void
  onQrPreview?: () => void
  onBookLogicteck?: () => void
  bookLogicteckLoading?: boolean
}

export default function PreAdviceDetailTabPanels({
  activeTab,
  item,
  preAdviceId,
  documents,
  documentsLoading,
  canManageDocuments,
  photoError,
  onPhotoError,
  editing,
  lookups,
  submitting,
  statusGuidance,
  actionError,
  onDismissActionError,
  schedule,
  scheduleLoading,
  qrBooking,
  qrImageUrl,
  qrLoading,
  onReloadDocuments,
  onDocumentsChange,
  onUpdate,
  onCancelEdit,
  onDownloadQr,
  onQrPreview,
  onBookLogicteck,
  bookLogicteckLoading = false,
}: PreAdviceDetailTabPanelsProps) {
  const isApproved = item.status === 'Approved'

  const containerTypeDisplay = (() => {
    const match = lookups?.containerTypes.find(
      (t) => t.code === item.containerType || t.label === item.containerType,
    )
    return match ? `${match.code} — ${match.label}` : item.containerType
  })()

  return (
    <Box sx={{ pt: { xs: 2, sm: 2.5 } }}>
      <DetailTabPanel value="overview" activeTab={activeTab}>
        {statusGuidance && (
          <Alert severity={statusGuidance.severity} sx={{ mb: 2, borderRadius: 2 }}>
            {statusGuidance.message}
          </Alert>
        )}
        <PreAdviceFullDossier
          item={item}
          documents={documents}
          documentsLoading={documentsLoading}
          lookups={lookups}
          schedule={schedule}
          scheduleLoading={scheduleLoading}
          qrBooking={qrBooking}
          qrImageUrl={qrImageUrl}
          qrLoading={qrLoading}
        />
      </DetailTabPanel>

      <DetailTabPanel value="details" activeTab={activeTab}>
        {statusGuidance && (
          <Alert severity={statusGuidance.severity} sx={{ mb: 2, borderRadius: 2 }}>
            {statusGuidance.message}
          </Alert>
        )}
        {actionError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={onDismissActionError}>
            {actionError}
          </Alert>
        )}
        {editing && lookups ? (
          <PreAdviceForm
            lookups={lookups}
            initial={{
              shippingLineId: item.shippingLineId,
              containerNo: item.containerNo,
              containerSizeId:
                lookups.containerSizes.find((s) => s.label === item.containerSize)?.id ?? '',
              containerTypeId:
                lookups.containerTypes.find(
                  (t) => t.code === item.containerType || t.label === item.containerType,
                )?.id ?? '',
              remarks: item.remarks ?? '',
            }}
            onSubmit={onUpdate}
            onCancel={onCancelEdit}
            submitting={submitting}
          />
        ) : (
          <Box sx={infoGridSx}>
            <InfoTile label="Trucker" value={item.truckerName} />
            <InfoTile label="Shipping line" value={item.shippingLineName} />
            <Box
              sx={{
                gridColumn: { xs: '1', sm: '1 / -1' },
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                gap: { xs: 1.5, sm: 2 },
              }}
            >
              <InfoTile label="Container number" value={item.containerNo} mono />
              <InfoTile label="Container size" value={formatContainerSizeLabel(item.containerSize)} />
              <InfoTile label="Container type" value={containerTypeDisplay} />
            </Box>
            <InfoTile label="Submitted" value={formatDateTime(item.createdAt)} />
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
              <InfoTile label="Remarks" value={item.remarks || '—'} />
            </Box>
          </Box>
        )}
      </DetailTabPanel>

      <DetailTabPanel value="photos" activeTab={activeTab}>
        <ContainerIdentityPhotos
          preAdviceId={preAdviceId}
          documents={documents}
          loading={documentsLoading}
          canManage={canManageDocuments}
          onChange={onReloadDocuments}
          onDocumentsChange={onDocumentsChange}
          error={photoError}
          onError={onPhotoError}
        />
      </DetailTabPanel>

      <DetailTabPanel value="schedule" activeTab={activeTab}>
        {!isApproved ? (
          <Typography variant="body2" color="text.secondary">
            Return schedule details will appear here after this pre-forecast is approved.
          </Typography>
        ) : scheduleLoading ? (
          <InlineLoadingSkeleton rows={3} />
        ) : schedule ? (
          <>
            {schedule.status === 'WaitingSchedule' && (
              <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                The depot is assigning a return date, time slot, and trucker. You will be notified when
                the schedule is set.
              </Alert>
            )}
            {isScheduleForPayment(schedule.status) && (
              <Alert
                severity="warning"
                sx={{ mb: 2, borderRadius: 2 }}
                action={
                  <Button
                    component={RouterLink}
                    to={truckerPaymentPath(schedule.id)}
                    color="inherit"
                    size="small"
                    startIcon={<PaymentOutlinedIcon />}
                    sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                  >
                    Go to payment
                  </Button>
                }
              >
                Return date assigned. Upload payment proof to confirm your return slot.
              </Alert>
            )}
            <Box sx={infoGridSx}>
              <InfoTile label="Depot (CY)" value={schedule.depotName} />
              {schedule.date && (
                <InfoTile label="Return schedule" value={formatScheduleSlot(schedule.date, schedule.time)} />
              )}
              {schedule.slotNo > 0 && <InfoTile label="Slot" value={`Slot ${schedule.slotNo}`} />}
              {schedule.truckerName && <InfoTile label="Assigned trucker" value={schedule.truckerName} />}
              <InfoTile
                label="Schedule status"
                value={
                  <Chip
                    label={
                      getPreAdviceListStatus({
                        status: 'Approved',
                        scheduleStatus: schedule.status,
                      }).label
                    }
                    size="small"
                    variant="outlined"
                    sx={lightStatusChipSx(
                      getPreAdviceListStatus({
                        status: 'Approved',
                        scheduleStatus: schedule.status,
                      }),
                    )}
                  />
                }
              />
              <InfoTile label="Reference" value={schedule.referenceNo} mono />
            </Box>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No return schedule has been created for this pre-forecast yet.
          </Typography>
        )}
      </DetailTabPanel>

      <DetailTabPanel value="qr" activeTab={activeTab}>
        {qrLoading ? (
          <QrImageSkeleton size={200} />
        ) : qrBooking && schedule ? (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: '#fff',
              boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 1.5,
                mb: 2,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: primaryDark }}>
                  {LOGICTECK_QR.sectionTitle}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                  {qrBooking.qrCode}
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    · {formatDateTime(qrBooking.generatedAt)}
                  </Typography>
                </Typography>
              </Box>
              <Chip
                label={qrLookupStatusLabel(qrBooking)}
                size="small"
                color={qrLookupStatusColor(qrLookupStatusLabel(qrBooking))}
                sx={{ fontWeight: 700 }}
              />
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'auto 1fr' },
                gap: { xs: 2, sm: 2.5 },
                alignItems: 'start',
              }}
            >
              {qrImageUrl && (
                <Box
                  component="button"
                  type="button"
                  onClick={onQrPreview}
                  disabled={!onQrPreview}
                  sx={{
                    width: { xs: '100%', sm: 168 },
                    maxWidth: 168,
                    p: 0,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    bgcolor: '#fff',
                    cursor: onQrPreview ? 'pointer' : 'default',
                    transition: 'box-shadow 0.15s ease',
                    '&:hover': onQrPreview
                      ? { boxShadow: '0 4px 16px rgba(11, 61, 145, 0.12)' }
                      : undefined,
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
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {qrBooking.payload.containerNo}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {qrBooking.payload.depot} ·{' '}
                  {formatScheduleSlot(qrBooking.payload.scheduleDate, qrBooking.payload.scheduleTime)}
                </Typography>

                {canBookLogicteck(qrBooking) && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.5 }}>
                    {LOGICTECK_QR.integrationNote}
                  </Typography>
                )}

                {qrBooking.logicteckBookedAt && (
                  <Alert severity="info" sx={{ mb: 2, borderRadius: 2, py: 0.5 }}>
                    {LOGICTECK_QR.bookAlreadySubmitted}
                  </Alert>
                )}
                {qrBooking.isUsed && (
                  <Alert severity="success" sx={{ mb: 2, borderRadius: 2, py: 0.5 }}>
                    {LOGICTECK_QR.bookRetrieved}
                  </Alert>
                )}

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {onBookLogicteck && canBookLogicteck(qrBooking) && (
                    <Button
                      variant="contained"
                      startIcon={<SendIcon />}
                      onClick={onBookLogicteck}
                      disabled={bookLogicteckLoading}
                      sx={{ fontWeight: 700, borderRadius: 2 }}
                    >
                      {bookLogicteckLoading ? 'Sending…' : LOGICTECK_QR.bookLogicteck}
                    </Button>
                  )}
                  {onQrPreview && (
                    <Button
                      variant={canBookLogicteck(qrBooking) ? 'outlined' : 'contained'}
                      startIcon={
                        canBookLogicteck(qrBooking) ? (
                          <VisibilityOutlinedIcon />
                        ) : (
                          <QrCode2OutlinedIcon />
                        )
                      }
                      onClick={onQrPreview}
                      sx={{ fontWeight: 700, borderRadius: 2 }}
                    >
                      {LOGICTECK_QR.viewQr}
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={onDownloadQr}
                    sx={{ fontWeight: 600, borderRadius: 2 }}
                  >
                    Download
                  </Button>
                </Box>
              </Box>
            </Box>
          </Paper>
        ) : (
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid',
              borderColor: hexToRgba(primaryDark, 0.12),
              bgcolor: hexToRgba(primaryDark, 0.02),
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: schedule && isScheduleForPayment(schedule.status) ? 2 : 0 }}>
              {LOGICTECK_QR.emptyState}
            </Typography>
            {schedule && isScheduleForPayment(schedule.status) && (
              <Button
                component={RouterLink}
                to={truckerPaymentPath(schedule.id)}
                variant="contained"
                size="small"
                startIcon={<PaymentOutlinedIcon />}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              >
                Go to payment
              </Button>
            )}
          </Paper>
        )}
      </DetailTabPanel>
    </Box>
  )
}
