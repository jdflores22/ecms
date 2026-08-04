import { ListLoadingState } from '../../components/layout/ListPagePrimitives'
import { Alert, Box, Button, Chip, Paper, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom'
import { hexToRgba } from '../../components/layout/DetailPagePrimitives'
import {
  ListDesktopOnly,
  ListMobileCard,
  ListMobileMeta,
  ListMobileOnly,
  ListMobileTitle,
  LIST_PRIMARY,
  listHeroActionSx,
  listMobileActionsSx,
  listPageRootSx,
  listTablePaperSx,
} from '../../components/layout/ListPagePrimitives'
import { croEdoApi, type CroEdo } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { formatDateTime } from '../../utils/datetime'

const primaryDark = LIST_PRIMARY

const STATUS_TABS = [
  { key: 'Draft', label: 'Draft', summaryColor: '#546E7A' },
  { key: 'Issued', label: 'Issued', summaryColor: '#2E7D32' },
  { key: 'Cancelled', label: 'Cancelled', summaryColor: '#D32F2F' },
] as const

type StatusTabKey = (typeof STATUS_TABS)[number]['key']

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#fff',
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
        minWidth: 0,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, lineHeight: 1.3, wordBreak: 'break-word', display: 'block' }}
      >
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, color, mt: 0.5, fontSize: { xs: '1.35rem', sm: '1.5rem' } }}>
        {value}
      </Typography>
    </Paper>
  )
}

function DataTable({
  loading,
  emptyMessage,
  headCells,
  children,
  mobile,
  isEmpty,
}: {
  loading: boolean
  emptyMessage: string
  headCells: React.ReactNode
  children: React.ReactNode
  mobile?: React.ReactNode
  isEmpty: boolean
}) {
  return (
    <Paper elevation={0} sx={listTablePaperSx}>
      {loading ? (
        <ListLoadingState />
      ) : isEmpty ? (
        <Typography sx={{ py: 8, textAlign: 'center', color: 'text.secondary', px: 2 }}>
          {emptyMessage}
        </Typography>
      ) : (
        <>
          {mobile && <ListMobileOnly>{mobile}</ListMobileOnly>}
          <ListDesktopOnly>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow
                    sx={{
                      bgcolor: hexToRgba(primaryDark, 0.04),
                      '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', py: 1.75 },
                    }}
                  >
                    {headCells}
                  </TableRow>
                </TableHead>
                <TableBody>{children}</TableBody>
              </Table>
            </TableContainer>
          </ListDesktopOnly>
        </>
      )}
    </Paper>
  )
}

