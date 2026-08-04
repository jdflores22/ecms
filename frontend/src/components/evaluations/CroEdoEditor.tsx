import {
  Alert,
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import { useEffect, useState, type ReactNode } from 'react'
import { ICS_PRIMARY, sectionPaperSx } from '../layout/DetailPagePrimitives'
import {
  croEdoApi,
  depotApi,
  withdrawalApi,
  type CroEdo,
  type CroEdoLineInput,
  type CroEdoUpsertPayload,
  type Depot,
} from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { formatContainerSizeLabel } from '../../utils/containerSize'

type LineForm = CroEdoLineInput & {
  containerSizeId: number | ''
  containerTypeId: number | ''
}
type CatalogSize = { id: number; label: string }
type CatalogType = { id: number; code: string; label: string }
type HeaderForm = Omit<CroEdoUpsertPayload, 'lines'>

const primaryDark = ICS_PRIMARY
const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 2 },
  '& .MuiInputBase-input': { textTransform: 'uppercase' },
  '& .MuiSelect-select': { textTransform: 'uppercase' },
}

function toCaps(value: string) {
  return value.toUpperCase()
}

function emptyLine(): LineForm {
  return {
    containerNumber: '',
    size: '',
    type: '',
    seal: 'SEALED',
    haulerName: '',
    plateNo: '',
    demurrageValidUntil: '',
    returnEmptyToDepotId: null,
    returnEmptyToName: '',
    containerSizeId: '',
    containerTypeId: '',
  }
}

function headerFromItem(item: CroEdo): HeaderForm {
  return {
    consigneeNotifyParty: toCaps(item.consigneeNotifyParty),
    shippingLineCarrier: toCaps(item.shippingLineCarrier),
    registryNumber: toCaps(item.registryNumber),
    customsOffice: toCaps(item.customsOffice),
    vesselVoyageNumber: toCaps(item.vesselVoyageNumber),
    blNumber: toCaps(item.blNumber),
    brokerName: toCaps(item.brokerName),
  }
}

function linesFromItem(
  item: CroEdo,
  sizes: CatalogSize[],
  types: CatalogType[],
): LineForm[] {
  return item.lines.map((line) => {
    const sizeId =
      sizes.find((s) => toCaps(s.label) === toCaps(line.size) || formatContainerSizeLabel(s.label).toUpperCase() === toCaps(line.size))
        ?.id ?? ''
    const typeId =
      types.find((t) => toCaps(t.code) === toCaps(line.type) || toCaps(t.label) === toCaps(line.type))?.id ?? ''
    return {
      containerNumber: toCaps(line.containerNumber),
      size: toCaps(line.size),
      type: toCaps(line.type),
      seal: toCaps(line.seal),
      haulerName: toCaps(line.haulerName),
      plateNo: toCaps(line.plateNo),
      lineReferenceNo: line.lineReferenceNo,
      demurrageValidUntil: line.demurrageValidUntil,
      returnEmptyToDepotId: line.returnEmptyToDepotId ?? null,
      returnEmptyToName: toCaps(line.returnEmptyToName),
      containerSizeId: sizeId,
      containerTypeId: typeId,
    }
  })
}

export type CroEdoEditorProps = {
  mode: 'create' | 'edit'
  initial?: CroEdo
  onSaved: (item: CroEdo) => void
  onCancel?: () => void
  aside?: ReactNode
  footerExtra?: ReactNode
}

