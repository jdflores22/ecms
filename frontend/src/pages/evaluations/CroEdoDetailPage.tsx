import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import RefreshIcon from '@mui/icons-material/Refresh'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import { useCallback, useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import CroEdoEditor from '../../components/evaluations/CroEdoEditor'
import {
  DetailBackButton,
  DetailErrorState,
  DetailHero,
  DetailLoadingState,
  hexToRgba,
  ICS_PRIMARY,
  InfoTile,
  infoGridSx,
  sectionPaperSx,
} from '../../components/layout/DetailPagePrimitives'
import { listPageRootSx } from '../../components/layout/ListPagePrimitives'
import { croEdoApi, type CroEdo } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { formatDateTime } from '../../utils/datetime'

const primaryDark = ICS_PRIMARY

function heroStatusChipStyle(status: string): { bgcolor: string; color: string } {
  switch (status) {
    case 'Issued':
      return { bgcolor: 'rgba(46, 125, 50, 0.92)', color: '#fff' }
    case 'Cancelled':
      return { bgcolor: 'rgba(198, 40, 40, 0.92)', color: '#fff' }
    default:
      return { bgcolor: 'rgba(255,255,255,0.95)', color: primaryDark }
  }
}

export default function CroEdoDetailPage() {
  const { id } = useParams()
  const user = useAppSelector((s) => s.auth.user)
  const [item, setItem] = useState<CroEdo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')

  const load = useCallback(() => {
    if (!id) return
    setLoading(true)
    setError('')
    croEdoApi
      .get(Number(id))
      .then((res) => setItem(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load CRO/eDO.'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (user?.role !== 'ShippingLineEvaluator') {
    return <Navigate to="/dashboard" replace />
  }

  const issue = async () => {
    if (!item) return
    setBusy(true)
    setError('')
    setSavedMessage('')
    try {
      const { data } = await croEdoApi.issue(item.id)
      setItem(data)
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to issue CRO/eDO.',
      )
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    if (!item) return
    if (!window.confirm('Cancel this CRO/eDO?')) return
    setBusy(true)
    setError('')
    setSavedMessage('')
    try {
      const { data } = await croEdoApi.cancel(item.id)
      setItem(data)
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to cancel CRO/eDO.',
      )
    } finally {
      setBusy(false)
    }
  }

  const downloadPdf = async () => {
    if (!item) return
    setBusy(true)
    setError('')
    try {
      const blob = await croEdoApi.downloadPdf(item.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `CRO-${item.referenceNo}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('PDF not available. Issue the document first.')
    } finally {
      setBusy(false)
    }
  }

  const regeneratePdf = async () => {
    if (!item) return
    setBusy(true)
    setError('')
    setSavedMessage('')
    try {
      const { data } = await croEdoApi.regeneratePdf(item.id)
      setItem(data)
      setSavedMessage('PDF regenerated successfully.')
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to regenerate PDF.',
      )
    } finally {
      setBusy(false)
    }
  }

  const isDraft = item?.status === 'Draft'
  const isIssued = item?.status === 'Issued'

  return (
    <Box sx={listPageRootSx}>
      <DetailBackButton to="/evaluations/cro-edo" label="Back to CRO / eDO" />

      {loading ? (
        <DetailLoadingState showTabs={false} infoTiles={6} sections={2} />
      ) : error && !item ? (
        <DetailErrorState message={error} />
      ) : item ? (
        <>
          <DetailHero
            icon={<DescriptionOutlinedIcon />}
            title={item.referenceNo}
            subtitle={`${item.shippingLineName} · BL ${item.blNumber} · ${item.vesselVoyageNumber}`}
            chips={
              <Chip
                size="small"
                label={item.status}
                sx={{ fontWeight: 700, ...heroStatusChipStyle(item.status) }}
              />
            }
            aside={
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: { md: 'flex-end' } }}>
                {isDraft && (
                  <Button
                    variant="contained"
                    disabled={busy}
                    onClick={issue}
                    sx={{
                      fontWeight: 700,
                      borderRadius: 2,
                      bgcolor: '#fff',
                      color: primaryDark,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                    }}
                  >
                    Issue & generate PDF
                  </Button>
                )}
                {item.hasPdf && (
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    disabled={busy}
                    onClick={downloadPdf}
                    sx={{
                      fontWeight: 600,
                      borderRadius: 2,
                      color: '#fff',
                      borderColor: 'rgba(255,255,255,0.45)',
                      '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
                    }}
                  >
                    Download PDF
                  </Button>
                )}
                {isIssued && (
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    disabled={busy}
                    onClick={() => void regeneratePdf()}
                    sx={{
                      fontWeight: 600,
                      borderRadius: 2,
                      color: '#fff',
                      borderColor: 'rgba(255,255,255,0.45)',
                      '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
                    }}
                  >
                    Regenerate PDF
                  </Button>
                )}
                {item.status !== 'Cancelled' && (
                  <Button
                    color="inherit"
                    disabled={busy}
                    onClick={cancel}
                    sx={{
                      fontWeight: 600,
                      borderRadius: 2,
                      color: 'rgba(255,255,255,0.9)',
                      '&:hover': { bgcolor: 'rgba(198, 40, 40, 0.25)' },
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </Box>
            }
          />

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {savedMessage && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSavedMessage('')}>
              {savedMessage}
            </Alert>
          )}

          {isDraft ? (
            <CroEdoEditor
              mode="edit"
              initial={item}
              onSaved={(updated) => {
                setItem(updated)
                setSavedMessage('Draft saved.')
              }}
              footerExtra={
                <Button
                  variant="outlined"
                  disabled={busy}
                  onClick={issue}
                  sx={{ borderRadius: 2, fontWeight: 700, borderColor: primaryDark, color: primaryDark }}
                >
                  Issue & generate PDF
                </Button>
              }
              aside={
                <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 0, position: { xl: 'sticky' }, top: { xl: 88 } }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                    What happens next
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {[
                      'Update consignee, BL, vessel/voyage, and container lines as needed.',
                      'Confirm demurrage free-time validity and Return Empty To.',
                      'Save changes to keep this draft up to date.',
                      'Issue when ready — official CRO/eDO PDF is generated.',
                    ].map((step, i) => (
                      <Box key={step} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                        <Box
                          sx={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            flexShrink: 0,
                            display: 'grid',
                            placeItems: 'center',
                            bgcolor: 'rgba(11, 61, 145, 0.1)',
                            color: primaryDark,
                            fontWeight: 800,
                            fontSize: 12,
                          }}
                        >
                          {i + 1}
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ pt: 0.25 }}>
                          {step}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              }
            />
          ) : (
            <>
              <Paper elevation={0} sx={sectionPaperSx}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                  Release header
                </Typography>
                <Box sx={infoGridSx}>
                  <InfoTile label="Consignee / Notify Party" value={item.consigneeNotifyParty} />
                  <InfoTile label="Shipping Line / Carrier" value={item.shippingLineCarrier} />
                  <InfoTile label="Registry Number" value={item.registryNumber} />
                  <InfoTile label="Customs Office" value={item.customsOffice} />
                  <InfoTile label="Vessel / Voyage" value={item.vesselVoyageNumber} />
                  <InfoTile label="BL Number" value={item.blNumber} mono />
                  <InfoTile label="Broker" value={item.brokerName} />
                  <InfoTile
                    label="Authorized By"
                    value={
                      item.authorizedByName
                        ? `${item.authorizedByName}${item.authorizedByCompany ? ` · ${item.authorizedByCompany}` : ''}`
                        : '—'
                    }
                  />
                  <InfoTile label="Prepared By" value={item.preparedByName || '—'} />
                  <InfoTile
                    label="Issued"
                    value={
                      item.issuedAt
                        ? `${formatDateTime(item.issuedAt)}${item.issuedByName ? ` · ${item.issuedByName}` : ''}`
                        : '—'
                    }
                  />
                </Box>
              </Paper>

              <Paper elevation={0} sx={sectionPaperSx}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                  Containers & empty return (eDO)
                </Typography>
                <TableContainer
                  sx={{
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    overflowX: 'auto',
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow
                        sx={{
                          bgcolor: hexToRgba(primaryDark, 0.04),
                          '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary' },
                        }}
                      >
                        <TableCell>No.</TableCell>
                        <TableCell>Container</TableCell>
                        <TableCell>Size</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Seal</TableCell>
                        <TableCell>Hauler</TableCell>
                        <TableCell>Plate</TableCell>
                        <TableCell>Demurrage validity</TableCell>
                        <TableCell>Return empty to</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {item.lines.map((line) => (
                        <TableRow key={line.id} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                          <TableCell>{line.lineNo}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: primaryDark }}>
                            {line.containerNumber}
                          </TableCell>
                          <TableCell>{line.size}</TableCell>
                          <TableCell>{line.type}</TableCell>
                          <TableCell>{line.seal}</TableCell>
                          <TableCell>{line.haulerName}</TableCell>
                          <TableCell>{line.plateNo}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={line.demurrageValidUntil}
                              color="success"
                              variant="outlined"
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell>{line.returnEmptyToName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

              <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  Port instructions
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                  {item.portInstructions}
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  Empty return note
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.emptyReturnNote}
                </Typography>
              </Paper>
            </>
          )}
        </>
      ) : null}
    </Box>
  )
}