export default function CroEdoPage() {
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const [activeStatus, setActiveStatus] = useState<StatusTabKey>('Draft')
  const [items, setItems] = useState<CroEdo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    croEdoApi
      .list()
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load CRO/eDO documents.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const countByStatus = useMemo(() => {
    const counts = Object.fromEntries(STATUS_TABS.map((t) => [t.key, 0])) as Record<StatusTabKey, number>
    for (const item of items) {
      if (item.status in counts) counts[item.status as StatusTabKey]++
    }
    return counts
  }, [items])

  const filtered = useMemo(
    () => items.filter((item) => item.status === activeStatus),
    [items, activeStatus],
  )

  const activeTabMeta = STATUS_TABS.find((t) => t.key === activeStatus)!

  if (user?.role !== 'ShippingLineEvaluator') {
    return <Navigate to="/dashboard" replace />
  }

  const renderMobileCard = (item: CroEdo) => (
    <ListMobileCard key={item.id} onClick={() => navigate(`/evaluations/cro-edo/${item.id}`)}>
      <ListMobileTitle>{item.referenceNo}</ListMobileTitle>
      <ListMobileMeta>{item.blNumber}</ListMobileMeta>
      <ListMobileMeta>{item.consigneeNotifyParty}</ListMobileMeta>
      <ListMobileMeta>{item.vesselVoyageNumber}</ListMobileMeta>
      <ListMobileMeta>
        {item.lines.length} container{item.lines.length === 1 ? '' : 's'} · {formatDateTime(item.createdAt)}
      </ListMobileMeta>
      <Box sx={listMobileActionsSx} onClick={(e) => e.stopPropagation()}>
        <Button
          component={RouterLink}
          to={`/evaluations/cro-edo/${item.id}`}
          size="small"
          variant={item.status === 'Draft' ? 'contained' : 'outlined'}
          startIcon={<OpenInNewIcon />}
          sx={{
            fontWeight: 600,
            borderRadius: 2,
            ...(item.status !== 'Draft' && {
              color: primaryDark,
              borderColor: hexToRgba(primaryDark, 0.35),
            }),
          }}
        >
          {item.status === 'Draft' ? 'Open' : 'View'}
        </Button>
      </Box>
    </ListMobileCard>
  )

  const renderDesktopRow = (item: CroEdo) => (
    <TableRow
      key={item.id}
      hover
      sx={{ '&:last-child td': { borderBottom: 0 }, cursor: 'pointer' }}
      onClick={() => navigate(`/evaluations/cro-edo/${item.id}`)}
    >
      <TableCell sx={{ fontWeight: 700, color: primaryDark }}>{item.referenceNo}</TableCell>
      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.blNumber}</TableCell>
      <TableCell>{item.consigneeNotifyParty}</TableCell>
      <TableCell>{item.vesselVoyageNumber}</TableCell>
      <TableCell>{item.lines.length}</TableCell>
      <TableCell>
        <Chip
          size="small"
          label={item.status}
          color={item.status === 'Issued' ? 'success' : item.status === 'Cancelled' ? 'error' : 'default'}
          sx={{ fontWeight: 700 }}
        />
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {formatDateTime(item.createdAt)}
        </Typography>
      </TableCell>
      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
        <Button
          component={RouterLink}
          to={`/evaluations/cro-edo/${item.id}`}
          size="small"
          variant={item.status === 'Draft' ? 'contained' : 'outlined'}
          startIcon={<OpenInNewIcon />}
          sx={{
            fontWeight: 600,
            borderRadius: 2,
            ...(item.status !== 'Draft' && {
              color: primaryDark,
              borderColor: hexToRgba(primaryDark, 0.35),
            }),
          }}
        >
          {item.status === 'Draft' ? 'Open' : 'View'}
        </Button>
      </TableCell>
    </TableRow>
  )

  return (
    <Box sx={listPageRootSx}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          mb: 3,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${primaryDark} 0%, #0A3580 60%, #0C4DA8 100%)`,
          color: '#fff',
          boxShadow: '0 8px 24px rgba(11, 61, 145, 0.22)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            right: -30,
            top: -30,
            width: 140,
            height: 140,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.06)',
          }}
        />
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            alignItems: 'flex-start',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.14)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <DescriptionOutlinedIcon />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              CRO / eDO
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5, maxWidth: 560 }}>
              Issue Container Release Orders / electronic Delivery Orders with free demurrage time and empty return CY.
            </Typography>
          </Box>
          <Button
            component={RouterLink}
            to="/evaluations/cro-edo/new"
            variant="contained"
            startIcon={<AddIcon />}
            sx={listHeroActionSx}
          >
            New CRO / eDO
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(3, 1fr)',
          },
          gap: { xs: 1.5, sm: 2 },
          mb: 3,
        }}
      >
        {STATUS_TABS.map((tab) => (
          <SummaryCard
            key={tab.key}
            label={tab.label}
            value={countByStatus[tab.key]}
            color={tab.summaryColor}
          />
        ))}
      </Box>

      <Paper
        elevation={0}
        sx={{
          mb: 2,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: '#fff',
          boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={activeStatus}
          onChange={(_, v) => setActiveStatus(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            px: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: hexToRgba(primaryDark, 0.02),
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 48 },
            '& .Mui-selected': { color: primaryDark },
            '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0', bgcolor: '#00A3E0' },
          }}
        >
          {STATUS_TABS.map((tab) => (
            <Tab
              key={tab.key}
              value={tab.key}
              label={`${tab.label} (${countByStatus[tab.key]})`}
            />
          ))}
        </Tabs>
      </Paper>

      <DataTable
        loading={loading}
        emptyMessage={`No ${activeTabMeta.label.toLowerCase()} CRO/eDO documents.`}
        isEmpty={!loading && filtered.length === 0}
        mobile={filtered.map(renderMobileCard)}
        headCells={
          <>
            <TableCell>Reference</TableCell>
            <TableCell>BL Number</TableCell>
            <TableCell>Consignee</TableCell>
            <TableCell>Vessel / Voyage</TableCell>
            <TableCell>Containers</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Created</TableCell>
            <TableCell align="right">Actions</TableCell>
          </>
        }
      >
        {filtered.map(renderDesktopRow)}
      </DataTable>
    </Box>
  )
}
