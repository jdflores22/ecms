import DownloadIcon from '@mui/icons-material/Download'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
import { LOGICTECK_QR, qrLookupStatusColor, qrLookupStatusLabel } from '../../config/logicteckQr'
import type {
  PreAdvice,
  PreAdviceDocument,
  PreAdviceLookups,
  QrBooking,
  Schedule,
} from '../../services/api'
import { formatDateTime, formatScheduleSlot } from '../../utils/datetime'
import { logicteckDirectBookPath } from '../../utils/logicteckDirectBook'
import { formatContainerSizeLabel } from '../../utils/containerSize'

const primaryDark = ICS_PRIMARY

export type PreAdviceDetailTab = 'overview' | 'details' | 'photos' | 'schedule' | 'qr'

const scheduleStatusColor: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  WaitingSchedule: 'warning',
  Scheduled: 'info',
  Confirmed: 'success',
  Completed: 'success',
  Cancelled: 'default',
}

const scheduleStatusLabel: Record<string, string> = {
  WaitingSchedule: 'Waiting schedule',
}

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
  onBookLogicteck: _onBookLogicteck,
  bookLogicteckLoading: _bookLogicteckLoading = false,
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
            Return schedule details will appear here after this pre-advice is approved.
          </Typography>
        ) : scheduleLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
            <CircularProgress size={24} sx={{ color: primaryDark }} />
            <Typography variant="body2" color="text.secondary">
              Loading return schedule…
            </Typography>
          </Box>
        ) : schedule ? (
          <>
            {schedule.status === 'WaitingSchedule' && (
              <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                The depot is assigning a return date, time slot, and trucker. You will be notified when
                the schedule is set.
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
                    label={scheduleStatusLabel[schedule.status] ?? schedule.status}
                    size="small"
                    color={scheduleStatusColor[schedule.status] ?? 'default'}
                    sx={{ fontWeight: 600 }}
                  />
                }
              />
              <InfoTile label="Reference" value={schedule.referenceNo} mono />
            </Box>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No return schedule has been created for this pre-advice yet.
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

        {(schedule?.status === 'Confirmed' || schedule?.status === 'Completed') && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
            {LOGICTECK_QR.readyAlert}
          </Alert>
        )}

        {qrLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
            <CircularProgress size={24} sx={{ color: primaryDark }} />
            <Typography variant="body2" color="text.secondary">
              Loading booking QR…
            </Typography>
          </Box>
        ) : qrBooking && schedule ? (
          <Box>
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              {LOGICTECK_QR.integrationModel}
            </Alert>
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              Booking QR is ready for LOGICTECK. Use the QR code or click{' '}
              <strong>{LOGICTECK_QR.bookLogicteck}</strong> to transfer pre-advice data and create the return booking on LOGICTECK.
            </Alert>
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
              <Box sx={infoGridSx}>
                <InfoTile label="Pre-advice" value={item.referenceNo} mono />
                <InfoTile label={LOGICTECK_QR.bookingIdLabel} value={qrBooking.qrCode} mono />
                <InfoTile label="Generated" value={formatDateTime(qrBooking.generatedAt)} />
                <InfoTile label="Container" value={qrBooking.payload.containerNo} mono />
                <InfoTile
                  label="Return slot"
                  value={formatScheduleSlot(qrBooking.payload.scheduleDate, qrBooking.payload.scheduleTime)}
                />
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
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                {onQrPreview && (
                  <Button
                    variant="contained"
                    startIcon={<QrCode2OutlinedIcon />}
                    onClick={onQrPreview}
                    sx={{ fontWeight: 700, borderRadius: 2 }}
                  >
                    {LOGICTECK_QR.viewQr}
                  </Button>
                )}
                {qrBooking && (
                  <Button
                    component={RouterLink}
                    to={logicteckDirectBookPath(qrBooking.id)}
                    variant="outlined"
                    sx={{ fontWeight: 700, borderRadius: 2 }}
                  >
                    {LOGICTECK_QR.bookLogicteck}
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={onDownloadQr}
                  sx={{ fontWeight: 600, borderRadius: 2 }}
                >
                  Download QR
                </Button>
                <Button
                  component={RouterLink}
                  to={`/logicteck/api-test?qr=${encodeURIComponent(qrBooking.qrCode)}`}
                  variant="outlined"
                  startIcon={<OpenInNewIcon />}
                  sx={{ fontWeight: 600, borderRadius: 2 }}
                >
                  Test API outside ICS
                </Button>
              </Box>
            </Box>
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
