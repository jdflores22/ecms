import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { InlineLoadingSkeleton } from '../layout/SkeletonPrimitives'
import {
  ListMobileCard,
  ListMobileChipRow,
  ListMobileTitle,
} from '../layout/ListPagePrimitives'
import { containerInventoryApi, withdrawalApi, type ContainerDwellCompliance, type ContainerInventoryItem } from '../../services/api'
import { formatContainerSizeLabel, formatContainerSummary } from '../../utils/containerSize'
import {
  dedupeInventoryByContainer,
  inventoryItemToLine,
  inventoryRowKey,
  normalizeContainerNo,
  type SizeOption,
  type TypeOption,
} from '../../utils/atwInventoryLines'
import type { WithdrawalLineFormValue } from './WithdrawalLineGrid'

interface AtwInventoryLinePickerProps {
  lines: WithdrawalLineFormValue[]
  onChange: (lines: WithdrawalLineFormValue[]) => void
  containerSizes: SizeOption[]
  containerTypes: TypeOption[]
  currentDepotId: number | ''
  shippingLineId: number
  disabled?: boolean
  hideSectionCaption?: boolean
  onBlockersChange?: (blocked: boolean) => void
}

function lineKey(line: WithdrawalLineFormValue) {
  return `${line.containerNo}|${line.containerSizeId}|${line.containerTypeId}`
}

function complianceColor(status: ContainerDwellCompliance) {
  if (status === 'Overstay') return 'error'
  if (status === 'ApproachingLimit') return 'warning'
  return 'success'
}

