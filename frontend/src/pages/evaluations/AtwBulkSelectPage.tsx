import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  InputAdornment,
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
  TablePagination,
  TextField,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ChecklistRtlOutlinedIcon from '@mui/icons-material/ChecklistRtlOutlined'
import SearchIcon from '@mui/icons-material/Search'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router-dom'
import type { AtwIssueFormValues } from '../../components/withdrawals/AtwIssueForm'
import {
  ListDesktopOnly,
  ListLoadingState,
  ListMobileCard,
  ListMobileOnly,
  ListMobileTitle,
  listPageRootSx,
  listTablePaperSx,
} from '../../components/layout/ListPagePrimitives'
import { heroPaperSx } from '../../components/layout/DetailPagePrimitives'
import { containerInventoryApi, withdrawalApi, type ContainerDwellCompliance, type ContainerInventoryItem, type EvaluatorAtwLookups } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { formatContainerSizeLabel, formatContainerSummary } from '../../utils/containerSize'
import {
  dedupeInventoryByContainer,
  inventoryItemToLine,
  inventoryRowKey,
  mergeInventoryLines,
  normalizeContainerNo,
} from '../../utils/atwInventoryLines'
import { saveAtwIssueDraft } from '../../utils/atwIssueDraftStorage'

const MAX_CONTAINERS = 50
const DEFAULT_ROWS_PER_PAGE = 25

type LocationState = {
  draft?: AtwIssueFormValues
  lookups?: EvaluatorAtwLookups
}

function complianceColor(status: ContainerInventoryItem['complianceStatus']) {
  if (status === 'Overstay') return 'error'
  if (status === 'ApproachingLimit') return 'warning'
  return 'success'
}

