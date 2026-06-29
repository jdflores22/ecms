import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  containerSizeApi,
  depotApi,
  shippingLineApi,
  shippingLineDepotContractApi,
  type ContainerSizeMaster,
  type Depot,
  type ShippingLine,
  type ShippingLineDepotContract,
} from '../../services/api'
import {
  formatCyCountSplit,
  getCapacityDisplayLabel,
  isSecondaryCapacitySize,
} from '../../utils/cyAllocation'

const primaryDark = '#0B3D91'
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }
const tableHeadSx = {
  bgcolor: 'rgba(11, 61, 145, 0.04)',
  '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', py: 1.75 },
}

type SizeCountForm = Record<number, number | ''>

function emptySizeForm(sizes: ContainerSizeMaster[]): SizeCountForm {
  return Object.fromEntries(sizes.map((s) => [s.id, '']))
}

function sizeFormFromContract(contract: ShippingLineDepotContract, sizes: ContainerSizeMaster[]): SizeCountForm {
  const form = emptySizeForm(sizes)
  for (const row of contract.sizes) {
    const match =
      sizes.find((s) => s.id === row.containerSizeId) ??
      sizes.find((s) => getCapacityDisplayLabel(s.label) === row.sizeLabel)
    if (match) form[match.id] = row.contractCount
  }
  return form
}

function buildSizePayload(form: SizeCountForm) {
  return Object.entries(form)
    .filter(([, count]) => typeof count === 'number' && count > 0)
    .map(([containerSizeId, contractCount]) => ({
      containerSizeId: Number(containerSizeId),
      contractCount: Number(contractCount),
    }))
}