export default function AtwInventoryLinePicker({
  lines,
  onChange,
  containerSizes,
  containerTypes,
  currentDepotId,
  shippingLineId,
  disabled = false,
  hideSectionCaption = false,
  onBlockersChange,
}: AtwInventoryLinePickerProps) {
  const [inventory, setInventory] = useState<ContainerInventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [pickerValue, setPickerValue] = useState<ContainerInventoryItem | null>(null)
  const [duplicateWarnings, setDuplicateWarnings] = useState<Record<string, string>>({})
  const [pendingRemoveIndex, setPendingRemoveIndex] = useState<number | null>(null)

  useEffect(() => {
    if (currentDepotId === '') {
      setInventory([])
      setLoadError('')
      return
    }

    setLoading(true)
    setLoadError('')
    containerInventoryApi
      .list({ depotId: currentDepotId, shippingLineId, yardStatus: 'AtYard' })
      .then(({ data }) => setInventory(dedupeInventoryByContainer(data.items)))
      .catch(() => setLoadError('Failed to load CY inventory for this yard.'))
      .finally(() => setLoading(false))
  }, [currentDepotId, shippingLineId])

  useEffect(() => {
    if (currentDepotId === '') {
      setDuplicateWarnings({})
      return
    }

    const timer = window.setTimeout(() => {
      const checks = lines.map(async (line) => {
        const key = lineKey(line)
        if (!line.containerNo.trim() || line.containerSizeId === '' || line.containerTypeId === '') {
          return { key, warning: null as string | null }
        }
        try {
          const { data } = await withdrawalApi.checkDuplicate({
            currentDepotId: currentDepotId as number,
            containerNo: line.containerNo.trim().toUpperCase(),
            containerSizeId: line.containerSizeId as number,
            containerTypeId: line.containerTypeId as number,
          })
          return {
            key,
            warning: data.isDuplicate
              ? `Already on ${data.referenceNo ?? 'another request'} (${data.status ?? ''})`
              : null,
          }
        } catch {
          return { key, warning: null }
        }
      })

      void Promise.all(checks).then((results) => {
        const next: Record<string, string> = {}
        for (const result of results) {
          if (result.warning) next[result.key] = result.warning
        }
        setDuplicateWarnings(next)
      })
    }, 400)

    return () => window.clearTimeout(timer)
  }, [lines, currentDepotId])

  const selectedContainerNos = useMemo(
    () => new Set(lines.map((line) => normalizeContainerNo(line.containerNo)).filter(Boolean)),
    [lines],
  )

  const availableItems = useMemo(
    () => inventory.filter((item) => !selectedContainerNos.has(normalizeContainerNo(item.containerNo))),
    [inventory, selectedContainerNos],
  )

  const inventoryByContainerNo = useMemo(() => {
    const map = new Map<string, ContainerInventoryItem>()
    for (const item of inventory) {
      const key = normalizeContainerNo(item.containerNo)
      if (key) map.set(key, item)
    }
    return map
  }, [inventory])

  const addItem = (item: ContainerInventoryItem | null) => {
    if (!item || disabled) return
    const line = inventoryItemToLine(item, containerSizes, containerTypes)
    if (!line) return
    if (selectedContainerNos.has(normalizeContainerNo(item.containerNo))) return
    onChange([...lines, line])
    setPickerValue(null)
  }

  const removeLine = (index: number) => {
    onChange(lines.filter((_, i) => i !== index))
  }

  const pendingRemoveLine = pendingRemoveIndex !== null ? lines[pendingRemoveIndex] : null

  const confirmRemove = () => {
    if (pendingRemoveIndex === null) return
    removeLine(pendingRemoveIndex)
    setPendingRemoveIndex(null)
  }

  const sizeLabel = (id: number | '') => {
    if (id === '') return '—'
    return formatContainerSizeLabel(containerSizes.find((s) => s.id === id)?.label ?? '')
  }

  const typeLabel = (id: number | '') => {
    if (id === '') return '—'
    return containerTypes.find((t) => t.id === id)?.label ?? '—'
  }

  const hasDuplicateBlock = Object.keys(duplicateWarnings).length > 0

  useEffect(() => {
    onBlockersChange?.(hasDuplicateBlock)
  }, [hasDuplicateBlock, onBlockersChange])

  return (
    <Box>
      {!hideSectionCaption && (
        <Typography
          component="span"
          variant="caption"
          sx={{
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            color: 'text.secondary',
            mb: 1.5,
            display: 'block',
          }}
        >
          Containers at CY ({lines.length})
        </Typography>
      )}

      {currentDepotId === '' ? (
        <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>
          Select the current container yard above to load units from CY inventory.
        </Alert>
      ) : loading ? (
        <InlineLoadingSkeleton rows={3} />
      ) : loadError ? (
        <Alert severity="error" sx={{ borderRadius: 2, mb: 2 }}>
          {loadError}
        </Alert>
      ) : inventory.length === 0 ? (
        <Alert
          severity="warning"
          sx={{ borderRadius: 2, mb: 2 }}
          action={
            <Button
              component={RouterLink}
              to="/evaluations/container-inventory"
              size="small"
              endIcon={<OpenInNewIcon />}
              sx={{ fontWeight: 600 }}
            >
              CY inventory
            </Button>
          }
        >
          No containers at this yard in CY inventory. ATW can only authorize withdrawal of units physically at the CY.
        </Alert>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Pick units one at a time below, or use <strong>Bulk select</strong> to choose many from a dedicated page.
          </Typography>
          {!disabled && (
            <Autocomplete
              options={availableItems}
              value={pickerValue}
              onChange={(_, value) => addItem(value)}
              getOptionLabel={(item) =>
                formatContainerSummary(item.containerNo, item.containerSize, item.containerType)
              }
              isOptionEqualToValue={(a, b) =>
                normalizeContainerNo(a.containerNo) === normalizeContainerNo(b.containerNo)
              }
              renderOption={(props, item) => {
                const { key: _muiKey, ...optionProps } = props
                return (
                  <Box component="li" key={inventoryRowKey(item)} {...optionProps}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, flex: 1, minWidth: 0 }}>
                      {item.containerNo}
                    </Typography>
                    <Chip size="small" label={item.source} variant="outlined" sx={{ fontWeight: 600 }} />
                    <Typography variant="caption" color="text.secondary">
                      {formatContainerSizeLabel(item.containerSize)} {item.containerType} · {item.dwellDays}d at yard
                    </Typography>
                  </Box>
                </Box>
                )
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Add container from CY inventory"
                  placeholder="Search container number…"
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              )}
              disabled={availableItems.length === 0}
              noOptionsText={
                lines.length > 0 ? 'All yard containers already added to this ATW' : 'No matching containers'
              }
            />
          )}
        </>
      )}

      {lines.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
            gap: 1.5,
            mb: 1,
          }}
        >
          {lines.map((line, index) => {
            const key = lineKey(line)
            const warning = duplicateWarnings[key]
            const inventoryItem = inventoryByContainerNo.get(normalizeContainerNo(line.containerNo))
            return (
              <ListMobileCard key={key}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#0B3D91',
                      bgcolor: 'rgba(11, 61, 145, 0.08)',
                    }}
                  >
                    {index + 1}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <ListMobileChipRow>
                      <ListMobileTitle>
                        <Box component="span" sx={{ fontFamily: 'monospace' }}>
                          {line.containerNo}
                        </Box>
                      </ListMobileTitle>
                      {!disabled && (
                        <IconButton
                          size="small"
                          aria-label={`Remove ${line.containerNo}`}
                          onClick={() => setPendingRemoveIndex(index)}
                          sx={{ ml: 'auto', mt: -0.5, mr: -0.5 }}
                        >
                          <DeleteOutlinedIcon fontSize="small" />
                        </IconButton>
                      )}
                    </ListMobileChipRow>
                    <Box sx={{ mt: 0.75, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      <Chip
                        size="small"
                        label={sizeLabel(line.containerSizeId)}
                        sx={{ fontWeight: 600 }}
                      />
                      <Chip size="small" label={typeLabel(line.containerTypeId)} variant="outlined" sx={{ fontWeight: 600 }} />
                      {inventoryItem != null && (
                        <Chip
                          size="small"
                          label={`${inventoryItem.dwellDays}d dwell`}
                          color={complianceColor(inventoryItem.complianceStatus)}
                          sx={{ fontWeight: 600 }}
                        />
                      )}
                    </Box>
                    {warning && (
                      <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.75 }}>
                        {warning}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </ListMobileCard>
            )
          })}
        </Box>
      )}

      {hasDuplicateBlock && (
        <Alert severity="warning" sx={{ borderRadius: 2, mt: 1 }}>
          Remove or replace containers that are already on another active withdrawal before issuing this ATW.
        </Alert>
      )}

      {currentDepotId !== '' && !loading && inventory.length > 0 && lines.length === 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2,
            border: '1px dashed',
            borderColor: 'divider',
            bgcolor: 'rgba(11, 61, 145, 0.02)',
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Add at least one container from CY inventory to issue this ATW.
          </Typography>
        </Paper>
      )}

      <Dialog
        open={pendingRemoveLine !== null}
        onClose={() => setPendingRemoveIndex(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Remove container?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Remove{' '}
            <Box component="span" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'text.primary' }}>
              {pendingRemoveLine?.containerNo}
            </Box>{' '}
            from this ATW? You can add it again from CY inventory.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPendingRemoveIndex(null)} sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={confirmRemove} sx={{ fontWeight: 700, borderRadius: 2 }}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