export default function CroEdoEditor({
  mode,
  initial,
  onSaved,
  onCancel,
  aside,
  footerExtra,
}: CroEdoEditorProps) {
  const user = useAppSelector((s) => s.auth.user)
  const [depots, setDepots] = useState<Depot[]>([])
  const [containerSizes, setContainerSizes] = useState<CatalogSize[]>([])
  const [containerTypes, setContainerTypes] = useState<CatalogType[]>([])
  const [shippingLineName, setShippingLineName] = useState('')
  const [lookupsLoading, setLookupsLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const evaluatorName = toCaps(user?.fullName?.trim() || user?.username || '')
  const [form, setForm] = useState<HeaderForm>(() =>
    initial
      ? headerFromItem(initial)
      : {
          consigneeNotifyParty: '',
          shippingLineCarrier: '',
          registryNumber: '',
          customsOffice: '',
          vesselVoyageNumber: '',
          blNumber: '',
          brokerName: '',
        },
  )
  const [lines, setLines] = useState<LineForm[]>(() => [emptyLine()])

  useEffect(() => {
    let cancelled = false
    setLookupsLoading(true)

    // Same catalog source as trucker /preforecast/new (active ContainerSizes / ContainerTypes).
    // Evaluators use withdrawals/evaluator-lookups; truckers use preforecast/lookups.
    Promise.all([depotApi.list(), withdrawalApi.evaluatorLookups()])
      .then(([depotRes, lookupsRes]) => {
        if (cancelled) return
        const sizes = lookupsRes.data.containerSizes ?? []
        const types = lookupsRes.data.containerTypes ?? []
        setDepots(depotRes.data.filter((x) => x.isActive !== false))
        setContainerSizes(sizes)
        setContainerTypes(types)
        setShippingLineName(toCaps(lookupsRes.data.shippingLine.name))
        if (initial) {
          setForm(headerFromItem(initial))
          setLines(linesFromItem(initial, sizes, types))
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load form options from database.')
      })
      .finally(() => {
        if (!cancelled) setLookupsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [initial])

  const updateLine = (index: number, patch: Partial<LineForm>) => {
    const next: Partial<LineForm> = { ...patch }
    for (const [key, value] of Object.entries(patch)) {
      if (typeof value === 'string' && key !== 'demurrageValidUntil') {
        ;(next as Record<string, unknown>)[key] = toCaps(value)
      }
    }
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...next } : line)))
  }

  const setLineSize = (index: number, sizeId: number | '') => {
    const size = typeof sizeId === 'number' ? containerSizes.find((s) => s.id === sizeId) : undefined
    updateLine(index, {
      containerSizeId: sizeId,
      size: size ? toCaps(size.label) : '',
    })
  }

  const setLineType = (index: number, typeId: number | '') => {
    const type = typeof typeId === 'number' ? containerTypes.find((t) => t.id === typeId) : undefined
    updateLine(index, {
      containerTypeId: typeId,
      type: type ? toCaps(type.code) : '',
    })
  }

  const buildPayload = (): CroEdoUpsertPayload => ({
    consigneeNotifyParty: toCaps(form.consigneeNotifyParty),
    shippingLineCarrier: toCaps(form.shippingLineCarrier || shippingLineName),
    registryNumber: toCaps(form.registryNumber),
    customsOffice: toCaps(form.customsOffice),
    vesselVoyageNumber: toCaps(form.vesselVoyageNumber),
    blNumber: toCaps(form.blNumber),
    brokerName: toCaps(form.brokerName),
    authorizedByName: evaluatorName,
    authorizedByCompany: toCaps(shippingLineName),
    preparedByName: evaluatorName,
    lines: lines.map((line) => {
      const size =
        typeof line.containerSizeId === 'number'
          ? containerSizes.find((s) => s.id === line.containerSizeId)
          : undefined
      const type =
        typeof line.containerTypeId === 'number'
          ? containerTypes.find((t) => t.id === line.containerTypeId)
          : undefined
      return {
        containerNumber: toCaps(line.containerNumber),
        size: toCaps(size?.label || line.size),
        type: toCaps(type?.code || line.type),
        seal: toCaps(line.seal),
        haulerName: toCaps(line.haulerName),
        plateNo: toCaps(line.plateNo),
        lineReferenceNo: line.lineReferenceNo,
        demurrageValidUntil: line.demurrageValidUntil,
        returnEmptyToDepotId: line.returnEmptyToDepotId || null,
        returnEmptyToName: toCaps(
          line.returnEmptyToName ||
            depots.find((d) => d.id === line.returnEmptyToDepotId)?.name ||
            '',
        ),
      }
    }),
  })

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const payload = buildPayload()
      const { data } =
        mode === 'edit' && initial
          ? await croEdoApi.update(initial.id, payload)
          : await croEdoApi.create(payload)
      onSaved(data)
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          (mode === 'edit' ? 'Failed to update CRO/eDO.' : 'Failed to create CRO/eDO.'),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: aside ? 'minmax(0, 1fr) 300px' : '1fr' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              Release header
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              }}
            >
              {(
                [
                  ['consigneeNotifyParty', 'Consignee / Notify Party'],
                  ['shippingLineCarrier', 'Shipping Line / Carrier (optional)'],
                  ['registryNumber', 'Registry Number'],
                  ['customsOffice', 'Customs Office'],
                  ['vesselVoyageNumber', 'Vessel / Voyage Number'],
                  ['blNumber', 'BL Number'],
                  ['brokerName', 'Name of Broker'],
                ] as const
              ).map(([key, label]) => (
                <TextField
                  key={key}
                  fullWidth
                  size="small"
                  label={label}
                  value={form[key] || ''}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: toCaps(e.target.value) }))}
                  sx={fieldSx}
                />
              ))}
              <TextField
                fullWidth
                size="small"
                label="Authorized By"
                value={evaluatorName}
                disabled
                helperText="Logged-in evaluator (auto)"
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Prepared By"
                value={evaluatorName}
                disabled
                helperText="Same as Authorized By (auto)"
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                label="Authorized By Company"
                value={shippingLineName}
                disabled
                helperText="Your shipping line (auto)"
                sx={{ ...fieldSx, gridColumn: { md: '1 / -1' } }}
              />
            </Box>
          </Paper>

          <Paper elevation={0} sx={{ ...sectionPaperSx, mb: 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Containers & empty return
              </Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setLines((prev) => [...prev, emptyLine()])} sx={{ fontWeight: 600 }}>
                Add line
              </Button>
            </Box>

            {lines.map((line, index) => (
              <Paper
                key={index}
                elevation={0}
                sx={{
                  p: 2,
                  mb: 1.5,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'rgba(11, 61, 145, 0.02)',
                  '&:last-child': { mb: 0 },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: primaryDark }}>
                    Line {index + 1}
                  </Typography>
                  <IconButton
                    size="small"
                    disabled={lines.length === 1}
                    onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <DeleteOutlinedIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Box
                  sx={{
                    display: 'grid',
                    gap: 1.5,
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
                  }}
                >
                  <TextField
                    fullWidth
                    size="small"
                    label="Container Number"
                    value={line.containerNumber}
                    onChange={(e) => updateLine(index, { containerNumber: e.target.value })}
                    sx={fieldSx}
                  />
                  <FormControl fullWidth size="small" required sx={fieldSx} disabled={lookupsLoading || containerSizes.length === 0}>
                    <InputLabel>Size</InputLabel>
                    <Select
                      label="Size"
                      value={line.containerSizeId}
                      onChange={(e) => setLineSize(index, e.target.value as number | '')}
                    >
                      {containerSizes.length === 0 ? (
                        <MenuItem disabled value="">
                          No sizes configured — contact admin
                        </MenuItem>
                      ) : (
                        containerSizes.map((size) => (
                          <MenuItem key={size.id} value={size.id}>
                            {formatContainerSizeLabel(size.label)}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small" required sx={fieldSx} disabled={lookupsLoading || containerTypes.length === 0}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      label="Type"
                      value={line.containerTypeId}
                      onChange={(e) => setLineType(index, e.target.value as number | '')}
                    >
                      {containerTypes.length === 0 ? (
                        <MenuItem disabled value="">
                          No types configured — contact admin
                        </MenuItem>
                      ) : (
                        containerTypes.map((type) => (
                          <MenuItem key={type.id} value={type.id}>
                            {type.code} — {type.label}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    size="small"
                    label="Seal"
                    value={line.seal}
                    onChange={(e) => updateLine(index, { seal: e.target.value })}
                    sx={fieldSx}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Plate No."
                    value={line.plateNo}
                    onChange={(e) => updateLine(index, { plateNo: e.target.value })}
                    sx={fieldSx}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Name of Hauler"
                    value={line.haulerName}
                    onChange={(e) => updateLine(index, { haulerName: e.target.value })}
                    sx={{ ...fieldSx, gridColumn: { md: 'span 2' } }}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Demurrage Validity (free time)"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={line.demurrageValidUntil}
                    onChange={(e) => updateLine(index, { demurrageValidUntil: e.target.value })}
                    helperText="Until 2400H — after this, detention may apply"
                    sx={fieldSx}
                  />
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Return Empty To (depot)"
                    value={line.returnEmptyToDepotId ?? ''}
                    onChange={(e) => {
                      const depotId = e.target.value === '' ? null : Number(e.target.value)
                      updateLine(index, {
                        returnEmptyToDepotId: depotId,
                        returnEmptyToName: depotId
                          ? depots.find((d) => d.id === depotId)?.name || ''
                          : line.returnEmptyToName,
                      })
                    }}
                    sx={fieldSx}
                  >
                    <MenuItem value="">— FREE TEXT / OTHER —</MenuItem>
                    {depots.map((d) => (
                      <MenuItem key={d.id} value={d.id}>
                        {toCaps(d.name)}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    fullWidth
                    size="small"
                    label="Return Empty To (name)"
                    value={line.returnEmptyToName}
                    onChange={(e) => updateLine(index, { returnEmptyToName: e.target.value })}
                    helperText="eDO empty-return destination"
                    sx={{ ...fieldSx, gridColumn: { md: 'span 2' } }}
                  />
                </Box>
              </Paper>
            ))}
          </Paper>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {onCancel && (
              <Button variant="outlined" onClick={onCancel} sx={{ borderRadius: 2, fontWeight: 600 }}>
                Cancel
              </Button>
            )}
            <Button
              variant="contained"
              disabled={saving}
              onClick={save}
              sx={{ borderRadius: 2, fontWeight: 700, bgcolor: primaryDark }}
            >
              {saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Save draft'}
            </Button>
            {footerExtra}
          </Box>
        </Box>

        {aside}
      </Box>
    </Box>
  )
}
