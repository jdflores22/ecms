import {
  Alert,
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
  Paper,
  Select,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined'
import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  containerApi,
  depotApi,
  shippingLineApi,
  type ContainerMaster,
  type Depot,
  type ShippingLine,
} from '../../services/api'
import { useAppSelector } from '../../store/hooks'

const primaryDark = '#0B3D91'
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

const tablePaperSx = {
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: '#fff',
  boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
  overflow: 'hidden',
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#fff',
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, color, mt: 0.5 }}>
        {value}
      </Typography>
    </Paper>
  )
}

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

export default function MasterDataPage() {
  const user = useAppSelector((s) => s.auth.user)
  const [tab, setTab] = useState(0)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [lines, setLines] = useState<ShippingLine[]>([])
  const [depots, setDepots] = useState<Depot[]>([])
  const [containers, setContainers] = useState<ContainerMaster[]>([])
  const [loading, setLoading] = useState(true)

  const [lineDialog, setLineDialog] = useState<'create' | 'edit' | null>(null)
  const [depotDialog, setDepotDialog] = useState<'create' | 'edit' | null>(null)
  const [containerDialog, setContainerDialog] = useState<'create' | 'edit' | null>(null)

  const [selectedLine, setSelectedLine] = useState<ShippingLine | null>(null)
  const [selectedDepot, setSelectedDepot] = useState<Depot | null>(null)
  const [selectedContainer, setSelectedContainer] = useState<ContainerMaster | null>(null)

  const [lineForm, setLineForm] = useState({ name: '', code: '', isActive: true })
  const [depotForm, setDepotForm] = useState({ name: '', address: '', capacity: 100, isActive: true })
  const [containerForm, setContainerForm] = useState({
    containerNo: '',
    size: '40',
    type: 'HC',
    shippingLineId: '' as number | '',
  })

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([shippingLineApi.list(), depotApi.listAdmin(), containerApi.list()])
      .then(([l, d, c]) => {
        setLines(l.data)
        setDepots(d.data)
        setContainers(c.data)
      })
      .catch(() => setError('Failed to load master data.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (user?.role === 'Administrator') load()
  }, [user?.role, load])

  const summary = useMemo(
    () => ({
      lines: lines.length,
      activeLines: lines.filter((l) => l.isActive).length,
      depots: depots.length,
      activeDepots: depots.filter((d) => d.isActive).length,
      containers: containers.length,
    }),
    [lines, depots, containers],
  )

  if (user?.role !== 'Administrator') {
    return <Navigate to="/" replace />
  }

  const activeLines = lines.filter((l) => l.isActive)

  const tableHeadSx = {
    bgcolor: hexToRgba(primaryDark, 0.04),
    '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', py: 1.75 },
  }

  const openCreateLine = () => {
    setLineForm({ name: '', code: '', isActive: true })
    setLineDialog('create')
  }

  const openEditLine = (line: ShippingLine) => {
    setSelectedLine(line)
    setLineForm({ name: line.name, code: line.code, isActive: line.isActive })
    setLineDialog('edit')
  }

  const saveLine = async () => {
    setSubmitting(true)
    setError('')
    try {
      if (lineDialog === 'create') {
        await shippingLineApi.create({ name: lineForm.name, code: lineForm.code })
      } else if (selectedLine) {
        await shippingLineApi.update(selectedLine.id, lineForm)
      }
      setLineDialog(null)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save shipping line.'))
    } finally {
      setSubmitting(false)
    }
  }

  const deactivateLine = async (line: ShippingLine) => {
    if (!window.confirm(`Deactivate shipping line ${line.name}?`)) return
    setError('')
    try {
      await shippingLineApi.deactivate(line.id)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to deactivate shipping line.'))
    }
  }

  const openCreateDepot = () => {
    setDepotForm({ name: '', address: '', capacity: 100, isActive: true })
    setDepotDialog('create')
  }

  const openEditDepot = (depot: Depot) => {
    setSelectedDepot(depot)
    setDepotForm({
      name: depot.name,
      address: depot.address,
      capacity: depot.capacity,
      isActive: depot.isActive,
    })
    setDepotDialog('edit')
  }

  const saveDepot = async () => {
    setSubmitting(true)
    setError('')
    try {
      if (depotDialog === 'create') {
        await depotApi.create({
          name: depotForm.name,
          address: depotForm.address,
          capacity: depotForm.capacity,
        })
      } else if (selectedDepot) {
        await depotApi.update(selectedDepot.id, depotForm)
      }
      setDepotDialog(null)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save depot.'))
    } finally {
      setSubmitting(false)
    }
  }

  const deactivateDepot = async (depot: Depot) => {
    if (!window.confirm(`Deactivate depot ${depot.name}?`)) return
    setError('')
    try {
      await depotApi.deactivate(depot.id)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to deactivate depot.'))
    }
  }

  const openCreateContainer = () => {
    setContainerForm({
      containerNo: '',
      size: '40',
      type: 'HC',
      shippingLineId: activeLines[0]?.id ?? '',
    })
    setContainerDialog('create')
  }

  const openEditContainer = (container: ContainerMaster) => {
    setSelectedContainer(container)
    setContainerForm({
      containerNo: container.containerNo,
      size: container.size,
      type: container.type,
      shippingLineId: container.shippingLineId,
    })
    setContainerDialog('edit')
  }

  const saveContainer = async () => {
    if (containerForm.shippingLineId === '') return
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        containerNo: containerForm.containerNo,
        size: containerForm.size,
        type: containerForm.type,
        shippingLineId: Number(containerForm.shippingLineId),
      }
      if (containerDialog === 'create') {
        await containerApi.create(payload)
      } else if (selectedContainer) {
        await containerApi.update(selectedContainer.id, payload)
      }
      setContainerDialog(null)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save container.'))
    } finally {
      setSubmitting(false)
    }
  }

  const deleteContainer = async (container: ContainerMaster) => {
    if (!window.confirm(`Delete container ${container.containerNo}?`)) return
    setError('')
    try {
      await containerApi.delete(container.id)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to delete container.'))
    }
  }

  const tabActions = (
    <Button
      variant="contained"
      startIcon={<AddIcon />}
      onClick={tab === 0 ? openCreateLine : tab === 1 ? openCreateDepot : openCreateContainer}
      disabled={tab === 2 && activeLines.length === 0}
      sx={{ fontWeight: 700, borderRadius: 2 }}
    >
      {tab === 0 ? 'Add shipping line' : tab === 1 ? 'Add depot' : 'Add container'}
    </Button>
  )

  return (
    <Box>
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
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', position: 'relative' }}>
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
            <StorageOutlinedIcon />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              Master Data
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5, maxWidth: 520 }}>
              Manage shipping lines, container yards, and containers.
            </Typography>
          </Box>
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
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <SummaryCard label="Shipping lines" value={summary.lines} color={primaryDark} />
        <SummaryCard label="Active depots" value={summary.activeDepots} color="#2E7D32" />
        <SummaryCard label="Containers" value={summary.containers} color="#00A3E0" />
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
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 1,
            px: { xs: 1, sm: 2 },
            pt: 1,
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              minHeight: 48,
              '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minHeight: 48 },
              '& .Mui-selected': { color: primaryDark },
              '& .MuiTabs-indicator': { bgcolor: primaryDark, height: 3, borderRadius: '3px 3px 0 0' },
            }}
          >
            <Tab label={`Shipping lines (${summary.activeLines})`} />
            <Tab label={`Depots (${summary.depots})`} />
            <Tab label={`Containers (${summary.containers})`} />
          </Tabs>
          <Box sx={{ px: { xs: 1, sm: 0 }, pb: { xs: 1, sm: 0 } }}>{tabActions}</Box>
        </Box>
      </Paper>

      {tab === 0 && (
        <Paper elevation={0} sx={tablePaperSx}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
              <CircularProgress sx={{ color: primaryDark }} />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={tableHeadSx}>
                    <TableCell>Name</TableCell>
                    <TableCell>Code</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
                        No shipping lines.
                      </TableCell>
                    </TableRow>
                  ) : (
                    lines.map((line) => (
                      <TableRow key={line.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                        <TableCell sx={{ fontWeight: 700, color: primaryDark }}>{line.name}</TableCell>
                        <TableCell>
                          <Chip label={line.code} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={line.isActive ? 'Active' : 'Inactive'}
                            color={line.isActive ? 'success' : 'default'}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditOutlinedIcon />}
                            onClick={() => openEditLine(line)}
                            sx={{ fontWeight: 600, borderRadius: 2, mr: 0.5 }}
                          >
                            Edit
                          </Button>
                          {line.isActive && (
                            <Button
                              size="small"
                              color="error"
                              variant="outlined"
                              onClick={() => deactivateLine(line)}
                              sx={{ fontWeight: 600, borderRadius: 2 }}
                            >
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
        </Paper>
      )}

      {tab === 1 && (
        <Paper elevation={0} sx={tablePaperSx}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
              <CircularProgress sx={{ color: primaryDark }} />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={tableHeadSx}>
                    <TableCell>Name</TableCell>
                    <TableCell>Address</TableCell>
                    <TableCell align="right">Capacity</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {depots.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
                        No depots.
                      </TableCell>
                    </TableRow>
                  ) : (
                    depots.map((depot) => (
                      <TableRow key={depot.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                        <TableCell sx={{ fontWeight: 700, color: primaryDark }}>{depot.name}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {depot.address || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{depot.capacity}</TableCell>
                        <TableCell>
                          <Chip
                            label={depot.isActive ? 'Active' : 'Inactive'}
                            color={depot.isActive ? 'success' : 'default'}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditOutlinedIcon />}
                            onClick={() => openEditDepot(depot)}
                            sx={{ fontWeight: 600, borderRadius: 2, mr: 0.5 }}
                          >
                            Edit
                          </Button>
                          {depot.isActive && (
                            <Button
                              size="small"
                              color="error"
                              variant="outlined"
                              onClick={() => deactivateDepot(depot)}
                              sx={{ fontWeight: 600, borderRadius: 2 }}
                            >
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
        </Paper>
      )}

      {tab === 2 && (
        <Paper elevation={0} sx={tablePaperSx}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
              <CircularProgress sx={{ color: primaryDark }} />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={tableHeadSx}>
                    <TableCell>Container no.</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Shipping line</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {containers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
                        No containers.
                      </TableCell>
                    </TableRow>
                  ) : (
                    containers.map((c) => (
                      <TableRow key={c.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                        <TableCell sx={{ fontWeight: 700, color: primaryDark }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Inventory2OutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                            {c.containerNo}
                          </Box>
                        </TableCell>
                        <TableCell>{c.size}&apos;</TableCell>
                        <TableCell>
                          <Chip label={c.type} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                        </TableCell>
                        <TableCell>{c.shippingLineName}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditOutlinedIcon />}
                            onClick={() => openEditContainer(c)}
                            sx={{ fontWeight: 600, borderRadius: 2, mr: 0.5 }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            startIcon={<DeleteOutlinedIcon />}
                            onClick={() => deleteContainer(c)}
                            sx={{ fontWeight: 600, borderRadius: 2 }}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      <Dialog open={lineDialog !== null} onClose={() => setLineDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {lineDialog === 'create' ? 'Add shipping line' : 'Edit shipping line'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="Name"
            value={lineForm.name}
            onChange={(e) => setLineForm({ ...lineForm, name: e.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Code"
            value={lineForm.code}
            onChange={(e) => setLineForm({ ...lineForm, code: e.target.value })}
            sx={fieldSx}
          />
          {lineDialog === 'edit' && (
            <FormControlLabel
              control={
                <Switch
                  checked={lineForm.isActive}
                  onChange={(e) => setLineForm({ ...lineForm, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLineDialog(null)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveLine}
            disabled={submitting}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={depotDialog !== null} onClose={() => setDepotDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {depotDialog === 'create' ? 'Add depot' : 'Edit depot'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="Name"
            value={depotForm.name}
            onChange={(e) => setDepotForm({ ...depotForm, name: e.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Address"
            value={depotForm.address}
            onChange={(e) => setDepotForm({ ...depotForm, address: e.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Capacity"
            type="number"
            value={depotForm.capacity}
            onChange={(e) => setDepotForm({ ...depotForm, capacity: Number(e.target.value) })}
            sx={fieldSx}
          />
          {depotDialog === 'edit' && (
            <FormControlLabel
              control={
                <Switch
                  checked={depotForm.isActive}
                  onChange={(e) => setDepotForm({ ...depotForm, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDepotDialog(null)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveDepot}
            disabled={submitting}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={containerDialog !== null} onClose={() => setContainerDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {containerDialog === 'create' ? 'Add container' : 'Edit container'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="Container number"
            value={containerForm.containerNo}
            onChange={(e) => setContainerForm({ ...containerForm, containerNo: e.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Size (ft)"
            value={containerForm.size}
            onChange={(e) => setContainerForm({ ...containerForm, size: e.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Type"
            value={containerForm.type}
            onChange={(e) => setContainerForm({ ...containerForm, type: e.target.value })}
            sx={fieldSx}
          />
          <FormControl fullWidth margin="normal" required sx={fieldSx}>
            <InputLabel>Shipping line</InputLabel>
            <Select
              label="Shipping line"
              value={containerForm.shippingLineId}
              onChange={(e) =>
                setContainerForm({ ...containerForm, shippingLineId: e.target.value as number })
              }
            >
              {activeLines.map((line) => (
                <MenuItem key={line.id} value={line.id}>
                  {line.name} ({line.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setContainerDialog(null)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveContainer}
            disabled={submitting || containerForm.shippingLineId === ''}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
