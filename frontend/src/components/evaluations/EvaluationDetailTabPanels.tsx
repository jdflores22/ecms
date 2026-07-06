import DownloadIcon from '@mui/icons-material/Download'
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined'
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Typography,
} from '@mui/material'
import ContainerIdentityPhotos from '../preAdvice/ContainerIdentityPhotos'
import PreAdviceFullDossier from '../preAdvice/PreAdviceFullDossier'
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
  Evaluation,
  PreAdvice,
  PreAdviceDocument,
  QrBooking,
  Schedule,
} from '../../services/api'
import { formatDate, formatDateTime, formatScheduleSlot } from '../../utils/datetime'
import { formatContainerSizeLabel } from '../../utils/containerSize'
import DamageReportChip from './DamageReportChip'

const primaryDark = ICS_PRIMARY

export type EvaluationDetailTab = 'overview' | 'details' | 'photos' | 'schedule' | 'qr'

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

function demurrageValidUntilDisplay(validUntil: string | null | undefined) {
  if (!validUntil) return '—'
  const expired = validUntil < new Date().toISOString().slice(0, 10)
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
      <span>{formatDate(validUntil)}</span>
      {expired && (
        <Chip label="Expired" size="small" color="error" sx={{ fontWeight: 700, height: 22 }} />
      )}
    </Box>
  )
}

type EvaluationDetailTabPanelsProps = {
  activeTab: EvaluationDetailTab
  item: PreAdvice
  preAdviceId: number
  documents: PreAdviceDocument[]
  documentsLoading: boolean
  decision: Evaluation | null
  schedule: Schedule | null
  scheduleLoading: boolean
  qrBooking: QrBooking | null
  qrImageUrl: string | null
  qrLoading: boolean
  onReloadDocuments: () => void
  onDownloadQr: () => void
  onQrPreview?: () => void
}

export default function EvaluationDetailTabPanels({
  activeTab,
  item,
  preAdviceId,
  documents,
  documentsLoading,
  decision,
  schedule,
  scheduleLoading,
  qrBooking,
  qrImageUrl,
  qrLoading,
  onReloadDocuments,
  onDownloadQr,
  onQrPreview,
}: EvaluationDetailTabPanelsProps) {
  const isApproved = item.status === 'Approved'

  return (
    <Box sx={{ pt: { xs: 2, sm: 2.5 } }}>
      <DetailTabPanel value="overview" activeTab={activeTab}>
        {item.hasDamageReport && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
              <DamageReportChip />
              <Typography variant="body2">
                Trucker uploaded damage photos. Review the container identity photos below or on the photos tab.
              </Typography>
            </Box>
          </Alert>
        )}
        <PreAdviceFullDossier
          item={item}
          documents={documents}
          documentsLoading={documentsLoading}
          schedule={schedule}
          scheduleLoading={scheduleLoading}
          qrBooking={qrBooking}
          qrImageUrl={qrImageUrl}
          qrLoading={qrLoading}
          decision={decision}
        />
      </DetailTabPanel>

      <DetailTabPanel value="details" activeTab={activeTab}>
        {item.hasDamageReport && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
              <DamageReportChip />
              <Typography variant="body2">
                Trucker uploaded damage photos. Review the Container identity photos tab for details.
              </Typography>
            </Box>
          </Alert>
        )}
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
            <InfoTile label="Container type" value={item.containerType} />
          </Box>
          {item.demurrageValidUntil && (
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
              <InfoTile label="Demurrage valid until" value={item.demurrageValidUntil} />
            </Box>
          )}
          {item.remarks?.trim() && (
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
              <InfoTile label="Trucker remarks" value={item.remarks.trim()} />
            </Box>
          )}
          {decision?.depotName && <InfoTile label="Assigned CY" value={decision.depotName} />}
          {decision && (
            <InfoTile
              label="Evaluation"
              value={
                <Chip
                  label={decision.status}
                  size="small"
                  color={decision.status === 'Approved' ? 'success' : 'error'}
                  sx={{ fontWeight: 600 }}
                />
              }
            />
          )}
          {decision?.evaluatorName && (
            <InfoTile label="Evaluator" value={decision.evaluatorName} />
          )}
          {decision?.evaluatedAt && (
            <InfoTile label="Evaluated" value={formatDateTime(decision.evaluatedAt)} />
          )}
          {decision?.remarks && (
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
              <InfoTile label="Evaluation remarks" value={decision.remarks} />
            </Box>
          )}
          <InfoTile label="Submitted" value={formatDateTime(item.createdAt)} />
          <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
            <InfoTile label="Submitted by remarks" value={item.remarks || '—'} />
          </Box>
        </Box>
      </DetailTabPanel>

      <DetailTabPanel value="photos" activeTab={activeTab}>
        <ContainerIdentityPhotos
          preAdviceId={preAdviceId}
          documents={documents}
          loading={documentsLoading}
          canManage={false}
          onChange={onReloadDocuments}
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
                The depot is assigning a return date, time slot, and trucker for this container.
              </Alert>
            )}
            <Box sx={infoGridSx}>
              <InfoTile label="Depot (CY)" value={schedule.depotName} />
              {schedule.date && (
                <InfoTile label="Return schedule" value={formatScheduleSlot(schedule.date, schedule.time)} />
              )}
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
              <InfoTile
                label="Demurrage valid until"
                value={demurrageValidUntilDisplay(item.demurrageValidUntil)}
              />
              {schedule.slotNo > 0 && <InfoTile label="Slot" value={`Slot ${schedule.slotNo}`} />}
            </Box>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No return schedule has been created for this pre-forecast yet.
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
          <QrImageSkeleton size={200} />
        ) : qrBooking && schedule ? (
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
                <InfoTile label="Pre-forecast" value={item.referenceNo} mono />
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
