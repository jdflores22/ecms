import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import ManualInventoryAddDialog from '../../components/evaluations/ManualInventoryAddDialog'
import { hexToRgba, ICS_PRIMARY } from '../../components/layout/DetailPagePrimitives'
import {
  ListDesktopOnly,
  ListMobileCard,
  ListMobileChipRow,
  ListMobileMeta,
  ListMobileOnly,
  ListMobileTitle,
  listPageRootSx,
  listTablePaperSx,
} from '../../components/layout/ListPagePrimitives'
import {
  containerInventoryApi,
  type ContainerDwellCompliance,
  type ContainerInventoryItem,
  type ContainerInventoryResponse,
} from '../../services/api'
import { formatDisplayDate } from '../../utils/datetime'

const primaryDark = ICS_PRIMARY

const complianceLabel: Record<ContainerDwellCompliance, string> = {
  WithinLimit: 'Within limit',
  ApproachingLimit: 'Approaching 90 days',
  Overstay: 'Overstay (90+ days)',
}

const complianceColor: Record<
  ContainerDwellCompliance,
  'default' | 'success' | 'warning' | 'error'
> = {
  WithinLimit: 'success',
  ApproachingLimit: 'warning',
  Overstay: 'error',
}

function rowKey(row: ContainerInventoryItem) {
  return row.scheduleId ?? row.manualEntryId ?? row.containerNo
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

function ComplianceChip({ status }: { status: ContainerDwellCompliance }) {
  return (
    <Chip
      size="small"
      label={complianceLabel[status]}
      color={complianceColor[status]}
      sx={{ fontWeight: 600, maxWidth: '100%', height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 } }}
    />
  )
}

function SourceChip({ row }: { row: ContainerInventoryItem }) {
  if (row.source === 'Manual') {
    return <Chip size="small" label="Manual entry" variant="outlined" sx={{ fontWeight: 600 }} />
  }
  return (
    <Typography
      component={RouterLink}
      to={`/evaluations/${row.preAdviceId}`}
      variant="body2"
      sx={{ fontWeight: 600, color: primaryDark }}
    >
      {row.referenceNo}
    </Typography>
  )
}

function InventoryRowCells({
  row,
  onDeleteManual,
}: {
  row: ContainerInventoryItem
  onDeleteManual: (id: number) => void
}) {
  return (
    <>
      <TableCell>
        <Typography sx={{ fontWeight: 700, color: primaryDark, fontFamily: 'monospace' }}>
          {row.containerNo}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {row.containerSize}&apos; {row.containerType}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography sx={{ fontWeight: 600 }}>{row.depotName}</Typography>
        <SourceChip row={row} />
      </TableCell>
      <TableCell>{formatDisplayDate(row.yardInDate)}</TableCell>
      <TableCell align="right" sx={{ fontWeight: 700 }}>
        {row.dwellDays}
      </TableCell>
      <TableCell align="right">{row.daysRemaining}</TableCell>
      <TableCell>
        <ComplianceChip status={row.complianceStatus} />
      </TableCell>
      <TableCell align="right">
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
        ) : row.preAdviceId ? (
          <Typography
            component={RouterLink}
            to={`/evaluations/${row.preAdviceId}`}
            variant="body2"
            sx={{ fontWeight: 600, color: primaryDark }}
          >
            View
          </Typography>
        ) : null}
      </TableCell>
    </>
  )
}

export default function ContainerInventoryPage() {
  const [depotFilter, setDepotFilter] = useState<number | ''>('')
  const [complianceFilter, setComplianceFilter] = useState<ContainerDwellCompliance | ''>('')
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

  const handleDeleteManual = async (id: number) => {
    if (!window.confirm('Remove this manual inventory entry?')) return
    try {
      await containerInventoryApi.deleteManual(id)
      load()
    } catch {
      setError('Failed to remove manual entry.')
    }
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
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
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
                Full visibility of containers at your contracted yards — from approved returns and manual
                registrations. Dwell time is tracked against CAO 08-2019 (90-day limit).
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddOutlinedIcon />}
            onClick={() => setAddOpen(true)}
            sx={{
              fontWeight: 700,
              borderRadius: 2,
              bgcolor: '#fff',
              color: primaryDark,
              flexShrink: 0,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' },
            }}
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

      {summary && summary.overstayCount > 0 && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {summary.overstayCount} container{summary.overstayCount === 1 ? '' : 's'} exceed the{' '}
          {summary.dwellLimitDays}-day limit under CAO 08-2019. Prioritize gate-out or customs compliance.
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
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 1.5,
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
        </Box>
      </Paper>

      <Paper elevation={0} sx={listTablePaperSx}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress sx={{ color: primaryDark }} />
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ py: 8, px: 2, textAlign: 'center' }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              No containers at yard yet. Approved returns appear here automatically, or register existing
              containers manually.
            </Typography>
            <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => setAddOpen(true)} sx={{ fontWeight: 700, borderRadius: 2 }}>
              Register containers
            </Button>
          </Box>
        ) : (
          <>
            <ListMobileOnly>
              {items.map((row) => (
                <ListMobileCard key={rowKey(row)}>
                  <ListMobileTitle>{row.containerNo}</ListMobileTitle>
                  <ListMobileMeta>
                    {row.depotName} · {row.containerSize}&apos; {row.containerType}
                  </ListMobileMeta>
                  <ListMobileChipRow>
                    <ComplianceChip status={row.complianceStatus} />
                    {row.source === 'Manual' ? (
                      <Chip size="small" label="Manual entry" variant="outlined" sx={{ fontWeight: 600 }} />
                    ) : (
                      <Chip size="small" label={`${row.dwellDays} days at yard`} variant="outlined" sx={{ fontWeight: 600 }} />
                    )}
                  </ListMobileChipRow>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Yard-in: <strong>{formatDisplayDate(row.yardInDate)}</strong> · {row.daysRemaining} days left
                  </Typography>
                  {row.source === 'Workflow' && row.preAdviceId ? (
                    <Typography
                      component={RouterLink}
                      to={`/evaluations/${row.preAdviceId}`}
                      variant="body2"
                      sx={{ display: 'inline-block', mt: 1.25, fontWeight: 600, color: primaryDark }}
                    >
                      View pre-advice {row.referenceNo} →
                    </Typography>
                  ) : row.manualEntryId ? (
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteOutlineOutlinedIcon />}
                      onClick={() => handleDeleteManual(row.manualEntryId!)}
                      sx={{ mt: 1, fontWeight: 600 }}
                    >
                      Remove
                    </Button>
                  ) : null}
                </ListMobileCard>
              ))}
            </ListMobileOnly>
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
                      <TableCell>Container</TableCell>
                      <TableCell>Container yard</TableCell>
                      <TableCell>Yard-in date</TableCell>
                      <TableCell align="right">Dwell (days)</TableCell>
                      <TableCell align="right">Days left</TableCell>
                      <TableCell>CAO 08-2019</TableCell>
                      <TableCell align="right"> </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((row) => (
                      <TableRow key={rowKey(row)} hover>
                        <InventoryRowCells row={row} onDeleteManual={handleDeleteManual} />
                      </TableRow>
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
