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
  FormControlLabel,
  Paper,
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
import CyContractsMasterTab from '../../components/admin/CyContractsMasterTab'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined'
import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  containerSizeApi,
  containerTypeApi,
  depotApi,
  paymentApi,
  shippingLineApi,
  type ContainerSizeMaster,
  type ContainerTypeMaster,
  type Depot,
  type ShippingLine,
} from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { formatDateTime, formatPeso } from '../../utils/datetime'

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
  const [successMessage, setSuccessMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [lines, setLines] = useState<ShippingLine[]>([])
  const [depots, setDepots] = useState<Depot[]>([])
  const [containerSizes, setContainerSizes] = useState<ContainerSizeMaster[]>([])
  const [containerTypes, setContainerTypes] = useState<ContainerTypeMaster[]>([])
  const [loading, setLoading] = useState(true)

  const [lineDialog, setLineDialog] = useState<'create' | 'edit' | null>(null)
  const [depotDialog, setDepotDialog] = useState<'create' | 'edit' | null>(null)
  const [sizeDialog, setSizeDialog] = useState<'create' | 'edit' | null>(null)
  const [typeDialog, setTypeDialog] = useState<'create' | 'edit' | null>(null)

  const [selectedLine, setSelectedLine] = useState<ShippingLine | null>(null)
  const [selectedDepot, setSelectedDepot] = useState<Depot | null>(null)
  const [selectedSize, setSelectedSize] = useState<ContainerSizeMaster | null>(null)
  const [selectedType, setSelectedType] = useState<ContainerTypeMaster | null>(null)

  const [lineForm, setLineForm] = useState({ name: '', code: '', isActive: true })
  const [depotForm, setDepotForm] = useState({ name: '', address: '', capacity: 100, isActive: true })
  const [sizeForm, setSizeForm] = useState({ label: '', teu: 2, sortOrder: 1, isActive: true })
  const [typeForm, setTypeForm] = useState({ code: '', label: '', sortOrder: 1, isActive: true })
  const [returnFeeAmount, setReturnFeeAmount] = useState('5000')
  const [returnFeeUpdatedAt, setReturnFeeUpdatedAt] = useState<string | null>(null)
  const [paymentSettingsSaving, setPaymentSettingsSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([
      shippingLineApi.list(),
      depotApi.listAdmin(),
      containerSizeApi.list(),
      containerTypeApi.list(),
      paymentApi.getSettings(),
    ])
      .then(([l, d, sizes, types, paymentSettings]) => {
        setLines(l.data)
        setDepots(d.data)
        setContainerSizes(sizes.data)
        setContainerTypes(types.data)
        setReturnFeeAmount(String(paymentSettings.data.returnFeeAmount))
        setReturnFeeUpdatedAt(paymentSettings.data.updatedAt)
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
      containerSizes: containerSizes.length,
      activeSizes: containerSizes.filter((s) => s.isActive).length,
      containerTypes: containerTypes.length,
      activeTypes: containerTypes.filter((t) => t.isActive).length,
    }),
    [lines, depots, containerSizes, containerTypes],
  )

  const saveReturnFee = async () => {
    const amount = Number(returnFeeAmount)
    if (!amount || amount <= 0) {
      setError('Pre-advised fee must be greater than zero.')
      setSuccessMessage('')
      return
    }
    setPaymentSettingsSaving(true)
    setError('')
    setSuccessMessage('')
    try {
      const { data } = await paymentApi.updateSettings(amount)
      setReturnFeeAmount(String(data.returnFeeAmount))
      setReturnFeeUpdatedAt(data.updatedAt)
      setSuccessMessage(`Pre-advised fee updated to ${formatPeso(data.returnFeeAmount)}.`)
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to update pre-advised fee.'))
    } finally {
      setPaymentSettingsSaving(false)
    }
  }

  if (user?.role !== 'Administrator') {
    return <Navigate to="/" replace />
  }

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

  const openCreateSize = () => {
    setSizeForm({ label: '', teu: 2, sortOrder: containerSizes.length + 1, isActive: true })
    setSizeDialog('create')
  }

  const openEditSize = (size: ContainerSizeMaster) => {
    setSelectedSize(size)
    setSizeForm({ label: size.label, teu: size.teu, sortOrder: size.sortOrder, isActive: size.isActive })
    setSizeDialog('edit')
  }

  const saveSize = async () => {
    setSubmitting(true)
    setError('')
    try {
      if (sizeDialog === 'create') {
        await containerSizeApi.create(sizeForm)
      } else if (selectedSize) {
        await containerSizeApi.update(selectedSize.id, sizeForm)
      }
      setSizeDialog(null)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save container size.'))
    } finally {
      setSubmitting(false)
    }
  }

  const deactivateSize = async (size: ContainerSizeMaster) => {
    if (!window.confirm(`Deactivate container size ${size.label}'?`)) return
    setError('')
    try {
      await containerSizeApi.deactivate(size.id)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to deactivate container size.'))
    }
  }

  const openCreateType = () => {
    setTypeForm({ code: '', label: '', sortOrder: containerTypes.length + 1, isActive: true })
    setTypeDialog('create')
  }

  const openEditType = (type: ContainerTypeMaster) => {
    setSelectedType(type)
    setTypeForm({ code: type.code, label: type.label, sortOrder: type.sortOrder, isActive: type.isActive })
    setTypeDialog('edit')
  }

  const saveType = async () => {
    setSubmitting(true)
    setError('')
    try {
      if (typeDialog === 'create') {
        await containerTypeApi.create(typeForm)
      } else if (selectedType) {
        await containerTypeApi.update(selectedType.id, typeForm)
      }
      setTypeDialog(null)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save container type.'))
    } finally {
      setSubmitting(false)
    }
  }

  const deactivateType = async (type: ContainerTypeMaster) => {
    if (!window.confirm(`Deactivate container type ${type.code}?`)) return
    setError('')
    try {
      await containerTypeApi.deactivate(type.id)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to deactivate container type.'))
    }
  }

  const tabActions =
    tab < 4 ? (
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={
          tab === 0
            ? openCreateLine
            : tab === 1
              ? openCreateDepot
              : tab === 2
                ? openCreateSize
                : openCreateType
        }
        sx={{ fontWeight: 700, borderRadius: 2 }}
      >
        {tab === 0
          ? 'Add shipping line'
          : tab === 1
            ? 'Add depot'
            : tab === 2
              ? 'Add container size'
              : 'Add container type'}
      </Button>
    ) : null

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
              Manage shipping lines, container yards, container sizes, and container types.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <SummaryCard label="Shipping lines" value={summary.lines} color={primaryDark} />
        <SummaryCard label="Active depots" value={summary.activeDepots} color="#2E7D32" />
        <SummaryCard label="Container sizes" value={summary.activeSizes} color="#00A3E0" />
        <SummaryCard label="Container types" value={summary.activeTypes} color="#6A1B9A" />
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
            <Tab label={`Container sizes (${summary.containerSizes})`} />
            <Tab label={`Container types (${summary.containerTypes})`} />
            <Tab label="Pre-advised fee" />
            <Tab label="CY contracts" />
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
                    <TableCell>Size (ft)</TableCell>
                    <TableCell align="right">TEU</TableCell>
                    <TableCell>Sort order</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {containerSizes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
                        No container sizes.
                      </TableCell>
                    </TableRow>
                  ) : (
                    containerSizes.map((size) => (
                      <TableRow key={size.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                        <TableCell sx={{ fontWeight: 700, color: primaryDark }}>{size.label}&apos;</TableCell>
                        <TableCell align="right">{size.teu.toFixed(1)}</TableCell>
                        <TableCell>{size.sortOrder}</TableCell>
                        <TableCell>
                          <Chip
                            label={size.isActive ? 'Active' : 'Inactive'}
                            color={size.isActive ? 'success' : 'default'}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditOutlinedIcon />}
                            onClick={() => openEditSize(size)}
                            sx={{ fontWeight: 600, borderRadius: 2, mr: 0.5 }}
                          >
                            Edit
                          </Button>
                          {size.isActive && (
                            <Button
                              size="small"
                              color="error"
                              variant="outlined"
                              onClick={() => deactivateSize(size)}
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

      {tab === 3 && (
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
                    <TableCell>Code</TableCell>
                    <TableCell>Label</TableCell>
                    <TableCell>Sort order</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {containerTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
                        No container types.
                      </TableCell>
                    </TableRow>
                  ) : (
                    containerTypes.map((type) => (
                      <TableRow key={type.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                        <TableCell>
                          <Chip label={type.code} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: primaryDark }}>{type.label}</TableCell>
                        <TableCell>{type.sortOrder}</TableCell>
                        <TableCell>
                          <Chip
                            label={type.isActive ? 'Active' : 'Inactive'}
                            color={type.isActive ? 'success' : 'default'}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditOutlinedIcon />}
                            onClick={() => openEditType(type)}
                            sx={{ fontWeight: 600, borderRadius: 2, mr: 0.5 }}
                          >
                            Edit
                          </Button>
                          {type.isActive && (
                            <Button
                              size="small"
                              color="error"
                              variant="outlined"
                              onClick={() => deactivateType(type)}
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

      {tab === 4 && (
        <Paper elevation={0} sx={{ ...tablePaperSx, p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 3 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: hexToRgba(primaryDark, 0.08),
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <PaymentsOutlinedIcon sx={{ color: primaryDark }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: primaryDark }}>
                Pre-advised fee
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 560 }}>
                Calibrate the fixed pre-advised fee truckers pay for each scheduled container return. This amount
                appears on the trucker payment page and is applied automatically when proof is submitted.
              </Typography>
            </Box>
          </Box>

          <Box sx={{ maxWidth: 420 }}>
            <TextField
              fullWidth
              label="Pre-advised fee (PHP)"
              type="number"
              value={returnFeeAmount}
              onChange={(e) => setReturnFeeAmount(e.target.value)}
              sx={fieldSx}
              slotProps={{ htmlInput: { min: 1, step: 1 } }}
              helperText={
                returnFeeUpdatedAt
                  ? `Last updated ${formatDateTime(returnFeeUpdatedAt)}`
                  : 'Set the pre-advised fee truckers see before uploading proof.'
              }
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                onClick={saveReturnFee}
                disabled={paymentSettingsSaving}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              >
                {paymentSettingsSaving ? 'Saving…' : 'Save pre-advised fee'}
              </Button>
            </Box>
            <Paper
              elevation={0}
              sx={{
                mt: 3,
                p: 2,
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: hexToRgba(primaryDark, 0.02),
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Preview (trucker view)
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: primaryDark, mt: 0.5 }}>
                {formatPeso(Number(returnFeeAmount) || 0)}
              </Typography>
            </Paper>
          </Box>
        </Paper>
      )}

      {tab === 5 && (
        <Paper elevation={0} sx={{ ...tablePaperSx, p: 2 }}>
          <CyContractsMasterTab />
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

      <Dialog open={sizeDialog !== null} onClose={() => setSizeDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {sizeDialog === 'create' ? 'Add container size' : 'Edit container size'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="Size (ft)"
            value={sizeForm.label}
            onChange={(e) => setSizeForm({ ...sizeForm, label: e.target.value })}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            margin="normal"
            label="TEU"
            type="number"
            slotProps={{ htmlInput: { min: 0.1, step: 0.1 } }}
            value={sizeForm.teu}
            onChange={(e) => setSizeForm({ ...sizeForm, teu: Number(e.target.value) })}
            helperText="Twenty-foot equivalent units consumed per container of this size"
            sx={fieldSx}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Sort order"
            type="number"
            value={sizeForm.sortOrder}
            onChange={(e) => setSizeForm({ ...sizeForm, sortOrder: Number(e.target.value) })}
            sx={fieldSx}
          />
          {sizeDialog === 'edit' && (
            <FormControlLabel
              control={
                <Switch
                  checked={sizeForm.isActive}
                  onChange={(e) => setSizeForm({ ...sizeForm, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSizeDialog(null)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveSize}
            disabled={submitting || !sizeForm.label.trim() || sizeForm.teu <= 0}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={typeDialog !== null} onClose={() => setTypeDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {typeDialog === 'create' ? 'Add container type' : 'Edit container type'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="Code"
            value={typeForm.code}
            onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value.toUpperCase() })}
            placeholder="e.g. GP, HC, RF"
            sx={fieldSx}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Label"
            value={typeForm.label}
            onChange={(e) => setTypeForm({ ...typeForm, label: e.target.value })}
            placeholder="e.g. General Purpose"
            sx={fieldSx}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Sort order"
            type="number"
            value={typeForm.sortOrder}
            onChange={(e) => setTypeForm({ ...typeForm, sortOrder: Number(e.target.value) })}
            sx={fieldSx}
          />
          {typeDialog === 'edit' && (
            <FormControlLabel
              control={
                <Switch
                  checked={typeForm.isActive}
                  onChange={(e) => setTypeForm({ ...typeForm, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setTypeDialog(null)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveType}
            disabled={submitting || !typeForm.code.trim() || !typeForm.label.trim()}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
