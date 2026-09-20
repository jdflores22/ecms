import { ListLoadingState } from '../../components/layout/ListPagePrimitives'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
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
import type { ReactNode } from 'react'
import CyContractsMasterTab from '../../components/admin/CyContractsMasterTab'
import {
  ListDesktopOnly,
  ListMobileCard,
  ListMobileChipRow,
  ListMobileMeta,
  ListMobileOnly,
  ListMobileTitle,
  listMobileActionsSx,
  listPageRootSx,
  listTablePaperSx,
  PageHero,
} from '../../components/layout/ListPagePrimitives'
import {appColors, ICS_PRIMARY } from '../../theme/colors'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import StraightenOutlinedIcon from '@mui/icons-material/StraightenOutlined'
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined'
import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  containerSizeApi,
  containerTypeApi,
  depotApi,
  paymentApi,
  shippingLineApi,
  shippingLinePaymentConfigApi,
  type ContainerSizeMaster,
  type ContainerTypeMaster,
  type Depot,
  type ShippingLine,
} from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { portalColors } from '../../theme/portalTheme'
import {
  formatDateTime,
  formatDepotOperatingHourLabel,
  formatDepotOperatingRange,
  formatPeso,
} from '../../utils/datetime'

const DEPOT_BOOKABLE_HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour)

type SettingsSection =
  | 'payments'
  | 'shipping-lines'
  | 'depots'
  | 'container-sizes'
  | 'container-types'
  | 'cy-contracts'

const SETTINGS_SECTIONS: {
  id: SettingsSection
  label: string
  description: string
  icon: ReactNode
  group: string
}[] = [
  {
    id: 'payments',
    label: 'Payments',
    description: 'Pre-advised fee and PayMongo checkout options.',
    icon: <PaymentsOutlinedIcon fontSize="small" />,
    group: 'Billing',
  },
  {
    id: 'shipping-lines',
    label: 'Shipping lines',
    description: 'Carriers, codes, and per-line demurrage payment config.',
    icon: <LocalShippingOutlinedIcon fontSize="small" />,
    group: 'Reference data',
  },
  {
    id: 'depots',
    label: 'Container yards',
    description: 'Daily return limits, hourly slot capacity, and bookable operating hours per CY.',
    icon: <WarehouseOutlinedIcon fontSize="small" />,
    group: 'Reference data',
  },
  {
    id: 'container-sizes',
    label: 'Container sizes',
    description: 'Size labels, TEU factors, and display order.',
    icon: <StraightenOutlinedIcon fontSize="small" />,
    group: 'Reference data',
  },
  {
    id: 'container-types',
    label: 'Container types',
    description: 'Type codes such as GP, HC, and RF.',
    icon: <Inventory2OutlinedIcon fontSize="small" />,
    group: 'Reference data',
  },
  {
    id: 'cy-contracts',
    label: 'CY contracts',
    description: 'Shipping line contracts with container yards.',
    icon: <HandshakeOutlinedIcon fontSize="small" />,
    group: 'Operations',
  },
]

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

