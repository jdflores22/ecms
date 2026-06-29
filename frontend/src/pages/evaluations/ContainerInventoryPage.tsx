import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import ManualInventoryAddDialog from '../../components/evaluations/ManualInventoryAddDialog'
import ContainerInventorySummaryTable from '../../components/evaluations/ContainerInventorySummaryTable'
import { hexToRgba, ICS_PRIMARY } from '../../components/layout/DetailPagePrimitives'
import {
  ListDesktopOnly,
  ListMobileCard,
  ListMobileMeta,
  ListMobileOnly,
  ListMobileTitle,
  listHeroActionSx,
  listPageRootSx,
  listTablePaperSx,
} from '../../components/layout/ListPagePrimitives'
import {
  containerInventoryApi,
  type ContainerDwellCompliance,
  type ContainerInventoryItem,
  type ContainerInventoryResponse,
} from '../../services/api'
import { cyUtilizationPctUncapped, getAllocationSizeLabel, progressBarColor } from '../../utils/cyAllocation'
import { formatDisplayDate } from '../../utils/datetime'
import { getShippingLineDisplayCode, getShippingLineFullName } from '../../utils/shippingLine'
import {
  ECMS_INVENTORY_TYPE_CODES,
  INVENTORY_SOURCE_LABELS,
  buildInventorySummaryRows,
  formatInventorySizeLabel,
  sumInventorySummaryRows,
} from '../../utils/inventorySummary'

const primaryDark = ICS_PRIMARY

type InventoryTab = 'inventory' | 'summary'

function rowKey(row: ContainerInventoryItem) {
  return row.scheduleId ?? row.manualEntryId ?? row.containerNo
}

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
        {row.source === 'Manual' && row.manualEntryId ? (
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
    <ListMobileCard key={rowKey(row)}>
      <ListMobileTitle>{row.containerNo}</ListMobileTitle>
      <ListMobileMeta>
        {row.depotName} · {formatInventorySizeLabel(row.containerSize)} {row.containerType}
      </ListMobileMeta>
      <ListMobileMeta>
        <SourceChip source={row.source} />
      </ListMobileMeta>
      <Typography variant="body2" sx={{ mt: 1 }}>
        Yard-in: <strong>{formatDisplayDate(row.yardInDate)}</strong> · Dwell time:{' '}
        <strong>{dwellLabel(row.dwellDays)}</strong>
      </Typography>
      {row.source === 'Workflow' && row.preAdviceId ? (
        <Typography
          component={RouterLink}
          to={`/evaluations/${row.preAdviceId}`}
          variant="body2"
          sx={{ display: 'inline-block', mt: 1.25, fontWeight: 600, color: primaryDark }}
        >
          View pre-forecast {row.referenceNo} →
        </Typography>
      ) : row.manualEntryId ? (
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
  'Source',
  'Pre-forecast',
  'Container yard',
  'Trucker',
  'Yard-in',
  'Slot',
  'Dwell time',
  'Remarks',
  '',
] as const

export default function ContainerInventoryPage() {
  const [activeTab, setActiveTab] = useState<InventoryTab>('inventory')
  const [depotFilter, setDepotFilter] = useState<number | ''>('')
  const [complianceFilter, setComplianceFilter] = useState<ContainerDwellCompliance | ''>('')
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<ContainerInventoryItem[]>([])
  const [summary, setSummary] = useState<ContainerInventoryResponse['summary'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    containerInventoryApi
      .list({
        depotId: depotFilter === '' ? undefined : depotFilter,
        compliance: complianceFilter === '' ? undefined : complianceFilter,
      })
      .then(({ data }) => {
        setItems(data.items)
        setSummary(data.summary)
      })
      .catch(() => setError('Failed to load container yard inventory.'))
      .finally(() => setLoading(false))
  }, [depotFilter, complianceFilter])

  useEffect(() => {
    load()
  }, [load])

  const depotOptions = useMemo(() => summary?.byDepot ?? [], [summary])

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

  const teuPct = useMemo(() => {
    if (!summary) return 0
    return cyUtilizationPctUncapped(summary.usedTeu, summary.contractTeu)
  }, [summary])

  const summaryRows = useMemo(() => buildInventorySummaryRows(filteredItems), [filteredItems])

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
        'Container Yard',
        getAllocationSizeLabel('20'),
        getAllocationSizeLabel('40'),
        ...ECMS_INVENTORY_TYPE_CODES,
        'Pre-advised',
        'Manual',
        'Booking',
        'TEUs',
        'Units',
        'Overstay',
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
      INVENTORY_SOURCE_LABELS[row.source],
      row.source === 'Workflow' ? row.referenceNo : '',
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
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
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
              <Inventory2OutlinedIcon />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                CY container inventory
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5, maxWidth: 720 }}>
                Full visibility of containers at your contracted yards — from approved pre-forecast returns and manual
                registrations. Dwell time is calculated from the yard-in date.
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddOutlinedIcon />}
            onClick={() => setAddOpen(true)}
            sx={{ ...listHeroActionSx, borderRadius: 2 }}
          >
            Register containers
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {summary && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, 1fr)' },
            gap: { xs: 1.5, sm: 2 },
            mb: 2,
          }}
        >
          <SummaryCard label="At yard" value={summary.totalAtYard} color={primaryDark} />
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
                Yard capacity
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
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1.4fr auto' },
            gap: 1.5,
            alignItems: 'center',
          }}
        >
          <FormControl size="small" fullWidth>
            <InputLabel>Container yard</InputLabel>
            <Select
              label="Container yard"
              value={depotFilter}
              onChange={(e) => setDepotFilter(e.target.value as number | '')}
            >
              <MenuItem value="">All yards</MenuItem>
              {depotOptions.map((d) => (
                <MenuItem key={d.depotId} value={d.depotId}>
                  {d.depotName} ({d.count})
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
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress sx={{ color: primaryDark }} />
          </Box>
        ) : activeTab === 'summary' ? (
          <ContainerInventorySummaryTable rows={summaryRows} />
        ) : filteredItems.length === 0 ? (
          <Box sx={{ py: 8, px: 2, textAlign: 'center' }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              No containers at yard yet. Approved returns appear here automatically, or register existing containers
              manually.
            </Typography>
            <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => setAddOpen(true)} sx={{ fontWeight: 700, borderRadius: 2 }}>
              Register containers
            </Button>
          </Box>
        ) : (
          <>
            <ListMobileOnly>
              {filteredItems.map((row) => (
                <InventoryMobileCard key={rowKey(row)} row={row} onDeleteManual={handleDeleteManual} />
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
                      {TABLE_HEADERS.map((header) => (
                        <TableCell key={header || 'actions'} align={header === '' ? 'right' : 'left'}>
                          {header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredItems.map((row) => (
                      <InventoryTableRow key={rowKey(row)} row={row} onDeleteManual={handleDeleteManual} />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </ListDesktopOnly>
          </>
        )}
      </Paper>

      <ManualInventoryAddDialog open={addOpen} onClose={() => setAddOpen(false)} onSaved={load} />
    </Box>
  )
}