export default function AtwBulkSelectPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAppSelector((s) => s.auth.user)
  const state = (location.state ?? {}) as LocationState

  const [lookups, setLookups] = useState<EvaluatorAtwLookups | null>(state.lookups ?? null)
  const [draft] = useState<AtwIssueFormValues | null>(state.draft ?? null)
  const [items, setItems] = useState<ContainerInventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lookupsLoading, setLookupsLoading] = useState(!state.lookups)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'Workflow' | 'Manual'>('all')
  const [complianceFilter, setComplianceFilter] = useState<ContainerDwellCompliance | ''>('')
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set())
  const [blockedNos, setBlockedNos] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE)

  useEffect(() => {
    if (state.lookups) return
    withdrawalApi
      .evaluatorLookups()
      .then(({ data }) => setLookups(data))
      .catch(() => setError('Failed to load form data.'))
      .finally(() => setLookupsLoading(false))
  }, [state.lookups])

  const depotId = draft?.currentDepotId ?? ''
  const depotName = useMemo(
    () => lookups?.depots.find((d) => d.id === depotId)?.name ?? 'Container yard',
    [lookups, depotId],
  )

  const loadInventory = useCallback(() => {
    if (!lookups || depotId === '') return
    setLoading(true)
    setError('')
    containerInventoryApi
      .list({
        depotId: depotId as number,
        shippingLineId: lookups.shippingLine.id,
        compliance: complianceFilter === '' ? undefined : complianceFilter,
        yardStatus: 'AtYard',
      })
      .then(({ data }) => setItems(dedupeInventoryByContainer(data.items)))
      .catch(() => setError('Failed to load CY inventory.'))
      .finally(() => setLoading(false))
  }, [lookups, depotId, complianceFilter])

  useEffect(() => {
    loadInventory()
  }, [loadInventory])

  useEffect(() => {
    if (!draft || depotId === '') return
    const preselected = new Set(
      draft.lines.map((line) => normalizeContainerNo(line.containerNo)).filter(Boolean),
    )
    setSelectedKeys(preselected)
  }, [draft, depotId])

  useEffect(() => {
    if (!lookups || depotId === '') return
    const timer = window.setTimeout(() => {
      void Promise.all(
        items.map(async (item) => {
          const line = inventoryItemToLine(item, lookups.containerSizes, lookups.containerTypes)
          if (!line) return null
          try {
            const { data } = await withdrawalApi.checkDuplicate({
              currentDepotId: depotId as number,
              containerNo: line.containerNo,
              containerSizeId: line.containerSizeId as number,
              containerTypeId: line.containerTypeId as number,
            })
            return data.isDuplicate ? normalizeContainerNo(item.containerNo) : null
          } catch {
            return null
          }
        }),
      ).then((results) => {
        setBlockedNos(new Set(results.filter((r): r is string => Boolean(r))))
      })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [items, lookups, depotId])

  const filteredItems = useMemo(() => {
    const q = search.trim().toUpperCase()
    return items
      .filter((item) => {
        if (sourceFilter !== 'all' && item.source !== sourceFilter) return false
        if (!q) return true
        return (
          item.containerNo.toUpperCase().includes(q) ||
          item.referenceNo.toUpperCase().includes(q) ||
          (item.truckerName ?? '').toUpperCase().includes(q)
        )
      })
      .sort((a, b) => b.dwellDays - a.dwellDays)
  }, [items, search, sourceFilter])

  useEffect(() => {
    setPage(0)
  }, [search, sourceFilter, complianceFilter, depotId])

  const totalFiltered = filteredItems.length
  const maxPage = Math.max(0, Math.ceil(totalFiltered / rowsPerPage) - 1)
  const safePage = Math.min(page, maxPage)

  const paginatedItems = useMemo(() => {
    const start = safePage * rowsPerPage
    return filteredItems.slice(start, start + rowsPerPage)
  }, [filteredItems, safePage, rowsPerPage])

  const selectableOnPage = useMemo(
    () =>
      paginatedItems.filter((item) => {
        const key = normalizeContainerNo(item.containerNo)
        if (blockedNos.has(key)) return false
        return inventoryItemToLine(item, lookups?.containerSizes ?? [], lookups?.containerTypes ?? []) !== null
      }),
    [paginatedItems, blockedNos, lookups],
  )

  const toggleItem = (item: ContainerInventoryItem) => {
    const key = normalizeContainerNo(item.containerNo)
    if (blockedNos.has(key)) return
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectAllFiltered = () => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      for (const item of selectableOnPage) {
        next.add(normalizeContainerNo(item.containerNo))
        if (next.size >= MAX_CONTAINERS) break
      }
      return next
    })
  }

  const clearFiltered = () => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      for (const item of paginatedItems) {
        next.delete(normalizeContainerNo(item.containerNo))
      }
      return next
    })
  }

  const continueToIssue = () => {
    if (!draft || !lookups) return
    const additions: ReturnType<typeof inventoryItemToLine>[] = []
    for (const item of items) {
      const key = normalizeContainerNo(item.containerNo)
      if (!selectedKeys.has(key)) continue
      const line = inventoryItemToLine(item, lookups.containerSizes, lookups.containerTypes)
      if (line) additions.push(line)
    }
    const lines = mergeInventoryLines([], additions.filter((l): l is NonNullable<typeof l> => l !== null))
    const nextDraft = { ...draft, lines }
    saveAtwIssueDraft(nextDraft)
    navigate('/evaluations/atw/new', {
      replace: true,
      state: {
        draft: nextDraft,
        lookups,
      },
    })
  }

  if (user?.role !== 'ShippingLineEvaluator') {
    return <Navigate to="/" replace />
  }

  if (!state.draft && !draft) {
    return <Navigate to="/evaluations/atw/new" replace />
  }

  if (!lookupsLoading && lookups && (draft?.currentDepotId === '' || draft?.currentDepotId === undefined)) {
    return (
      <Box sx={listPageRootSx}>
        <Button
          component={RouterLink}
          to="/evaluations/atw/new"
          state={{ draft, lookups }}
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 2, color: 'text.secondary', fontWeight: 600 }}
        >
          Back to issue form
        </Button>
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Select a current container yard on the issue form before bulk-selecting containers.
        </Alert>
      </Box>
    )
  }

  const selectedCount = selectedKeys.size
  const overLimit = selectedCount > MAX_CONTAINERS

  return (
    <Box sx={listPageRootSx}>
      <Button
        component={RouterLink}
        to="/evaluations/atw/new"
        state={{ draft, lookups }}
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2, color: 'text.secondary', fontWeight: 600 }}
      >
        Back to issue form
      </Button>

      <Paper elevation={0} sx={heroPaperSx}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
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
            <ChecklistRtlOutlinedIcon />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              Bulk select containers
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5 }}>
              Choose units from CY inventory at <strong>{depotName}</strong>. Oldest dwell (highest days) shown first.
            </Typography>
          </Box>
          <Chip
            label={`${selectedCount} selected`}
            sx={{
              bgcolor: 'rgba(255,255,255,0.16)',
              color: '#fff',
              fontWeight: 700,
              border: '1px solid rgba(255,255,255,0.25)',
            }}
          />
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {overLimit && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          A maximum of {MAX_CONTAINERS} containers is allowed per ATW. Deselect {selectedCount - MAX_CONTAINERS} unit
          {selectedCount - MAX_CONTAINERS === 1 ? '' : 's'} to continue.
        </Alert>
      )}

      <Paper elevation={0} sx={{ ...listTablePaperSx, p: 2, mb: 2 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 180px 180px auto auto' },
            gap: 1.5,
            alignItems: 'center',
          }}
        >
          <TextField
            size="small"
            placeholder="Search container, reference, trucker…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <FormControl size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
            <InputLabel>Source</InputLabel>
            <Select label="Source" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as typeof sourceFilter)}>
              <MenuItem value="all">All sources</MenuItem>
              <MenuItem value="Workflow">Return workflow</MenuItem>
              <MenuItem value="Manual">Manual entry</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
            <InputLabel>Dwell status</InputLabel>
            <Select
              label="Dwell status"
              value={complianceFilter}
              onChange={(e) => setComplianceFilter(e.target.value as ContainerDwellCompliance | '')}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="WithinLimit">Within limit</MenuItem>
              <MenuItem value="ApproachingLimit">Approaching limit</MenuItem>
              <MenuItem value="Overstay">Overstay</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={selectAllFiltered} sx={{ fontWeight: 600, borderRadius: 2 }}>
            Select page
          </Button>
          <Button variant="text" onClick={clearFiltered} sx={{ fontWeight: 600 }}>
            Clear page
          </Button>
        </Box>
      </Paper>

      <Paper elevation={0} sx={listTablePaperSx}>
        {loading || lookupsLoading ? (
          <ListLoadingState rows={8} columns={6} showMobileCards />
        ) : filteredItems.length === 0 ? (
          <Box sx={{ py: 6, px: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">No containers match your filters at this yard.</Typography>
          </Box>
        ) : (
          <>
            <ListMobileOnly>
              {paginatedItems.map((item) => {
                const key = normalizeContainerNo(item.containerNo)
                const blocked = blockedNos.has(key)
                const checked = selectedKeys.has(key)
                return (
                  <ListMobileCard key={inventoryRowKey(item)} onClick={() => !blocked && toggleItem(item)}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <Checkbox checked={checked} disabled={blocked} sx={{ p: 0, mt: -0.5 }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <ListMobileTitle>{item.containerNo}</ListMobileTitle>
                        <Typography variant="body2" color="text.secondary">
                          {formatContainerSummary(item.containerNo, item.containerSize, item.containerType)}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
                          <Chip size="small" label={item.source} variant="outlined" />
                          <Chip size="small" label={`${item.dwellDays}d dwell`} color={complianceColor(item.complianceStatus)} />
                        </Box>
                        {blocked && (
                          <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.75 }}>
                            Already on another active withdrawal
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </ListMobileCard>
                )
              })}
            </ListMobileOnly>

            <ListDesktopOnly>
              <TableContainer>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" />
                      <TableCell sx={{ fontWeight: 700 }}>Container</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Size / type</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Source</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Trucker</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Dwell</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedItems.map((item) => {
                      const key = normalizeContainerNo(item.containerNo)
                      const blocked = blockedNos.has(key)
                      const checked = selectedKeys.has(key)
                      return (
                        <TableRow
                          key={inventoryRowKey(item)}
                          hover={!blocked}
                          selected={checked}
                          onClick={() => !blocked && toggleItem(item)}
                          sx={{ cursor: blocked ? 'not-allowed' : 'pointer', opacity: blocked ? 0.65 : 1 }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox checked={checked} disabled={blocked} />
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{item.containerNo}</TableCell>
                          <TableCell>
                            {formatContainerSizeLabel(item.containerSize)}&apos; {item.containerType}
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={item.source} variant="outlined" />
                          </TableCell>
                          <TableCell>{item.referenceNo}</TableCell>
                          <TableCell>{item.truckerName ?? '—'}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={`${item.dwellDays}d`}
                              color={complianceColor(item.complianceStatus)}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
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

      <Paper
        elevation={0}
        sx={{
          position: 'sticky',
          bottom: 16,
          mt: 2,
          p: 2,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: '#fff',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          <strong>{selectedCount}</strong> container{selectedCount === 1 ? '' : 's'} selected · max {MAX_CONTAINERS} per ATW
        </Typography>
        <Button
          variant="contained"
          disabled={selectedCount === 0 || overLimit || !draft || !lookups}
          onClick={continueToIssue}
          sx={{ fontWeight: 700, borderRadius: 2, px: 3 }}
        >
          Continue with {selectedCount || 0} container{selectedCount === 1 ? '' : 's'}
        </Button>
      </Paper>
    </Box>
  )
}