const tablePaperSx = {
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: '#fff',
  boxShadow: appColors.surfaceShadow,
  overflow: 'hidden',
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function SettingsNavButton({
  label,
  icon,
  selected,
  onClick,
}: {
  label: string
  icon: ReactNode
  selected: boolean
  onClick: () => void
}) {
  return (
    <ListItemButton
      selected={selected}
      onClick={onClick}
      sx={{
        borderRadius: '0.5rem',
        mb: 0.5,
        px: 1.5,
        py: 1.25,
        borderLeft: '4px solid',
        borderColor: selected ? portalColors.primary : 'transparent',
        bgcolor: selected ? portalColors.brandSoft : 'transparent',
        color: selected ? portalColors.primary : portalColors.textMuted,
        '&:hover': {
          bgcolor: selected ? portalColors.brandSoft : portalColors.bgMuted,
          color: selected ? portalColors.primary : portalColors.textDark,
        },
        '&.Mui-selected': {
          bgcolor: portalColors.brandSoft,
          color: portalColors.primary,
          '&:hover': { bgcolor: portalColors.brandSoft },
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>{icon}</ListItemIcon>
      <ListItemText
        primary={label}
        slotProps={{ primary: { sx: { fontSize: '0.875rem', fontWeight: selected ? 600 : 500 } } }}
      />
    </ListItemButton>
  )
}

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

export default function AdminSettingsPage() {
  const user = useAppSelector((s) => s.auth.user)
  const [activeSection, setActiveSection] = useState<SettingsSection>('payments')
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
  const [depotForm, setDepotForm] = useState({
    name: '',
    address: '',
    capacity: 100,
    containersPerHour: 3,
    operatingHourStart: 8,
    operatingHourEnd: 17,
    isActive: true,
  })
  const [sizeForm, setSizeForm] = useState({ label: '', teu: 2, sortOrder: 1, isActive: true })
  const [typeForm, setTypeForm] = useState({ code: '', label: '', sortOrder: 1, isActive: true })
  const [returnFeeAmount, setReturnFeeAmount] = useState('5000')
  const [returnFeeUpdatedAt, setReturnFeeUpdatedAt] = useState<string | null>(null)
  const [paymentSettingsSaving, setPaymentSettingsSaving] = useState(false)
  const [payMongoEnabled, setPayMongoEnabled] = useState(false)
  const [allowProofUpload, setAllowProofUpload] = useState(true)
  const [payMongoConfigured, setPayMongoConfigured] = useState(false)
  const [linePayMongoEnabled, setLinePayMongoEnabled] = useState(false)
  const [lineAllowProofUpload, setLineAllowProofUpload] = useState(true)
  const [linePayMongoSecretKey, setLinePayMongoSecretKey] = useState('')
  const [lineHasPayMongoSecretKey, setLineHasPayMongoSecretKey] = useState(false)
  const [linePayMongoPlatformConfigured, setLinePayMongoPlatformConfigured] = useState(false)

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
        setPayMongoEnabled(paymentSettings.data.payMongoEnabled)
        setAllowProofUpload(paymentSettings.data.allowProofUpload)
        setPayMongoConfigured(paymentSettings.data.payMongoConfigured)
      })
      .catch(() => setError('Failed to load settings.'))
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

  const settingsGroups = useMemo(
    () => [...new Set(SETTINGS_SECTIONS.map((section) => section.group))],
    [],
  )

  const savePayMongoSettings = async () => {
    setPaymentSettingsSaving(true)
    setError('')
    setSuccessMessage('')
    try {
      const { data } = await paymentApi.updatePayMongoSettings(payMongoEnabled, allowProofUpload)
      setPayMongoEnabled(data.payMongoEnabled)
      setAllowProofUpload(data.allowProofUpload)
      setPayMongoConfigured(data.payMongoConfigured)
      setSuccessMessage(
        data.payMongoEnabled
          ? 'PayMongo enabled for pre-forecast payments.'
          : 'PayMongo disabled for pre-forecast payments.',
      )
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to update PayMongo settings.'))
    } finally {
      setPaymentSettingsSaving(false)
    }
  }

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
      setError(apiErrorMessage(err, 'Failed to update pre-forecasted fee.'))
    } finally {
      setPaymentSettingsSaving(false)
    }
  }

  if (user?.role !== 'Administrator') {
    return <Navigate to="/" replace />
  }

  const tableHeadSx = {
    bgcolor: hexToRgba(ICS_PRIMARY, 0.04),
    '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', py: 1.75 },
  }

  const openCreateLine = () => {
    setLineForm({ name: '', code: '', isActive: true })
    setLineDialog('create')
  }

  const openEditLine = async (line: ShippingLine) => {
    setSelectedLine(line)
    setLineForm({ name: line.name, code: line.code, isActive: line.isActive })
    setLinePayMongoSecretKey('')
    setLineDialog('edit')
    try {
      const { data } = await shippingLinePaymentConfigApi.get(line.id)
      setLinePayMongoEnabled(data.payMongoEnabled)
      setLineAllowProofUpload(data.allowProofUpload)
      setLineHasPayMongoSecretKey(data.hasPayMongoSecretKey)
      setLinePayMongoPlatformConfigured(data.payMongoPlatformConfigured)
    } catch {
      setLinePayMongoEnabled(false)
      setLineAllowProofUpload(true)
      setLineHasPayMongoSecretKey(false)
      setLinePayMongoPlatformConfigured(false)
    }
  }

  const saveLine = async () => {
    setSubmitting(true)
    setError('')
    try {
      if (lineDialog === 'create') {
        await shippingLineApi.create({ name: lineForm.name, code: lineForm.code })
      } else if (selectedLine) {
        await shippingLineApi.update(selectedLine.id, lineForm)
        await shippingLinePaymentConfigApi.update(selectedLine.id, {
          payMongoEnabled: linePayMongoEnabled,
          allowProofUpload: lineAllowProofUpload,
          payMongoSecretKey: linePayMongoSecretKey.trim() || undefined,
        })
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
    setDepotForm({
      name: '',
      address: '',
      capacity: 100,
      containersPerHour: 3,
      operatingHourStart: 8,
      operatingHourEnd: 17,
      isActive: true,
    })
    setDepotDialog('create')
  }

  const openEditDepot = (depot: Depot) => {
    setSelectedDepot(depot)
    setDepotForm({
      name: depot.name,
      address: depot.address,
      capacity: depot.capacity,
      containersPerHour: depot.containersPerHour ?? 3,
      operatingHourStart: depot.operatingHourStart ?? 8,
      operatingHourEnd: depot.operatingHourEnd ?? 17,
      isActive: depot.isActive,
    })
    setDepotDialog('edit')
  }

  const saveDepot = async () => {
    if (depotForm.operatingHourStart > depotForm.operatingHourEnd) {
      setError('Operating start hour cannot be after the end hour.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      if (depotDialog === 'create') {
        await depotApi.create({
          name: depotForm.name,
          address: depotForm.address,
          capacity: depotForm.capacity,
          containersPerHour: depotForm.containersPerHour,
          operatingHourStart: depotForm.operatingHourStart,
          operatingHourEnd: depotForm.operatingHourEnd,
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

  const activeSectionMeta = SETTINGS_SECTIONS.find((section) => section.id === activeSection)

  const sectionAction =
    activeSection === 'shipping-lines'
      ? { label: 'Add shipping line', onClick: openCreateLine }
      : activeSection === 'depots'
        ? { label: 'Add depot', onClick: openCreateDepot }
        : activeSection === 'container-sizes'
          ? { label: 'Add container size', onClick: openCreateSize }
          : activeSection === 'container-types'
            ? { label: 'Add container type', onClick: openCreateType }
            : null

  return (
    <Box sx={listPageRootSx}>
      <PageHero
        icon={<SettingsOutlinedIcon />}
        title="Settings"
        subtitle="Configure payments, reference data, and container yard contracts for the platform."
      />

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

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: portalColors.border,
          bgcolor: portalColors.bgWhite,
          boxShadow: appColors.surfaceShadow,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: { xs: 'block', lg: 'grid' },
            gridTemplateColumns: { lg: '280px minmax(0, 1fr)' },
            minHeight: { lg: 560 },
          }}
        >
          <Box
            sx={{
              borderBottom: { xs: `1px solid ${portalColors.border}`, lg: 'none' },
              borderRight: { lg: `1px solid ${portalColors.border}` },
              bgcolor: portalColors.bgWhite,
              p: { xs: 2, lg: 2 },
            }}
          >
            <Typography
              sx={{
                display: { xs: 'none', lg: 'block' },
                px: 1.5,
                mb: 1,
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: portalColors.textMuted,
              }}
            >
              Sections
            </Typography>

            <FormControl fullWidth sx={{ display: { xs: 'block', lg: 'none' }, mb: 2 }}>
              <InputLabel>Settings section</InputLabel>
              <Select
                label="Settings section"
                value={activeSection}
                onChange={(e) => setActiveSection(e.target.value as SettingsSection)}
              >
                {SETTINGS_SECTIONS.map((section) => (
                  <MenuItem key={section.id} value={section.id}>
                    {section.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <List disablePadding sx={{ display: { xs: 'none', lg: 'block' } }}>
              {settingsGroups.map((group) => (
                <Box key={group} sx={{ mb: 1.5 }}>
                  <Typography
                    sx={{
                      px: 1.5,
                      mb: 0.5,
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: portalColors.textLight,
                    }}
                  >
                    {group}
                  </Typography>
                  {SETTINGS_SECTIONS.filter((section) => section.group === group).map((section) => {
                    const countLabel =
                      section.id === 'shipping-lines'
                        ? ` (${summary.activeLines})`
                        : section.id === 'depots'
                          ? ` (${summary.depots})`
                          : section.id === 'container-sizes'
                            ? ` (${summary.containerSizes})`
                            : section.id === 'container-types'
                              ? ` (${summary.containerTypes})`
                              : ''

                    return (
                      <SettingsNavButton
                        key={section.id}
                        label={`${section.label}${countLabel}`}
                        icon={section.icon}
                        selected={activeSection === section.id}
                        onClick={() => setActiveSection(section.id)}
                      />
                    )
                  })}
                </Box>
              ))}
            </List>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Box
              sx={{
                px: { xs: 2, md: 3 },
                py: 2,
                borderBottom: `1px solid ${portalColors.border}`,
                bgcolor: portalColors.bgMuted,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
              }}
            >
              <Box>
                <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: portalColors.textDark }}>
                  {activeSectionMeta?.label ?? 'Settings'}
                </Typography>
                <Typography sx={{ mt: 0.5, fontSize: '0.875rem', color: portalColors.textMuted }}>
                  {activeSectionMeta?.description}
                </Typography>
              </Box>
              {sectionAction && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={sectionAction.onClick}
                  sx={{ fontWeight: 700, borderRadius: 2 }}
                >
                  {sectionAction.label}
                </Button>
              )}
            </Box>

            <Box sx={{ p: { xs: 2, md: 2.5 } }}>
      {activeSection === 'shipping-lines' && (
        <Paper elevation={0} sx={listTablePaperSx}>
          {loading ? (
            <ListLoadingState />
          ) : lines.length === 0 ? (
            <Typography sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
              No shipping lines.
            </Typography>
          ) : (
            <>
              <ListMobileOnly>
                {lines.map((line) => (
                  <ListMobileCard key={line.id}>
                    <ListMobileTitle>{line.name}</ListMobileTitle>
                    <ListMobileChipRow>
                      <Chip label={line.code} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                      <Chip
                        label={line.isActive ? 'Active' : 'Inactive'}
                        color={line.isActive ? 'success' : 'default'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </ListMobileChipRow>
                    <Box sx={listMobileActionsSx}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EditOutlinedIcon />}
                        onClick={() => openEditLine(line)}
                        sx={{ fontWeight: 600, borderRadius: 2 }}
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
                    </Box>
                  </ListMobileCard>
                ))}
              </ListMobileOnly>

              <ListDesktopOnly>
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
                      {lines.map((line) => (
                        <TableRow key={line.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                          <TableCell sx={{ fontWeight: 700, color: ICS_PRIMARY }}>{line.name}</TableCell>
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
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </ListDesktopOnly>
            </>
          )}
        </Paper>
      )}

      {activeSection === 'depots' && (
        <Paper elevation={0} sx={listTablePaperSx}>
          {loading ? (
            <ListLoadingState />
          ) : depots.length === 0 ? (
            <Typography sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
              No depots.
            </Typography>
          ) : (
            <>
              <ListMobileOnly>
                {depots.map((depot) => (
                  <ListMobileCard key={depot.id}>
                    <ListMobileTitle>{depot.name}</ListMobileTitle>
                    <ListMobileMeta>{depot.address || '—'}</ListMobileMeta>
                    <ListMobileChipRow>
                      <Chip
                        label={`Daily: ${depot.capacity}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                      <Chip
                        label={`${depot.containersPerHour ?? 3}/hr`}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                      <Chip
                        label={formatDepotOperatingRange(
                          depot.operatingHourStart ?? 8,
                          depot.operatingHourEnd ?? 17,
                        )}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                      <Chip
                        label={depot.isActive ? 'Active' : 'Inactive'}
                        color={depot.isActive ? 'success' : 'default'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </ListMobileChipRow>
                    <Box sx={listMobileActionsSx}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EditOutlinedIcon />}
                        onClick={() => openEditDepot(depot)}
                        sx={{ fontWeight: 600, borderRadius: 2 }}
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
                    </Box>
                  </ListMobileCard>
                ))}
              </ListMobileOnly>

              <ListDesktopOnly>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={tableHeadSx}>
                        <TableCell>Name</TableCell>
                        <TableCell>Address</TableCell>
                        <TableCell align="right">Daily cap.</TableCell>
                        <TableCell align="right">Per hour</TableCell>
                        <TableCell>Bookable hours</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {depots.map((depot) => (
                        <TableRow key={depot.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                          <TableCell sx={{ fontWeight: 700, color: ICS_PRIMARY }}>{depot.name}</TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {depot.address || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{depot.capacity}</TableCell>
                          <TableCell align="right">{depot.containersPerHour ?? 3}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {formatDepotOperatingRange(
                                depot.operatingHourStart ?? 8,
                                depot.operatingHourEnd ?? 17,
                              )}
                            </Typography>
                          </TableCell>
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
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </ListDesktopOnly>
            </>
          )}
        </Paper>
      )}

      {activeSection === 'container-sizes' && (
        <Paper elevation={0} sx={listTablePaperSx}>
          {loading ? (
            <ListLoadingState />
          ) : containerSizes.length === 0 ? (
            <Typography sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
              No container sizes.
            </Typography>
          ) : (
            <>
              <ListMobileOnly>
                {containerSizes.map((size) => (
                  <ListMobileCard key={size.id}>
                    <ListMobileTitle>{size.label}&apos;</ListMobileTitle>
                    <ListMobileMeta>
                      TEU: {size.teu.toFixed(1)} · Sort order: {size.sortOrder}
                    </ListMobileMeta>
                    <ListMobileChipRow>
                      <Chip
                        label={size.isActive ? 'Active' : 'Inactive'}
                        color={size.isActive ? 'success' : 'default'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </ListMobileChipRow>
                    <Box sx={listMobileActionsSx}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EditOutlinedIcon />}
                        onClick={() => openEditSize(size)}
                        sx={{ fontWeight: 600, borderRadius: 2 }}
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
                    </Box>
                  </ListMobileCard>
                ))}
              </ListMobileOnly>

              <ListDesktopOnly>
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
                      {containerSizes.map((size) => (
                        <TableRow key={size.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                          <TableCell sx={{ fontWeight: 700, color: ICS_PRIMARY }}>{size.label}&apos;</TableCell>
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
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </ListDesktopOnly>
            </>
          )}
        </Paper>
      )}

      {activeSection === 'container-types' && (
        <Paper elevation={0} sx={listTablePaperSx}>
          {loading ? (
            <ListLoadingState />
          ) : containerTypes.length === 0 ? (
            <Typography sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
              No container types.
            </Typography>
          ) : (
            <>
              <ListMobileOnly>
                {containerTypes.map((type) => (
                  <ListMobileCard key={type.id}>
                    <ListMobileTitle>{type.label}</ListMobileTitle>
                    <ListMobileChipRow>
                      <Chip label={type.code} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                      <Chip
                        label={type.isActive ? 'Active' : 'Inactive'}
                        color={type.isActive ? 'success' : 'default'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </ListMobileChipRow>
                    <ListMobileMeta>Sort order: {type.sortOrder}</ListMobileMeta>
                    <Box sx={listMobileActionsSx}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EditOutlinedIcon />}
                        onClick={() => openEditType(type)}
                        sx={{ fontWeight: 600, borderRadius: 2 }}
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
                    </Box>
                  </ListMobileCard>
                ))}
              </ListMobileOnly>

              <ListDesktopOnly>
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
                      {containerTypes.map((type) => (
                        <TableRow key={type.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                          <TableCell>
                            <Chip label={type.code} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: ICS_PRIMARY }}>{type.label}</TableCell>
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
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </ListDesktopOnly>
            </>
          )}
        </Paper>
      )}

      {activeSection === 'payments' && (
        <Paper elevation={0} sx={{ ...tablePaperSx, p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 3 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: hexToRgba(ICS_PRIMARY, 0.08),
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <PaymentsOutlinedIcon sx={{ color: ICS_PRIMARY }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: ICS_PRIMARY }}>
                Pre-advised fee
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 560 }}>
                Calibrate the fixed pre-forecasted fee truckers pay for each scheduled container return. This amount
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
                  : 'Set the pre-forecasted fee truckers see before uploading proof.'
              }
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                onClick={saveReturnFee}
                disabled={paymentSettingsSaving}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              >
                {paymentSettingsSaving ? 'Saving…' : 'Save pre-forecasted fee'}
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
                bgcolor: hexToRgba(ICS_PRIMARY, 0.02),
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Preview (trucker view)
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: ICS_PRIMARY, mt: 0.5 }}>
                {formatPeso(Number(returnFeeAmount) || 0)}
              </Typography>
            </Paper>
          </Box>

          <Divider sx={{ my: 4 }} />

          <Box sx={{ maxWidth: 520 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              PayMongo (pre-forecast payments)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enable online checkout for truckers. API keys are set in Railway env vars
              (<code>PAYMONGO_SECRET_KEY</code>, <code>PAYMONGO_WEBHOOK_SECRET</code>).
              Truckers can still upload proof when manual payment is allowed.
            </Typography>
            {!payMongoConfigured && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                PayMongo secret key is not configured on the server yet.
              </Alert>
            )}
            <FormControlLabel
              control={
                <Switch
                  checked={payMongoEnabled}
                  onChange={(e) => setPayMongoEnabled(e.target.checked)}
                />
              }
              label="Enable PayMongo for pre-forecast fee"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={allowProofUpload}
                  onChange={(e) => setAllowProofUpload(e.target.checked)}
                />
              }
              label="Allow manual proof upload (e-wallet, bank transfer, cash)"
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                onClick={() => void savePayMongoSettings()}
                disabled={paymentSettingsSaving}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              >
                {paymentSettingsSaving ? 'Saving…' : 'Save PayMongo settings'}
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {activeSection === 'cy-contracts' && (
        <Paper elevation={0} sx={{ ...tablePaperSx, p: 2 }}>
          <CyContractsMasterTab />
        </Paper>
      )}
            </Box>
          </Box>
        </Box>
      </Paper>

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
            <>
              <FormControlLabel
                control={
                  <Switch
                    checked={lineForm.isActive}
                    onChange={(e) => setLineForm({ ...lineForm, isActive: e.target.checked })}
                  />
                }
                label="Active"
              />
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Demurrage payments
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                Per-line PayMongo for demurrage charges. Leave secret key blank to use the platform key.
              </Typography>
              {!linePayMongoPlatformConfigured && !lineHasPayMongoSecretKey && (
                <Alert severity="warning" sx={{ mb: 1.5, borderRadius: 2 }}>
                  No PayMongo key configured for this line yet.
                </Alert>
              )}
              <FormControlLabel
                control={
                  <Switch
                    checked={linePayMongoEnabled}
                    onChange={(e) => setLinePayMongoEnabled(e.target.checked)}
                  />
                }
                label="Enable PayMongo for demurrage"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={lineAllowProofUpload}
                    onChange={(e) => setLineAllowProofUpload(e.target.checked)}
                  />
                }
                label="Allow cash/office proof upload"
              />
              <TextField
                fullWidth
                margin="normal"
                label="PayMongo secret key (optional)"
                type="password"
                value={linePayMongoSecretKey}
                onChange={(e) => setLinePayMongoSecretKey(e.target.value)}
                helperText={
                  lineHasPayMongoSecretKey
                    ? 'A key is saved. Enter a new value to replace it, or leave blank to keep.'
                    : 'Use platform key when empty.'
                }
                sx={fieldSx}
              />
            </>
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
            label="Daily capacity"
            type="number"
            value={depotForm.capacity}
            onChange={(e) => setDepotForm({ ...depotForm, capacity: Number(e.target.value) })}
            sx={fieldSx}
            helperText="Max empty returns per calendar day"
          />
          <TextField
            fullWidth
            margin="normal"
            label="Containers per hour"
            type="number"
            value={depotForm.containersPerHour}
            onChange={(e) => setDepotForm({ ...depotForm, containersPerHour: Number(e.target.value) })}
            sx={fieldSx}
            helperText={`Max empty returns per hourly slot (${formatDepotOperatingRange(
              depotForm.operatingHourStart,
              depotForm.operatingHourEnd,
            )})`}
          />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 0.5 }}>
            Bookable operating hours
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Hourly return slots are offered from start through end (inclusive). For 24-hour yards, use{' '}
            {formatDepotOperatingHourLabel(0)}–{formatDepotOperatingHourLabel(23)}.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl margin="normal" sx={{ flex: '1 1 140px', ...fieldSx }}>
              <InputLabel id="depot-hour-start-label">Start hour</InputLabel>
              <Select
                labelId="depot-hour-start-label"
                label="Start hour"
                value={depotForm.operatingHourStart}
                onChange={(e) =>
                  setDepotForm({ ...depotForm, operatingHourStart: Number(e.target.value) })
                }
              >
                {DEPOT_BOOKABLE_HOUR_OPTIONS.map((hour) => (
                  <MenuItem key={`start-${hour}`} value={hour}>
                    {formatDepotOperatingHourLabel(hour)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl margin="normal" sx={{ flex: '1 1 140px', ...fieldSx }}>
              <InputLabel id="depot-hour-end-label">End hour</InputLabel>
              <Select
                labelId="depot-hour-end-label"
                label="End hour"
                value={depotForm.operatingHourEnd}
                onChange={(e) =>
                  setDepotForm({ ...depotForm, operatingHourEnd: Number(e.target.value) })
                }
              >
                {DEPOT_BOOKABLE_HOUR_OPTIONS.map((hour) => (
                  <MenuItem key={`end-${hour}`} value={hour}>
                    {formatDepotOperatingHourLabel(hour)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
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