export default function CyContractsMasterTab() {
  const [contracts, setContracts] = useState<ShippingLineDepotContract[]>([])
  const [lines, setLines] = useState<ShippingLine[]>([])
  const [depots, setDepots] = useState<Depot[]>([])
  const [containerSizes, setContainerSizes] = useState<ContainerSizeMaster[]>([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<ShippingLineDepotContract | null>(null)
  const [form, setForm] = useState({
    shippingLineId: '' as number | '',
    depotId: '' as number | '',
    isActive: true,
  })
  const [sizeForm, setSizeForm] = useState<SizeCountForm>({})
  const [submitting, setSubmitting] = useState(false)

  const activeSizes = useMemo(
    () =>
      containerSizes
        .filter((s) => s.isActive && !isSecondaryCapacitySize(s.label))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
    [containerSizes],
  )

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      shippingLineDepotContractApi.list(),
      shippingLineApi.list(),
      depotApi.listAdmin(),
      containerSizeApi.list(),
    ])
      .then(([c, l, d, sizes]) => {
        setContracts(c.data)
        setLines(l.data.filter((x) => x.isActive))
        setDepots(d.data.filter((x) => x.isActive))
        setContainerSizes(sizes.data)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setForm({
      shippingLineId: lines[0]?.id ?? '',
      depotId: depots[0]?.id ?? '',
      isActive: true,
    })
    setSizeForm(emptySizeForm(activeSizes))
    setDialog('create')
  }

  const openEdit = (contract: ShippingLineDepotContract) => {
    setSelected(contract)
    setForm({
      shippingLineId: contract.shippingLineId,
      depotId: contract.depotId,
      isActive: contract.isActive,
    })
    setSizeForm(sizeFormFromContract(contract, activeSizes))
    setDialog('edit')
  }

  const save = async () => {
    if (form.shippingLineId === '' || form.depotId === '') return
    const sizes = buildSizePayload(sizeForm)
    if (sizes.length === 0) return
    setSubmitting(true)
    try {
      if (dialog === 'create') {
        await shippingLineDepotContractApi.create({
          shippingLineId: Number(form.shippingLineId),
          depotId: Number(form.depotId),
          sizes,
        })
      } else if (selected) {
        await shippingLineDepotContractApi.update(selected.id, {
          sizes,
          isActive: form.isActive,
        })
      }
      setDialog(null)
      load()
    } finally {
      setSubmitting(false)
    }
  }

  const deactivate = async (contract: ShippingLineDepotContract) => {
    if (!window.confirm(`Deactivate contract ${contract.shippingLineName} @ ${contract.depotName}?`)) return
    await shippingLineDepotContractApi.deactivate(contract.id)
    load()
  }

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
        Set maximum container counts per size for each shipping line and container yard. Sizes{' '}
        <strong>40 / 45</strong> share one pool (one slot whether the container is 40 or 45).
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={openCreate}
        disabled={lines.length === 0 || depots.length === 0 || activeSizes.length === 0}
        sx={{ fontWeight: 700, borderRadius: 2, mb: 2 }}
      >
        Add CY contract
      </Button>
      {loading ? (
        <CircularProgress sx={{ color: primaryDark }} />
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={tableHeadSx}>
                <TableCell>Shipping line</TableCell>
                <TableCell>Container yard</TableCell>
                <TableCell>Contract by size</TableCell>
                <TableCell>Usage (pre-forecasted · booking)</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
                    No CY contracts configured.
                  </TableCell>
                </TableRow>
              ) : (
                contracts.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ fontWeight: 700, color: primaryDark }}>{c.shippingLineName}</TableCell>
                    <TableCell>{c.depotName}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {c.sizes.map((size) => (
                          <Chip
                            key={size.containerSizeId}
                            size="small"
                            label={`${getCapacityDisplayLabel(size.sizeLabel)}: ${size.contractCount}`}
                            sx={{ fontWeight: 600 }}
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {c.sizes.map((size) => (
                          <Typography key={size.containerSizeId} variant="body2">
                            {getCapacityDisplayLabel(size.sizeLabel)}:{' '}
                            {formatCyCountSplit(size.preAdvisedCount, 0)} · {size.availableCount} available
                          </Typography>
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={c.isActive ? 'Active' : 'Inactive'}
                        color={c.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => openEdit(c)}>
                        Edit
                      </Button>
                      {c.isActive && (
                        <Button size="small" color="error" onClick={() => deactivate(c)} sx={{ ml: 0.5 }}>
                          Deactivate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialog !== null} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {dialog === 'create' ? 'Add CY contract' : 'Edit CY contract'}
        </DialogTitle>
        <DialogContent>
          {dialog === 'create' ? (
            <>
              <FormControl fullWidth margin="normal" required sx={fieldSx}>
                <InputLabel>Shipping line</InputLabel>
                <Select
                  label="Shipping line"
                  value={form.shippingLineId}
                  onChange={(e) => setForm({ ...form, shippingLineId: e.target.value as number })}
                >
                  {lines.map((line) => (
                    <MenuItem key={line.id} value={line.id}>
                      {line.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth margin="normal" required sx={fieldSx}>
                <InputLabel>Container yard</InputLabel>
                <Select
                  label="Container yard"
                  value={form.depotId}
                  onChange={(e) => setForm({ ...form, depotId: e.target.value as number })}
                >
                  {depots.map((depot) => (
                    <MenuItem key={depot.id} value={depot.id}>
                      {depot.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          ) : selected ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {selected.shippingLineName} · {selected.depotName}
            </Typography>
          ) : null}

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1, mb: 1 }}>
            Contract allocation by container size
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}>
            {activeSizes.map((size) => (
              <TextField
                key={size.id}
                fullWidth
                label={`${getCapacityDisplayLabel(size.label)} (max containers)`}
                type="number"
                value={sizeForm[size.id] ?? ''}
                onChange={(e) => {
                  const raw = e.target.value
                  setSizeForm({
                    ...sizeForm,
                    [size.id]: raw === '' ? '' : Math.max(0, Number(raw)),
                  })
                }}
                slotProps={{ htmlInput: { min: 0 } }}
                sx={fieldSx}
              />
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Enter at least one size with a count of 1 or more. 40 / 45 use a single shared limit.
          </Typography>

          {dialog === 'edit' && (
            <FormControlLabel
              control={
                <Switch
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
              }
              label="Active"
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog(null)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={save} disabled={submitting} sx={{ fontWeight: 700 }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
