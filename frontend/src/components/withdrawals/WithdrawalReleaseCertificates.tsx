import {
  Box,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import { useAssetUrl } from '../../hooks/useAssetUrl'
import type { WithdrawalDocument } from '../../services/api'
import { formatDateTime } from '../../utils/datetime'
import {
  ListDesktopOnly,
  ListMobileCard,
  ListMobileChipRow,
  ListMobileMeta,
  ListMobileOnly,
  ListMobileTitle,
} from '../layout/ListPagePrimitives'
import { sectionPaperSx } from '../layout/DetailPagePrimitives'

interface WithdrawalReleaseCertificatesProps {
  documents: WithdrawalDocument[]
  /** When true, renders inline without an outer Paper (inside another section). */
  embedded?: boolean
}

type ReleaseRow = {
  id: number
  kind: 'atw' | 'cy'
  label: string
  containerLabel: string
  fileName: string
  filePath: string
  createdAt: string
}

function parseCyContainerNo(fileName: string): string {
  const match = /^CY-RELEASE-(.+)-ATW-.+\.pdf$/i.exec(fileName)
  return match?.[1] ?? fileName.replace(/^CY-RELEASE-/, '').replace(/\.pdf$/i, '')
}

function ViewDocButton({ filePath, label }: { filePath: string; label: string }) {
  const url = useAssetUrl(filePath)

  return (
    <Tooltip title={`View ${label}`}>
      <IconButton
        component="a"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        size="small"
        color="primary"
        aria-label={`View ${label}`}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
      >
        <OpenInNewIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  )
}

function buildRows(documents: WithdrawalDocument[]): ReleaseRow[] {
  const atwReleaseDoc = documents.find((d) => d.documentType === 'AtwReleaseCertificate')
  const cyReleaseDocs = documents
    .filter((d) => d.documentType === 'CyContainerReleaseCertificate')
    .sort((a, b) => parseCyContainerNo(a.fileName).localeCompare(parseCyContainerNo(b.fileName)))

  const rows: ReleaseRow[] = cyReleaseDocs.map((doc) => ({
    id: doc.id,
    kind: 'cy',
    label: 'CY release',
    containerLabel: parseCyContainerNo(doc.fileName),
    fileName: doc.fileName,
    filePath: doc.filePath,
    createdAt: doc.createdAt,
  }))

  if (atwReleaseDoc) {
    rows.push({
      id: atwReleaseDoc.id,
      kind: 'atw',
      label: 'ATW released',
      containerLabel: 'All containers',
      fileName: atwReleaseDoc.fileName,
      filePath: atwReleaseDoc.filePath,
      createdAt: atwReleaseDoc.createdAt,
    })
  }

  return rows
}

function kindChip(kind: ReleaseRow['kind']) {
  if (kind === 'atw') {
    return <Chip label="ATW released" size="small" color="success" sx={{ fontWeight: 600 }} />
  }
  return <Chip label="CY release" size="small" color="info" variant="outlined" sx={{ fontWeight: 600 }} />
}

export default function WithdrawalReleaseCertificates({
  documents,
  embedded = false,
}: WithdrawalReleaseCertificatesProps) {
  const rows = buildRows(documents)

  if (rows.length === 0) {
    return null
  }

  const cyCount = rows.filter((r) => r.kind === 'cy').length
  const hasAtwRelease = rows.some((r) => r.kind === 'atw')
  const summary =
    hasAtwRelease && cyCount > 0
      ? `${cyCount} container${cyCount === 1 ? '' : 's'} released · ATW fully released`
      : hasAtwRelease
        ? 'ATW fully released'
        : `${cyCount} container${cyCount === 1 ? '' : 's'} released`

  const content = (
    <>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
        <Box>
          <Typography variant={embedded ? 'subtitle2' : 'h6'} sx={{ fontWeight: 700 }}>
            Release certificates
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {summary}
          </Typography>
        </Box>
        <PictureAsPdfOutlinedIcon sx={{ color: 'text.secondary', mt: 0.25, flexShrink: 0 }} />
      </Box>

      <ListMobileOnly>
        {rows.map((row) => (
          <ListMobileCard key={row.id}>
            <ListMobileChipRow>
              <ListMobileTitle>
                {row.kind === 'cy' ? (
                  <Box component="span" sx={{ fontFamily: 'monospace' }}>
                    {row.containerLabel}
                  </Box>
                ) : (
                  row.containerLabel
                )}
              </ListMobileTitle>
              {kindChip(row.kind)}
            </ListMobileChipRow>
            <ListMobileMeta>{formatDateTime(row.createdAt)}</ListMobileMeta>
            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
              <ViewDocButton filePath={row.filePath} label={row.label} />
            </Box>
          </ListMobileCard>
        ))}
      </ListMobileOnly>

      <ListDesktopOnly>
        <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(11, 61, 145, 0.04)' }}>
                <TableCell sx={{ fontWeight: 700, width: 130 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Container</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 180 }}>Generated</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 56 }} align="center">
                  PDF
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  sx={row.kind === 'atw' ? { bgcolor: 'rgba(46, 125, 50, 0.04)' } : undefined}
                >
                  <TableCell>{kindChip(row.kind)}</TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: row.kind === 'atw' ? 600 : 500,
                        fontFamily: row.kind === 'cy' ? 'monospace' : undefined,
                      }}
                    >
                      {row.containerLabel}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {formatDateTime(row.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <ViewDocButton filePath={row.filePath} label={row.label} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </ListDesktopOnly>
    </>
  )

  if (embedded) {
    return (
      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        {content}
      </Box>
    )
  }

  return (
    <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 0 }}>
      {content}
    </Paper>
  )
}
