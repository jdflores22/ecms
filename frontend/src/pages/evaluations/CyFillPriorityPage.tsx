import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import SaveIcon from '@mui/icons-material/Save'
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined'
import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { hexToRgba, ICS_PRIMARY } from '../../components/layout/DetailPagePrimitives'
import { ListLoadingState, listPageRootSx, PageHero } from '../../components/layout/ListPagePrimitives'
import {
  cyAllocationApi,
  shippingLineCyFillApi,
  type CyAllocation,
  type ShippingLineCyFillSettings,
} from '../../services/api'
import CyFillDepotAllocationStrip from '../../components/evaluations/CyFillDepotAllocationStrip'
import { useAppSelector } from '../../store/hooks'

const primaryDark = ICS_PRIMARY

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function CyFillPriorityPage() {
  const user = useAppSelector((s) => s.auth.user)
  const allowed = user?.role === 'ShippingLineEvaluator'

  const [settings, setSettings] = useState<ShippingLineCyFillSettings | null>(null)
  const [contracts, setContracts] = useState<CyAllocation[]>([])
  const [priorityIds, setPriorityIds] = useState<number[]>([])
  const [dailyDate, setDailyDate] = useState(todayIso())
  const [dailyDepotId, setDailyDepotId] = useState<number | ''>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const contractedDepots = useMemo(
    () =>
      contracts.map((c) => ({
        depotId: c.depotId,
        depotName: c.depotName,
      })),
    [contracts],
  )

  const allocationByDepotId = useMemo(() => {
    const map = new Map<number, CyAllocation>()
    for (const contract of contracts) {
      map.set(contract.depotId, contract)
    }
    return map
  }, [contracts])

  const selectedDailyAllocation =
    dailyDepotId === '' ? undefined : allocationByDepotId.get(Number(dailyDepotId))

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([shippingLineCyFillApi.getSettings(), cyAllocationApi.list()])
      .then(([settingsRes, contractsRes]) => {
        const data = settingsRes.data
        setSettings(data)
        setContracts(contractsRes.data)
        const ordered =
          data.priorities.length > 0
            ? data.priorities.map((p) => p.depotId)
            : contractsRes.data.map((c) => c.depotId)
        setPriorityIds(ordered)
        setDailyDepotId(
          data.todayAssignment?.primaryDepotId ?? contractsRes.data[0]?.depotId ?? '',
        )
      })
      .catch((err) => setError(apiErrorMessage(err, 'Failed to load CY fill settings.')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (allowed) load()
  }, [allowed, load])

  if (!allowed) {
    return <Navigate to="/" replace />
  }

  const strategy = settings?.cyFillStrategy ?? 'PriorityList'

  const movePriority = (index: number, direction: -1 | 1) => {
    const next = [...priorityIds]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setPriorityIds(next)
  }

  const handleStrategyChange = async (value: 'PriorityList' | 'DailyAssignment') => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const { data } = await shippingLineCyFillApi.updateStrategy(value)
      setSettings(data)
      setSuccess('CY fill strategy updated.')
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to update strategy.'))
    } finally {
      setSaving(false)
    }
  }

  const handleSavePriorities = async () => {
    if (priorityIds.length === 0) {
      setError('Select at least one container yard for the priority list.')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const { data } = await shippingLineCyFillApi.updatePriorities(priorityIds)
      setSettings(data)
      setSuccess('Priority list saved. Higher-ranked CYs are filled first.')
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save priority list.'))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDaily = async () => {
    if (dailyDepotId === '') {
      setError('Select the primary CY for the chosen date.')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const { data } = await shippingLineCyFillApi.setDaily(dailyDate, Number(dailyDepotId))
      setSettings(data)
      setSuccess(`Primary CY for ${dailyDate} saved. Admin approvals will prefer this yard today.`)
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save daily assignment.'))
    } finally {
      setSaving(false)
    }
  }

  const depotName = (depotId: number) =>
    contractedDepots.find((d) => d.depotId === depotId)?.depotName ?? `CY #${depotId}`

  return (
    <Box sx={listPageRootSx}>
      <PageHero
        icon={<WarehouseOutlinedIcon />}
        title="CY fill priority"
        subtitle="Steer which container yards admin should fill first. Use each depot's allocation to decide who has room to take returns."
      />

      {loading ? (
        <ListLoadingState />
      ) : (
        <>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 3 },
              mb: 2,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              Fill strategy
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose how you want empty returns routed across your contracted CYs.
            </Typography>
            <FormControl>
              <RadioGroup
                value={strategy}
                onChange={(e) =>
                  handleStrategyChange(e.target.value as 'PriorityList' | 'DailyAssignment')
                }
              >
                <FormControlLabel
                  value="PriorityList"
                  control={<Radio disabled={saving} />}
                  label="Priority list — fixed order; fill higher-ranked CY first"
                />
                <FormControlLabel
                  value="DailyAssignment"
                  control={<Radio disabled={saving} />}
                  label="Daily assignment — pick one primary CY each calendar day"
                />
              </RadioGroup>
            </FormControl>
            {settings?.todayAssignment && strategy === 'DailyAssignment' && (
              <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                Today&apos;s primary CY: <strong>{settings.todayAssignment.primaryDepotName}</strong>{' '}
                (set by {settings.todayAssignment.setByName})
              </Alert>
            )}
          </Paper>

          {strategy === 'PriorityList' ? (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 3 },
                mb: 2,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Priority list
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Rank your contracted CYs. #1 is filled first when admin assigns returns. Depots with more
                available TEU are usually good candidates for higher priority.
              </Typography>
              {priorityIds.length === 0 ? (
                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                  No contracted container yards found. Configure contracts in Settings first.
                </Alert>
              ) : (
                <Stack spacing={1}>
                  {priorityIds.map((depotId, index) => (
                    <Paper
                      key={depotId}
                      elevation={0}
                      sx={{
                        px: 2,
                        py: 1.25,
                        borderRadius: 2,
                        bgcolor: hexToRgba(primaryDark, 0.03),
                        border: '1px solid',
                        borderColor: hexToRgba(primaryDark, 0.08),
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 800, color: primaryDark, minWidth: 28, pt: 0.25 }}
                        >
                          #{index + 1}
                        </Typography>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {depotName(depotId)}
                          </Typography>
                          <CyFillDepotAllocationStrip allocation={allocationByDepotId.get(depotId)} />
                        </Box>
                        <Box sx={{ display: 'flex', flexShrink: 0 }}>
                          <Button
                            size="small"
                            disabled={index === 0 || saving}
                            onClick={() => movePriority(index, -1)}
                            aria-label="Move up"
                          >
                            <ArrowUpwardIcon fontSize="small" />
                          </Button>
                          <Button
                            size="small"
                            disabled={index === priorityIds.length - 1 || saving}
                            onClick={() => movePriority(index, 1)}
                            aria-label="Move down"
                          >
                            <ArrowDownwardIcon fontSize="small" />
                          </Button>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              )}
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSavePriorities}
                disabled={saving || priorityIds.length === 0}
                sx={{ mt: 2, fontWeight: 700, borderRadius: 2 }}
              >
                Save priority list
              </Button>
            </Paper>
          ) : (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 3 },
                mb: 2,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Daily primary CY
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Assign which CY should be filled first for a specific date. Check allocation below each
                depot to pick the yard with enough room.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                <TextField
                  label="Date"
                  type="date"
                  value={dailyDate}
                  onChange={(e) => setDailyDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ minWidth: 160 }}
                />
                <FormControl fullWidth>
                  <InputLabel>Primary CY</InputLabel>
                  <Select
                    label="Primary CY"
                    value={dailyDepotId}
                    onChange={(e) => setDailyDepotId(e.target.value as number)}
                  >
                    {contractedDepots.map((d) => {
                      const allocation = allocationByDepotId.get(d.depotId)
                      const available = allocation ? Math.round(allocation.availableTeu) : null
                      return (
                        <MenuItem key={d.depotId} value={d.depotId}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {d.depotName}
                            </Typography>
                            {allocation && (
                              <Typography variant="caption" color="text.secondary">
                                {Math.round(allocation.atYardTeu)} TEU at yard · {available} TEU available
                                {allocation.hasCapacity ? '' : ' · at limit'}
                              </Typography>
                            )}
                          </Box>
                        </MenuItem>
                      )
                    })}
                  </Select>
                </FormControl>
              </Stack>
              {selectedDailyAllocation && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    mb: 2,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: hexToRgba(primaryDark, 0.1),
                    bgcolor: hexToRgba(primaryDark, 0.02),
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.25 }}>
                    {selectedDailyAllocation.depotName}
                  </Typography>
                  <CyFillDepotAllocationStrip allocation={selectedDailyAllocation} />
                </Paper>
              )}
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveDaily}
                disabled={saving || dailyDepotId === ''}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              >
                Save daily assignment
              </Button>
            </Paper>
          )}
        </>
      )}
    </Box>
  )
}
