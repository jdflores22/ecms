import { Alert, Box, Button, Chip, FormControl, IconButton, InputAdornment, InputLabel, LinearProgress, MenuItem, Paper, Select, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Tabs, TextField, Tooltip, Typography } from '@mui/material'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, Navigate, useSearchParams } from 'react-router-dom'
import { canAccessPage } from '../../config/routeAccess'
import { useAppSelector } from '../../store/hooks'
import { cyAllocationApi, depotApi, type CyAllocation, type Depot } from '../../services/api'
import ManualInventoryAddDialog from '../../components/evaluations/ManualInventoryAddDialog'
import ContainerInventorySummaryTable from '../../components/evaluations/ContainerInventorySummaryTable'
import { hexToRgba, ICS_PRIMARY } from '../../components/layout/DetailPagePrimitives'
import {
  ListDesktopOnly,
  ListMobileCard,
  ListMobileMeta,
  ListMobileOnly,
  ListMobileTitle,
  listHeroPrimaryActionSx,
  listPageRootSx,
  listTablePaperSx,
  PageHero,
} from '../../components/layout/ListPagePrimitives'
import { appColors } from '../../theme/colors'
import {
  containerInventoryApi,
  type ContainerDwellCompliance,
  type ContainerInventoryItem,
  type ContainerInventoryShippingLineSummary,
  type DepotContainerInventoryResponse,
  type ContainerYardStatus,
} from '../../services/api'
import { cyUtilizationPctUncapped, getAllocationSizeLabel, progressBarColor } from '../../utils/cyAllocation'
import { formatDisplayDate } from '../../utils/datetime'
import { getShippingLineDisplayCode, getShippingLineFullName } from '../../utils/shippingLine'
import { ListLoadingState } from '../../components/layout/ListPagePrimitives'
import {
  ECMS_INVENTORY_TYPE_CODES,
  INVENTORY_SOURCE_LABELS,
  buildInventorySummaryRowsByShippingLine,
  formatInventorySizeLabel,
  sumInventorySummaryRows,
} from '../../utils/inventorySummary'
import { inventoryRowKey } from '../../utils/atwInventoryLines'

const primaryDark = ICS_PRIMARY

const DEFAULT_ROWS_PER_PAGE = 25

function lineAtYardCount(d: ContainerInventoryShippingLineSummary) {
  return d.atYardCount ?? 0
}

function lineReleasedCount(d: ContainerInventoryShippingLineSummary) {
  return d.releasedCount ?? 0
}

type InventoryTab = 'inventory' | 'summary'

