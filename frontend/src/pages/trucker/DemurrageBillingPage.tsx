import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import TimerOffOutlinedIcon from '@mui/icons-material/TimerOffOutlined'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { demurrageBillingDetailPath } from '../demurrage/DemurrageBillingDetailPage'
import {
  DemurrageFeeBreakdown,
  DemurrageHero,
  SummaryCard,
  demurrageTabsPaperSx,
} from '../../components/demurrage/DemurrageBillingPrimitives'
import { summarizeBillings } from '../../components/demurrage/demurrageBillingUtils'
import {
  ListDesktopOnly,
  ListMobileCard,
  ListMobileChipRow,
  ListMobileMeta,
  ListMobileOnly,
  ListMobileTitle,
  LIST_PRIMARY,
  listMobileActionsSx,
  listPageRootSx,
  listTablePaperSx,
} from '../../components/layout/ListPagePrimitives'
import { demurrageBillingApi, type DemurrageBilling } from '../../services/api'
import { formatDate, formatPeso } from '../../utils/datetime'
import { paymentStatusColor, paymentStatusLabel } from '../../utils/truckerPayment'

const STATUS_TABS = [
  { key: 'Pending', label: 'Payment due', summaryColor: '#ED6C02' },
  { key: 'ForVerification', label: 'Under review', summaryColor: '#0288D1' },
  { key: 'Paid', label: 'Paid', summaryColor: '#2E7D32' },
  { key: 'Rejected', label: 'Rejected', summaryColor: '#D32F2F' },
] as const

type StatusTab = (typeof STATUS_TABS)[number]['key']

const tabEmptyMessage: Record<StatusTab, string> = {
  Pending: 'No demurrage charges due right now.',
  ForVerification: 'No payment proofs are under admin review.',
  Paid: 'No settled demurrage billings yet.',
  Rejected: 'No rejected payments — open a billing to upload a new proof.',
}

export default function TruckerDemurrageBillingPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<DemurrageBilling[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [activeTab, setActiveTab] = useState<StatusTab>('Pending')
  const [uploadingId, setUploadingId] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    demurrageBillingApi
      .list()
      .then(({ data }) => setItems(data))
      .catch(() => setError('Failed to load demurrage billing.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const summary = useMemo(() => summarizeBillings(items), [items])

  const countByStatus = useMemo(() => {
    const counts = Object.fromEntries(STATUS_TABS.map((t) => [t.key, 0])) as Record<StatusTab, number>
    for (const item of items) {
      if (item.status in counts) counts[item.status as StatusTab]++
    }
    return counts
  }, [items])

  const filtered = useMemo(
    () => items.filter((item) => item.status === activeTab).sort((a, b) => b.totalAmount - a.totalAmount),
    [items, activeTab],
  )

  const startUpload = (id: number) => {
    setSelectedId(id)
    setUploadError('')
    fileInputRef.current?.click()
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || selectedId == null) return

    setUploadingId(selectedId)
    setUploadError('')
    try {
      await demurrageBillingApi.uploadProof(selectedId, file)
      setSuccessMessage('Payment proof uploaded. Admin will verify shortly.')
      setActiveTab('ForVerification')
      load()
    } catch {
      setUploadError('Upload failed. Try again with a clear payment proof image.')
    } finally {
      setUploadingId(null)
      setSelectedId(null)
    }
  }

  return (
    <Box sx={listPageRootSx}>
      <input ref={fileInputRef} type="file" accept="image/*,.pdf" hidden onChange={(e) => void handleFile(e)} />

      <DemurrageHero
        icon={<TimerOffOutlinedIcon />}
        title="Demurrage & detention"
        description="Pay outstanding charges to unblock new pre-forecast for the same container. Open a billing for full details, fee breakdown, and proof upload."
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {(uploadError || successMessage) && (
        <Alert
          severity={uploadError ? 'error' : 'success'}
          sx={{ mb: 2, borderRadius: 2 }}
          onClose={() => {
            setUploadError('')
            setSuccessMessage('')
          }}
        >
          {uploadError || successMessage}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, 1fr)' },
          gap: { xs: 1.5, sm: 2 },
          mb: 3,
        }}
      >
        <SummaryCard
          label="Payment due"
          value={countByStatus.Pending + countByStatus.Rejected}
          subValue={formatPeso(summary.outstandingTotal)}
          color="#ED6C02"
        />
        <SummaryCard label="Under review" value={countByStatus.ForVerification} color="#0288D1" />
        <SummaryCard label="Paid" value={countByStatus.Paid} color="#2E7D32" />
        <SummaryCard label="Total billings" value={items.length} color={LIST_PRIMARY} />
      </Box>

      {(countByStatus.Pending > 0 || countByStatus.Rejected > 0) && (
        <Alert
          icon={<InfoOutlinedIcon fontSize="inherit" />}
          severity="warning"
          sx={{ mb: 2, borderRadius: 2.5, '& .MuiAlert-message': { width: '100%' } }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            Pre-forecast block active
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You cannot submit a new pre-forecast for a container until its demurrage billing is verified as paid.
          </Typography>
        </Alert>
      )}

      <Paper elevation={0} sx={demurrageTabsPaperSx}>
        <Tabs
          value={activeTab}
          onChange={(_, value: StatusTab) => setActiveTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ px: 1 }}
        >
          {STATUS_TABS.map((tab) => (
            <Tab
              key={tab.key}
              value={tab.key}
              label={`${tab.label} (${countByStatus[tab.key]})`}
              sx={{ fontWeight: 700, textTransform: 'none', minHeight: 48 }}
            />
          ))}
        </Tabs>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2, mt: 2 }}>
          {tabEmptyMessage[activeTab]}
        </Alert>
      ) : (
        <>
          <ListDesktopOnly>
            <TableContainer component={Paper} elevation={0} sx={{ ...listTablePaperSx, mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Reference</TableCell>
                    <TableCell>Container</TableCell>
                    <TableCell>Pre-forecast</TableCell>
                    <TableCell>Expired</TableCell>
                    <TableCell>Charges</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((item) => {
                    const canUpload = item.status === 'Pending' || item.status === 'Rejected'
                    return (
                      <TableRow key={item.id} hover>
                        <TableCell
                          sx={{ fontFamily: 'monospace', fontWeight: 700, cursor: 'pointer', color: LIST_PRIMARY }}
                          onClick={() => navigate(demurrageBillingDetailPath(item.id, 'trucker'))}
                        >
                          {item.referenceNo}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{item.containerNo}</TableCell>
                        <TableCell>{item.preAdviceReferenceNo}</TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatDate(item.demurrageValidUntil)}</Typography>
                          {item.daysOverdue > 0 && (
                            <Chip label={`${item.daysOverdue}d overdue`} size="small" color="warning" sx={{ mt: 0.5, fontWeight: 700 }} />
                          )}
                        </TableCell>
                        <TableCell sx={{ minWidth: 180 }}>
                          <DemurrageFeeBreakdown item={item} compact />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={paymentStatusLabel[item.status] ?? item.status}
                            size="small"
                            color={paymentStatusColor[item.status] ?? 'default'}
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <Button
                              size="small"
                              variant="text"
                              endIcon={<OpenInNewIcon />}
                              onClick={() => navigate(demurrageBillingDetailPath(item.id, 'trucker'))}
                              sx={{ fontWeight: 600 }}
                            >
                              View
                            </Button>
                            {canUpload && (
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={
                                  uploadingId === item.id ? (
                                    <CircularProgress size={16} color="inherit" />
                                  ) : (
                                    <UploadFileIcon />
                                  )
                                }
                                disabled={uploadingId !== null}
                                onClick={() => startUpload(item.id)}
                                sx={{ fontWeight: 600, borderRadius: 2 }}
                              >
                                Upload
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </ListDesktopOnly>

          <ListMobileOnly>
            {filtered.map((item) => {
              const canUpload = item.status === 'Pending' || item.status === 'Rejected'
              return (
                <ListMobileCard key={item.id} onClick={() => navigate(demurrageBillingDetailPath(item.id, 'trucker'))}>
                  <ListMobileTitle>{item.containerNo}</ListMobileTitle>
                  <ListMobileMeta>{item.referenceNo}</ListMobileMeta>
                  <ListMobileMeta>{item.preAdviceReferenceNo}</ListMobileMeta>
                  <ListMobileMeta>
                    Expired {formatDate(item.demurrageValidUntil)}
                    {item.daysOverdue > 0 ? ` · ${item.daysOverdue}d overdue` : ''}
                  </ListMobileMeta>
                  <Box sx={{ mt: 1 }}>
                    <DemurrageFeeBreakdown item={item} />
                  </Box>
                  <ListMobileChipRow>
                    <Chip
                      label={paymentStatusLabel[item.status] ?? item.status}
                      size="small"
                      color={paymentStatusColor[item.status] ?? 'default'}
                      sx={{ fontWeight: 700 }}
                    />
                  </ListMobileChipRow>
                  {canUpload && (
                    <Box sx={listMobileActionsSx} onClick={(e) => e.stopPropagation()}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={
                          uploadingId === item.id ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />
                        }
                        disabled={uploadingId !== null}
                        onClick={() => startUpload(item.id)}
                        sx={{ fontWeight: 700, borderRadius: 2 }}
                      >
                        Upload proof · {formatPeso(item.totalAmount)}
                      </Button>
                    </Box>
                  )}
                </ListMobileCard>
              )
            })}
          </ListMobileOnly>
        </>
      )}
    </Box>
  )
}
