import DownloadIcon from '@mui/icons-material/Download'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import {
  Alert,
  Box,
  Button,
  Chip,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { ICS_PRIMARY, InfoTile, hexToRgba, infoGridSx } from '../layout/DetailPagePrimitives'
import { croEdoApi, type PreAdvice, type PreAdviceDocument } from '../../services/api'
import { formatDate } from '../../utils/datetime'
import { isCroFreeTimeExpired } from '../../utils/croFreeTime'

const primaryDark = ICS_PRIMARY

type PreAdviceCroEdoContextPanelProps = {
  item: PreAdvice
  documents: PreAdviceDocument[]
  compact?: boolean
}

function linkTypeLabel(linkType: string): string {
  return linkType === 'IcsVerified' ? 'ICS CRO/eDO (QR verified)' : 'Legacy CRO/eDO upload'
}

export default function PreAdviceCroEdoContextPanel({
  item,
  documents,
  compact = false,
}: PreAdviceCroEdoContextPanelProps) {
  const ctx = item.croEdoContext
  const croDocuments = documents.filter((doc) => doc.category === 'CroEdo')

  if (!ctx && croDocuments.length === 0) return null

  const freeTime = ctx?.demurrageValidUntil ?? item.demurrageValidUntil
  const reference = ctx?.referenceNo ?? item.croEdoReferenceNo

  const handleDownloadGeneratedPdf = async () => {
    if (!ctx?.containerReleaseOrderId) return
    const blob = await croEdoApi.downloadPdf(ctx.containerReleaseOrderId)
    const url = URL.createObjectURL(blob)
    const anchor = window.document.createElement('a')
    anchor.href = url
    anchor.download = `${reference ?? 'CRO-eDO'}.pdf`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: compact ? 1.5 : { xs: 2, sm: 2.5 },
        borderRadius: 2,
        border: '1px solid',
        borderColor: hexToRgba(primaryDark, 0.15),
        bgcolor: hexToRgba(primaryDark, 0.03),
      }}
    >
      <Stack spacing={1.5}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
          <Typography variant={compact ? 'subtitle2' : 'subtitle1'} sx={{ fontWeight: 800, color: primaryDark }}>
            CRO / eDO — return CY & free time
          </Typography>
          {ctx?.linkType && (
            <Chip
              size="small"
              label={linkTypeLabel(ctx.linkType)}
              color={ctx.linkType === 'IcsVerified' ? 'success' : 'default'}
              sx={{ fontWeight: 700 }}
            />
          )}
        </Box>

        {!compact && (
          <Typography variant="body2" color="text.secondary">
            Return CY and free time below come from the CRO/eDO the trucker attached. Use them as reference when
            assigning the operational CY for this pre-forecast.
          </Typography>
        )}

        <Box sx={infoGridSx}>
          {ctx?.returnEmptyToName && (
            <InfoTile label="Return CY (from CRO/eDO)" value={ctx.returnEmptyToName} />
          )}
          {freeTime && (
            <InfoTile
              label="CRO free demurrage until"
              value={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
                    {formatDate(freeTime)}
                  </Typography>
                  {isCroFreeTimeExpired(freeTime) && (
                    <Chip label="Expired" size="small" color="error" sx={{ fontWeight: 700, height: 22 }} />
                  )}
                </Box>
              }
            />
          )}
          {reference && <InfoTile label="CRO/eDO no." value={reference} mono />}
          {ctx?.blNumber && <InfoTile label="BL number" value={ctx.blNumber} mono />}
          {ctx?.vesselVoyageNumber && <InfoTile label="Vessel / voyage" value={ctx.vesselVoyageNumber} />}
        </Box>

        {ctx?.returnEmptyToName && compact && (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            The issued CRO/eDO specifies return to <strong>{ctx.returnEmptyToName}</strong>. Pick the matching
            operational CY below when approving.
          </Alert>
        )}

        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {ctx?.containerReleaseOrderId && (
            <Button
              component={RouterLink}
              to={`/evaluations/cro-edo/${ctx.containerReleaseOrderId}`}
              size="small"
              variant="outlined"
              startIcon={<OpenInNewIcon />}
              sx={{ fontWeight: 600, borderRadius: 2 }}
            >
              Open issued CRO/eDO
            </Button>
          )}
          {ctx?.hasGeneratedPdf && ctx.containerReleaseOrderId && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<PictureAsPdfIcon />}
              onClick={() => void handleDownloadGeneratedPdf()}
              sx={{ fontWeight: 600, borderRadius: 2 }}
            >
              Download ICS CRO/eDO PDF
            </Button>
          )}
          {croDocuments.map((doc) => (
            <Button
              key={doc.id}
              component="a"
              href={doc.filePath}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon />}
              sx={{ fontWeight: 600, borderRadius: 2 }}
            >
              {doc.fileName || 'View uploaded CRO/eDO'}
            </Button>
          ))}
        </Stack>

        {ctx?.linkType === 'LegacyUpload' && !ctx.hasUploadedDocument && croDocuments.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Legacy manual entry — no CRO/eDO file was uploaded with this pre-forecast.
          </Typography>
        )}

        {ctx?.containerReleaseOrderId && !compact && (
          <Typography variant="caption" color="text.secondary">
            <Link component={RouterLink} to={`/evaluations/cro-edo/${ctx.containerReleaseOrderId}`}>
              View full CRO/eDO details
            </Link>
          </Typography>
        )}
      </Stack>
    </Paper>
  )
}