function formatSlotTime(value: string | null): string {
  if (!value) return '—'
  const [hourText, minuteText] = value.split(':')
  const hour = Number.parseInt(hourText, 10)
  const minute = Number.parseInt(minuteText, 10)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: '1rem',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#fff',
        boxShadow: appColors.surfaceShadow,
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

function YardStatusChip({ status }: { status: ContainerInventoryItem['yardStatus'] }) {
  if (status === 'Released') {
    return <Chip label="Released" size="small" color="info" sx={{ fontWeight: 600 }} />
  }
  return <Chip label="At yard" size="small" color="success" variant="outlined" sx={{ fontWeight: 600 }} />
}

function SourceChip({ source }: { source: ContainerInventoryItem['source'] }) {
  return (
    <Chip
      size="small"
      label={INVENTORY_SOURCE_LABELS[source]}
      variant={source === 'Manual' ? 'outlined' : 'filled'}
      color={source === 'Workflow' ? 'primary' : 'default'}
      sx={{ fontWeight: 600 }}
    />
  )
}

function dwellLabel(days: number): string {
  return days === 1 ? '1 day' : `${days} days`
}

function na(value: string | null | undefined): string {
  return value?.trim() ? value : '—'
}

function InventoryTableRow({
  row,
  onDeleteManual,
}: {
  row: ContainerInventoryItem
  onDeleteManual: (id: number) => void
}) {
  return (
    <TableRow hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
      <TableCell sx={{ width: 44, px: 1 }}>
        {row.preAdviceId ? (
          <Tooltip title="View pre-forecast">
            <IconButton
              component={RouterLink}
              to={`/evaluations/${row.preAdviceId}`}
              size="small"
              aria-label="View pre-forecast"
            >
              <DescriptionOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}
      </TableCell>
      <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace', color: primaryDark, whiteSpace: 'nowrap' }}>
        {row.containerNo}
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
        <Tooltip title={getShippingLineFullName(row.shippingLineCode, row.shippingLineName)}>
          <span>{getShippingLineDisplayCode(row.shippingLineCode, row.shippingLineName)}</span>
        </Tooltip>
      </TableCell>
      <TableCell>{formatInventorySizeLabel(row.containerSize)}</TableCell>
      <TableCell>{row.containerType}</TableCell>
      <TableCell>
        <YardStatusChip status={row.yardStatus} />
      </TableCell>
      <TableCell>
        <SourceChip source={row.source} />
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {row.source === 'Workflow' ? (
          <Typography
            component={RouterLink}
            to={`/evaluations/${row.preAdviceId}`}
            variant="body2"
            sx={{ fontWeight: 600, color: primaryDark }}
          >
            {row.referenceNo}
          </Typography>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {row.yardStatus === 'Released' && row.releaseReferenceNo ? (
          row.releaseWithdrawalId ? (
            <Typography
              component={RouterLink}
              to={`/evaluations/atw/${row.releaseWithdrawalId}`}
              variant="body2"
              sx={{ fontWeight: 600, color: primaryDark }}
            >
              {row.releaseReferenceNo}
            </Typography>
          ) : (
            row.releaseReferenceNo
          )
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.depotName}</TableCell>
      <TableCell sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {na(row.truckerName)}
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDisplayDate(row.yardInDate)}</TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatSlotTime(row.gateInTime)}</TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{dwellLabel(row.dwellDays)}</TableCell>
      <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {na(row.remarks)}
      </TableCell>
      <TableCell align="right" sx={{ width: 48 }}>
        {row.source === 'Manual' && row.manualEntryId && row.yardStatus === 'AtYard' ? (
          <Tooltip title="Remove manual entry">
            <IconButton
              size="small"
              color="error"
              onClick={() => onDeleteManual(row.manualEntryId!)}
              aria-label="Remove manual entry"
            >
              <DeleteOutlineOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}
      </TableCell>
    </TableRow>
  )
}

function InventoryMobileCard({
  row,
  onDeleteManual,
}: {
  row: ContainerInventoryItem
  onDeleteManual: (id: number) => void
}) {
  return (
    <ListMobileCard>
      <ListMobileTitle>{row.containerNo}</ListMobileTitle>
      <ListMobileMeta>
        {row.depotName} · {formatInventorySizeLabel(row.containerSize)} {row.containerType}
      </ListMobileMeta>
      <ListMobileMeta>
        <YardStatusChip status={row.yardStatus} /> · <SourceChip source={row.source} />
      </ListMobileMeta>
      <Typography variant="body2" sx={{ mt: 1 }}>
        Yard-in: <strong>{formatDisplayDate(row.yardInDate)}</strong> · Dwell time:{' '}
        <strong>{dwellLabel(row.dwellDays)}</strong>
      </Typography>
      {row.yardStatus === 'Released' && row.releaseReferenceNo ? (
        <ListMobileMeta>Released under {row.releaseReferenceNo}</ListMobileMeta>
      ) : null}
      {row.source === 'Workflow' && row.preAdviceId ? (
        <Typography
          component={RouterLink}
          to={`/evaluations/${row.preAdviceId}`}
          variant="body2"
          sx={{ display: 'inline-block', mt: 1.25, fontWeight: 600, color: primaryDark }}
        >
          View pre-forecast {row.referenceNo} →
        </Typography>
      ) : row.manualEntryId && row.yardStatus === 'AtYard' ? (
        <Button
          size="small"
          color="error"
          startIcon={<DeleteOutlineOutlinedIcon />}
          onClick={() => onDeleteManual(row.manualEntryId!)}
          sx={{ mt: 1, fontWeight: 600 }}
        >
          Remove
        </Button>
      ) : null}
    </ListMobileCard>
  )
}

const TABLE_HEADERS = [
  '',
  'Container',
  'Line',
  'Size',
  'Type',
  'Yard status',
  'Source',
  'Pre-forecast',
  'Release ref.',
  'Container yard',
  'Trucker',
  'Yard-in',
  'Slot',
  'Dwell time',
  'Remarks',
  '',
] as const

export default function DepotContainerInventoryPage() {
  const user = useAppSelector((s) => s.auth.user)
  const [searchParams, setSearchParams] = useSearchParams()
  const initialLine = Number(searchParams.get('shippingLineId'))
  const initialDepot = Number(searchParams.get('depotId'))
  const [activeTab, setActiveTab] = useState<InventoryTab>('inventory')
  const [adminDepotId, setAdminDepotId] = useState<number | ''>(
    Number.isFinite(initialDepot) && initialDepot > 0 ? initialDepot : '',
  )
  const [depots, setDepots] = useState<Depot[]>([])
  const [lineFilter, setLineFilter] = useState<number | ''>(
    Number.isFinite(initialLine) && initialLine > 0 ? initialLine : '',
  )
  const [complianceFilter, setComplianceFilter] = useState<ContainerDwellCompliance | ''>('')
  const [yardStatusFilter, setYardStatusFilter] = useState<ContainerYardStatus | ''>('')
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<ContainerInventoryItem[]>([])
  const [summary, setSummary] = useState<DepotContainerInventoryResponse['summary'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE)
  const [contractAllocations, setContractAllocations] = useState<CyAllocation[]>([])

  const isAdmin = user?.role === 'Administrator'
  const allowed = user?.role === 'DepotPersonnel' || isAdmin

  useEffect(() => {
    if (!isAdmin) return
    depotApi.list().then(({ data }) => setDepots(data)).catch(() => {})
  }, [isAdmin])

  useEffect(() => {
    if (user?.role === 'Administrator' && depots.length > 0 && adminDepotId === '') {
      setAdminDepotId(depots[0].id)
    }
  }, [user?.role, depots, adminDepotId])

  const effectiveDepotId = useMemo(() => {
    if (isAdmin) return adminDepotId === '' ? null : adminDepotId
    return user?.depotId ?? null
  }, [isAdmin, adminDepotId, user?.depotId])

  useEffect(() => {
    if (!allowed || !effectiveDepotId) {
      setContractAllocations([])
      return
    }
    cyAllocationApi
      .listByDepot(isAdmin ? effectiveDepotId : undefined)
      .then(({ data }) => setContractAllocations(data))
      .catch(() => setContractAllocations([]))
  }, [allowed, isAdmin, effectiveDepotId])

  const load = useCallback(() => {
    if (!allowed) return
    if (isAdmin && !effectiveDepotId) {
      setItems([])
      setSummary(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    containerInventoryApi
      .listByDepot({
        depotId: isAdmin ? effectiveDepotId ?? undefined : undefined,
        shippingLineId: lineFilter === '' ? undefined : lineFilter,
        compliance: complianceFilter === '' ? undefined : complianceFilter,
        yardStatus: yardStatusFilter === '' ? undefined : yardStatusFilter,
      })
      .then(({ data }) => {
        setItems(data.items)
        setSummary(data.summary)
      })
      .catch(() => setError('Failed to load container yard inventory.'))
      .finally(() => setLoading(false))
  }, [allowed, isAdmin, effectiveDepotId, lineFilter, complianceFilter, yardStatusFilter])

  useEffect(() => {
    load()
  }, [load])

  const depotTitle = summary?.depotName ?? depots.find((d) => d.id === effectiveDepotId)?.name ?? null

  const lineOptions = useMemo(() => summary?.byShippingLine ?? [], [summary])

  useEffect(() => {
    const params = new URLSearchParams()
    if (lineFilter !== '') params.set('shippingLineId', String(lineFilter))
    if (isAdmin && effectiveDepotId) params.set('depotId', String(effectiveDepotId))
    setSearchParams(params, { replace: true })
  }, [lineFilter, effectiveDepotId, isAdmin, setSearchParams])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((row) => {
      const haystack = [
        row.containerNo,
        getShippingLineDisplayCode(row.shippingLineCode, row.shippingLineName),
        row.shippingLineName,
        row.containerType,
        row.containerSize,
        row.depotName,
        row.truckerName,
        row.referenceNo,
        row.remarks,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [items, search])

  useEffect(() => {
    setPage(0)
  }, [search, lineFilter, complianceFilter, yardStatusFilter])

  const totalFiltered = filteredItems.length
  const maxPage = Math.max(0, Math.ceil(totalFiltered / rowsPerPage) - 1)
  const safePage = Math.min(page, maxPage)

  const paginatedItems = useMemo(() => {
    const start = safePage * rowsPerPage
    return filteredItems.slice(start, start + rowsPerPage)
  }, [filteredItems, safePage, rowsPerPage])

  const teuPct = useMemo(() => {
    if (!summary) return 0
    return cyUtilizationPctUncapped(summary.usedTeu, summary.contractTeu)
  }, [summary])

  const summaryRows = useMemo(() => buildInventorySummaryRowsByShippingLine(filteredItems), [filteredItems])

  const handleDeleteManual = async (id: number) => {
    if (!window.confirm('Remove this manual inventory entry?')) return
    try {
      await containerInventoryApi.deleteManual(id)
      load()
    } catch {
      setError('Failed to remove manual entry.')
    }
  }

  const handleExport = () => {
    if (activeTab === 'summary') {
      const totals = sumInventorySummaryRows(summaryRows)
      const headers = [
        'Shipping line',
        getAllocationSizeLabel('20'),
        getAllocationSizeLabel('40'),
        ...ECMS_INVENTORY_TYPE_CODES,
        'Pre-advised',
        'Manual',
        'Booking',
        'TEUs',
        'Units',
        'Overstay',
        'Released',
        'Yard-in (Today)',
      ]
      const mapRow = (row: (typeof summaryRows)[number]) => [
        row.depotName,
        row.size20Count || '',
        row.size40Count || '',
        ...ECMS_INVENTORY_TYPE_CODES.map((code) => row.typeCounts[code] || ''),
        row.preAdvisedCount || '',
        row.manualCount || '',
        row.bookingCount || '',
        row.teus,
        row.units,
        row.overstayCount || '',
        row.releasedCount || '',
        row.yardInToday || '',
      ]
      const rows = summaryRows.map(mapRow)
      if (summaryRows.length > 1) rows.push(mapRow(totals))
      const csv = [headers, ...rows]
        .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'cy-inventory-summary.csv'
      link.click()
      URL.revokeObjectURL(url)
      return
    }

    const headers = TABLE_HEADERS.filter((h) => h !== '')
    const rows = filteredItems.map((row) => [
      row.containerNo,
      getShippingLineDisplayCode(row.shippingLineCode, row.shippingLineName),
      formatInventorySizeLabel(row.containerSize),
      row.containerType,
      row.yardStatus === 'Released' ? 'Released' : 'At yard',
      INVENTORY_SOURCE_LABELS[row.source],
      row.source === 'Workflow' ? row.referenceNo : '',
      row.releaseReferenceNo ?? '',
      row.depotName,
      na(row.truckerName),
      formatDisplayDate(row.yardInDate),
      formatSlotTime(row.gateInTime),
      dwellLabel(row.dwellDays),
      na(row.remarks),
    ])
    const csv = [headers, ...rows]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'yard-inventory.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const shippingLineOptions = useMemo(() => {
    const fromContracts = contractAllocations.map((a) => ({
      shippingLineId: a.shippingLineId,
      shippingLineCode: a.shippingLineCode,
      shippingLineName: a.shippingLineName,
    }))
    const seen = new Set(fromContracts.map((l) => l.shippingLineId))
    for (const l of lineOptions) {
      if (!seen.has(l.shippingLineId)) {
        fromContracts.push({
          shippingLineId: l.shippingLineId,
          shippingLineCode: l.shippingLineCode,
          shippingLineName: l.shippingLineName,
        })
      }
    }
    return fromContracts
  }, [contractAllocations, lineOptions])

  if (user?.role && !canAccessPage(user.role, 'depotContainerInventory', user.allowedPages)) {
    return <Navigate to="/" replace />
  }

  if (!allowed) {
    return <Navigate to="/" replace />
  }

  return (
    <Box sx={listPageRootSx}>
      <PageHero
        icon={<Inventory2OutlinedIcon />}
        title={depotTitle ? `${depotTitle} — CY inventory` : 'CY container inventory'}
        subtitle={
          <>
            Containers at your yard by contracted shipping line — from gate check-in and manual registration. Released
            units show ATW reference. See{' '}
            <Box
              component={RouterLink}
              to="/depot/cy-allocation"
              sx={{ color: '#7dd3fc', fontWeight: 600, textDecoration: 'underline', display: 'inline' }}
            >
              CY allocation
            </Box>{' '}
            for contract TEU limits.
            {depotTitle ? ` ${depotTitle}.` : ''}
          </>
        }
        actions={
          <Button
            variant="contained"
            startIcon={<AddOutlinedIcon />}
            onClick={() => setAddOpen(true)}
            sx={listHeroPrimaryActionSx}
          >
            Register containers
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {summary && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(5, 1fr)' },
            gap: { xs: 1.5, sm: 2 },
            mb: 2,
          }}
        >
          <SummaryCard label="At yard" value={summary.totalAtYard} color={primaryDark} />
          <SummaryCard label="Released" value={summary.releasedCount} color="#0288D1" />
          <SummaryCard label="Within limit" value={summary.withinLimitCount} color="#2E7D32" />
          <SummaryCard label="Approaching 90 days" value={summary.approachingLimitCount} color="#ED6C02" />
          <SummaryCard label="Overstay (90+ days)" value={summary.overstayCount} color="#D32F2F" />
        </Box>
      )}

      {summary && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.5, sm: 2 },
            mb: 2,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: '#fff',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.25 }}>
            <WarehouseOutlinedIcon sx={{ color: 'text.secondary', mt: 0.25 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Yard capacity (contracted lines)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {getAllocationSizeLabel('20')}: {summary.size20Count} · {getAllocationSizeLabel('40')}:{' '}
                {summary.size40Count} · {Math.round(summary.usedTeu)} / {Math.round(summary.contractTeu)} TEUs (
                {Number.isInteger(teuPct) ? teuPct : teuPct.toFixed(1)}% utilized)
              </Typography>
            </Box>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, teuPct)}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: hexToRgba(primaryDark, 0.08),
              '& .MuiLinearProgress-bar': {
                bgcolor: progressBarColor(teuPct),
                borderRadius: 4,
              },
            }}
          />
        </Paper>
      )}

      {summary && summary.overstayCount > 0 && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {summary.overstayCount} container{summary.overstayCount === 1 ? '' : 's'} exceed the{' '}
          {summary.dwellLimitDays}-day dwell limit. Prioritize gate-out or customs compliance.
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 2,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: '#fff',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(5, minmax(0, 1fr)) auto' },
            gap: 1.5,
            alignItems: 'center',
          }}
        >
          {isAdmin && depots.length > 0 && (
            <FormControl size="small" fullWidth>
              <InputLabel>Container yard</InputLabel>
              <Select
                label="Container yard"
                value={adminDepotId}
                onChange={(e) => setAdminDepotId(e.target.value as number | '')}
              >
                {depots.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <FormControl size="small" fullWidth>
            <InputLabel>Shipping line</InputLabel>
            <Select
              label="Shipping line"
              value={lineFilter}
              onChange={(e) => setLineFilter(e.target.value as number | '')}
            >
              <MenuItem value="">All lines</MenuItem>
              {lineOptions.map((d) => (
                <MenuItem key={d.shippingLineId} value={d.shippingLineId}>
                  {getShippingLineDisplayCode(d.shippingLineCode, d.shippingLineName)} ({lineAtYardCount(d)} at yard
                  {lineReleasedCount(d) > 0 ? `, ${lineReleasedCount(d)} released` : ''})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Compliance</InputLabel>
            <Select
              label="Compliance"
              value={complianceFilter}
              onChange={(e) => setComplianceFilter(e.target.value as ContainerDwellCompliance | '')}
            >
              <MenuItem value="">All statuses</MenuItem>
              <MenuItem value="WithinLimit">Within limit</MenuItem>
              <MenuItem value="ApproachingLimit">Approaching 90 days</MenuItem>
              <MenuItem value="Overstay">Overstay (90+ days)</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Yard status</InputLabel>
            <Select
              label="Yard status"
              value={yardStatusFilter}
              onChange={(e) => setYardStatusFilter(e.target.value as ContainerYardStatus | '')}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="AtYard">At yard</MenuItem>
              <MenuItem value="Released">Released</MenuItem>
            </Select>
          </FormControl>
          {activeTab === 'inventory' && (
            <TextField
              size="small"
              label="Search"
              placeholder="Container, yard, ref…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlinedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          )}
          <Button
            variant="outlined"
            startIcon={<DownloadOutlinedIcon />}
            onClick={handleExport}
            disabled={activeTab === 'inventory' ? filteredItems.length === 0 : summaryRows.length === 0}
            sx={{ fontWeight: 700, borderRadius: 2, height: 40 }}
          >
            Export
          </Button>
        </Box>
      </Paper>

      <Paper elevation={0} sx={listTablePaperSx}>
        <Tabs
          value={activeTab}
          onChange={(_, value: InventoryTab) => setActiveTab(value)}
          sx={{
            px: { xs: 1, sm: 2 },
            borderBottom: 1,
            borderColor: 'divider',
            minHeight: 48,
            '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', minHeight: 48 },
          }}
        >
          <Tab value="inventory" label={`Yard inventory (${filteredItems.length})`} />
          <Tab value="summary" label="Summary" />
        </Tabs>

        {loading ? (
          <ListLoadingState />
        ) : activeTab === 'summary' ? (
          <ContainerInventorySummaryTable rows={summaryRows} firstColumnLabel="Shipping line" />
        ) : filteredItems.length === 0 ? (
          <Box sx={{ py: 8, px: 2, textAlign: 'center' }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              No containers at yard yet. Containers appear here after depot gate check-in, or register existing
              containers manually.
            </Typography>
            <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => setAddOpen(true)} sx={{ fontWeight: 700, borderRadius: 2 }}>
              Register containers
            </Button>
          </Box>
        ) : (
          <>
            <ListMobileOnly>
              {paginatedItems.map((row) => (
                <InventoryMobileCard key={inventoryRowKey(row)} row={row} onDeleteManual={handleDeleteManual} />
              ))}
            </ListMobileOnly>
            <ListDesktopOnly>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow
                      sx={{
                        bgcolor: hexToRgba(primaryDark, 0.04),
                        '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', py: 1.75 },
                      }}
                    >
                      {TABLE_HEADERS.map((header, index) => (
                        <TableCell key={header || `col-${index}`} align={header === '' ? 'right' : 'left'}>
                          {header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedItems.map((row) => (
                      <InventoryTableRow key={inventoryRowKey(row)} row={row} onDeleteManual={handleDeleteManual} />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </ListDesktopOnly>
            <TablePagination
              component="div"
              count={totalFiltered}
              page={safePage}
              onPageChange={(_, nextPage) => setPage(nextPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10))
                setPage(0)
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${count}`}
              sx={{
                borderTop: '1px solid',
                borderColor: 'divider',
                '& .MuiTablePagination-select': { borderRadius: 1 },
              }}
            />
          </>
        )}
      </Paper>

      <ManualInventoryAddDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={load}
        variant="depot"
        fixedDepotId={effectiveDepotId ?? undefined}
        shippingLines={shippingLineOptions}
      />
    </Box>
  )
}
