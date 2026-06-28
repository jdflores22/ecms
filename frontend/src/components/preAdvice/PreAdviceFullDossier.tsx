import {
  Box,
  Chip,
  CircularProgress,
  Paper,
  Typography,
} from '@mui/material'
import ContainerIdentityPhotos from './ContainerIdentityPhotos'
import { ICS_PRIMARY, InfoTile, hexToRgba, infoGridSx } from '../layout/DetailPagePrimitives'
import { LOGICTECK_QR, qrLogicteckStatusFromPreAdvice, qrLookupStatusColor, qrLookupStatusLabel } from '../../config/logicteckQr'
import type {
  PreAdvice,
  PreAdviceDocument,
  PreAdviceLookups,
  QrBooking,
  Schedule,
} from '../../services/api'
import { formatDateTime, formatScheduleSlot } from '../../utils/datetime'
import { formatContainerSizeLabel } from '../../utils/containerSize'

const primaryDark = ICS_PRIMARY

const statusColor: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  Draft: 'default',
  Submitted: 'info',
  UnderEvaluation: 'warning',
  Approved: 'success',
  Rejected: 'error',
  ForCompliance: 'warning',
  Cancelled: 'default',
}

const statusLabel: Record<string, string> = {
  UnderEvaluation: 'Under evaluation',
  ForCompliance: 'For compliance',
}

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

type PreAdviceFullDossierProps = {
  item: PreAdvice
  documents: PreAdviceDocument[]
  documentsLoading?: boolean
  lookups?: PreAdviceLookups | null
  schedule?: Schedule | null
  scheduleLoading?: boolean
  qrBooking?: QrBooking | null
  qrImageUrl?: string | null
  qrLoading?: boolean
  compact?: boolean
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: primaryDark, mb: 1.5 }}>
      {children}
    </Typography>
  )
}

export default function PreAdviceFullDossier({
  item,
  documents,
  documentsLoading = false,
  lookups,
  schedule,
  scheduleLoading = false,
  qrBooking,
  qrImageUrl,
  qrLoading = false,
  compact = false,
}: PreAdviceFullDossierProps) {
  const containerTypeDisplay = (() => {
    const match = lookups?.containerTypes.find(
      (t) => t.code === item.containerType || t.label === item.containerType,
    )
    return match ? `${match.code} — ${match.label}` : item.containerType
  })()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: compact ? 2.5 : 3 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 2,
          border: '1px solid',
          borderColor: hexToRgba(primaryDark, 0.12),
          bgcolor: hexToRgba(primaryDark, 0.02),
        }}
      >
        <SectionTitle>Pre-advice summary</SectionTitle>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Chip
            label={statusLabel[item.status] ?? item.status}
            size="small"
            color={statusColor[item.status] ?? 'default'}
            sx={{ fontWeight: 700 }}
          />
          {item.hasQrBooking && qrLogicteckStatusFromPreAdvice(item) && (
            <Chip
              label={qrLogicteckStatusFromPreAdvice(item)!}
              size="small"
              color={qrLookupStatusColor(qrLogicteckStatusFromPreAdvice(item)!)}
              sx={{ fontWeight: 700 }}
            />
          )}
        </Box>
        <Box sx={infoGridSx}>
          <InfoTile label="Reference" value={item.referenceNo} mono />
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
          {item.qrCode && <InfoTile label="ICS QR reference" value={item.qrCode} mono />}
          <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
            <InfoTile label="Remarks" value={item.remarks || '—'} />
          </Box>
          {item.complianceRemarks && (
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
              <InfoTile label="Compliance instructions" value={item.complianceRemarks} />
            </Box>
          )}
        </Box>
      </Paper>

      {(schedule || scheduleLoading) && item.status === 'Approved' && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 2,
            border: '1px solid',
            borderColor: hexToRgba(primaryDark, 0.12),
          }}
        >
          <SectionTitle>Return schedule</SectionTitle>
          {scheduleLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
              <CircularProgress size={22} sx={{ color: primaryDark }} />
              <Typography variant="body2" color="text.secondary">
                Loading schedule…
              </Typography>
            </Box>
          ) : schedule ? (
            <Box sx={infoGridSx}>
              <InfoTile label="Depot (CY)" value={schedule.depotName} />
              {schedule.date && (
                <InfoTile label="Return slot" value={formatScheduleSlot(schedule.date, schedule.time)} />
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
              <InfoTile label="Schedule reference" value={schedule.referenceNo} mono />
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No return schedule assigned yet.
            </Typography>
          )}
        </Paper>
      )}

      {(qrBooking || qrLoading) && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 2,
            border: '1px solid',
            borderColor: hexToRgba(primaryDark, 0.12),
          }}
        >
          <SectionTitle>{LOGICTECK_QR.sectionTitle}</SectionTitle>
          {qrLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
              <CircularProgress size={22} sx={{ color: primaryDark }} />
              <Typography variant="body2" color="text.secondary">
                Loading booking QR…
              </Typography>
            </Box>
          ) : qrBooking ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: qrImageUrl ? 'auto 1fr' : '1fr' },
                gap: 2,
                alignItems: 'start',
              }}
            >
              {qrImageUrl && (
                <Box
                  component="img"
                  src={qrImageUrl}
                  alt={`QR ${qrBooking.qrCode}`}
                  sx={{
                    width: 120,
                    height: 120,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: '#fff',
                    p: 0.5,
                  }}
                />
              )}
              <Box sx={infoGridSx}>
                <InfoTile label={LOGICTECK_QR.bookingIdLabel} value={qrBooking.qrCode} mono />
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
            </Box>
          ) : null}
        </Paper>
      )}

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 2,
          border: '1px solid',
          borderColor: hexToRgba(primaryDark, 0.12),
        }}
      >
        <SectionTitle>Container identity photos</SectionTitle>
        {!compact && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            All container views submitted with this pre-advice — used for evaluation and LOGICTECK integration.
          </Typography>
        )}
        <ContainerIdentityPhotos
          preAdviceId={item.id}
          documents={documents}
          loading={documentsLoading}
          canManage={false}
        />
      </Paper>
    </Box>
  )
}
