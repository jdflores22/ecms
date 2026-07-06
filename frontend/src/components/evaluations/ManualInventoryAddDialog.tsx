import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Tab, Tabs, TextField, Typography } from '@mui/material'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  containerInventoryApi,
  containerSizeApi,
  containerTypeApi,
  cyAllocationApi,
  type ContainerSizeMaster,
  type ContainerTypeMaster,
  type CyAllocation,
} from '../../services/api'

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

const BULK_TEMPLATE = `containerNo,depot,size,type,yardInDate
ABCD1234567,Manila CY,20,GP,2026-01-15`

interface ManualInventoryAddDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }
    if ((ch === ',' && !inQuotes) || ch === '\t') {
      result.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  result.push(current.trim())
  return result
}

function parseYardInDate(raw: string): string | null {
  const value = raw.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  return value
}

export default function ManualInventoryAddDialog({ open, onClose, onSaved }: ManualInventoryAddDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState(0)
  const [loadingLookups, setLoadingLookups] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [bulkErrors, setBulkErrors] = useState<{ line: number; containerNo: string; message: string }[]>([])
  const [bulkSuccess, setBulkSuccess] = useState<number | null>(null)

  const [depots, setDepots] = useState<CyAllocation[]>([])
  const [sizes, setSizes] = useState<ContainerSizeMaster[]>([])
  const [types, setTypes] = useState<ContainerTypeMaster[]>([])

  const [containerNo, setContainerNo] = useState('')
  const [depotId, setDepotId] = useState<number | ''>('')
  const [containerSizeId, setContainerSizeId] = useState<number | ''>('')
  const [containerTypeId, setContainerTypeId] = useState<number | ''>('')
  const [yardInDate, setYardInDate] = useState('')
  const [remarks, setRemarks] = useState('')
  const [bulkText, setBulkText] = useState('')

  const resetForm = useCallback(() => {
    setContainerNo('')
    setDepotId('')
    setContainerSizeId('')
    setContainerTypeId('')
    setYardInDate('')
    setRemarks('')
    setBulkText('')
    setError('')
    setBulkErrors([])
    setBulkSuccess(null)
    setTab(0)
  }, [])

  const loadLookups = useCallback(() => {
    setLoadingLookups(true)
    Promise.all([cyAllocationApi.list(), containerSizeApi.list(), containerTypeApi.list()])
      .then(([depotRes, sizeRes, typeRes]) => {
        setDepots(depotRes.data)
        setSizes(sizeRes.data.filter((s) => s.isActive))
        setTypes(typeRes.data.filter((t) => t.isActive))
      })
      .catch(() => setError('Failed to load form options.'))
      .finally(() => setLoadingLookups(false))
  }, [])

  useEffect(() => {
    if (open) {
      resetForm()
      loadLookups()
    }
  }, [open, resetForm, loadLookups])

  const depotByName = useMemo(() => {
    const map = new Map<string, CyAllocation>()
    for (const d of depots) map.set(d.depotName.trim().toLowerCase(), d)
    return map
  }, [depots])

  const sizeByLabel = useMemo(() => {
    const map = new Map<string, ContainerSizeMaster>()
    for (const s of sizes) map.set(s.label.trim().toLowerCase(), s)
    return map
  }, [sizes])

  const typeByCode = useMemo(() => {
    const map = new Map<string, ContainerTypeMaster>()
    for (const t of types) {
      map.set(t.code.trim().toLowerCase(), t)
      map.set(t.label.trim().toLowerCase(), t)
    }
    return map
  }, [types])

  const resolveDepotId = (raw: string): number | null => {
    const trimmed = raw.trim()
    if (/^\d+$/.test(trimmed)) {
      const id = Number(trimmed)
      return depots.some((d) => d.depotId === id) ? id : null
    }
    return depotByName.get(trimmed.toLowerCase())?.depotId ?? null
  }

  const parseBulkRows = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)

    const rows: {
      line: number
      containerNo: string
      containerSizeId: number
      containerTypeId: number
      depotId: number
      yardInDate: string
      remarks?: string
      error?: string
    }[] = []

    for (let i = 0; i < lines.length; i++) {
      const lineNo = i + 1
      const cols = parseCsvLine(lines[i])
      if (i === 0 && cols[0]?.toLowerCase() === 'containerno') continue

      if (cols.length < 5) {
        rows.push({
          line: lineNo,
          containerNo: cols[0] ?? '',
          containerSizeId: 0,
          containerTypeId: 0,
          depotId: 0,
          yardInDate: '',
          error: 'Expected columns: containerNo, depot, size, type, yardInDate',
        })
        continue
      }

      const [no, depotRaw, sizeRaw, typeRaw, dateRaw, remarksRaw] = cols
      const resolvedDepotId = resolveDepotId(depotRaw)
      const size = sizeByLabel.get(sizeRaw.trim().toLowerCase())
      const type = typeByCode.get(typeRaw.trim().toLowerCase())
      const date = parseYardInDate(dateRaw)

      let rowError: string | undefined
      if (!no?.trim()) rowError = 'Container number is required.'
      else if (!resolvedDepotId) rowError = `Unknown container yard "${depotRaw}".`
      else if (!size) rowError = `Unknown size "${sizeRaw}".`
      else if (!type) rowError = `Unknown type "${typeRaw}".`
      else if (!date) rowError = `Invalid yard-in date "${dateRaw}" (use YYYY-MM-DD).`

      rows.push({
        line: lineNo,
        containerNo: no?.trim().toUpperCase() ?? '',
        containerSizeId: size?.id ?? 0,
        containerTypeId: type?.id ?? 0,
        depotId: resolvedDepotId ?? 0,
        yardInDate: date ?? '',
        remarks: remarksRaw?.trim() || undefined,
        error: rowError,
      })
    }

    return rows
  }

  const parsedBulk = useMemo(() => parseBulkRows(bulkText), [bulkText, depotByName, sizeByLabel, typeByCode])

  const handleFileUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => setBulkText(String(reader.result ?? ''))
    reader.readAsText(file)
  }

  const saveSingle = async () => {
    if (depotId === '' || containerSizeId === '' || containerTypeId === '' || !containerNo.trim() || !yardInDate) {
      setError('Fill in all required fields.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await containerInventoryApi.createManual({
        containerNo: containerNo.trim().toUpperCase(),
        containerSizeId,
        containerTypeId,
        depotId,
        yardInDate,
        remarks: remarks.trim() || undefined,
      })
      onSaved()
      onClose()
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      setError(message ?? 'Failed to add container.')
    } finally {
      setSubmitting(false)
    }
  }

  const saveBulk = async () => {
    const valid = parsedBulk.filter((r) => !r.error)
    const localErrors = parsedBulk.filter((r) => r.error).map((r) => ({
      line: r.line,
      containerNo: r.containerNo,
      message: r.error!,
    }))

    if (valid.length === 0) {
      setBulkErrors(localErrors.length ? localErrors : [{ line: 0, containerNo: '', message: 'No valid rows to import.' }])
      return
    }

    setSubmitting(true)
    setError('')
    setBulkErrors([])
    setBulkSuccess(null)
    try {
      const { data } = await containerInventoryApi.bulkCreateManual(
        valid.map((r) => ({
          containerNo: r.containerNo,
          containerSizeId: r.containerSizeId,
          containerTypeId: r.containerTypeId,
          depotId: r.depotId,
          yardInDate: r.yardInDate,
          remarks: r.remarks,
        })),
      )
      setBulkSuccess(data.successCount)
      setBulkErrors([...localErrors, ...data.errors])
      if (data.successCount > 0) onSaved()
      if (data.successCount > 0 && data.errors.length === 0 && localErrors.length === 0) onClose()
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      setError(message ?? 'Bulk import failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const validBulkCount = parsedBulk.filter((r) => !r.error).length
  const invalidBulkCount = parsedBulk.filter((r) => r.error).length

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Register existing yard containers</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Add containers already at your contracted yards without going through pre-forecast. Details only — no
          photos or documents required.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {bulkSuccess !== null && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
            {bulkSuccess} container{bulkSuccess === 1 ? '' : 's'} registered successfully.
          </Alert>
        )}

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Add one" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Bulk upload" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ display: 'grid', gap: 0.5 }}>
            <TextField
              fullWidth
              margin="normal"
              label="Container number"
              value={containerNo}
              onChange={(e) => setContainerNo(e.target.value.toUpperCase())}
              placeholder="e.g. ABCD1234567"
              sx={fieldSx}
              disabled={loadingLookups}
            />
            <FormControl fullWidth margin="normal" sx={fieldSx} disabled={loadingLookups}>
              <InputLabel>Container yard</InputLabel>
              <Select
                label="Container yard"
                value={depotId}
                onChange={(e) => setDepotId(e.target.value as number | '')}
              >
                {depots.map((d) => (
                  <MenuItem key={d.depotId} value={d.depotId}>
                    {d.depotName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <FormControl fullWidth margin="normal" sx={fieldSx} disabled={loadingLookups}>
                <InputLabel>Size</InputLabel>
                <Select
                  label="Size"
                  value={containerSizeId}
                  onChange={(e) => setContainerSizeId(e.target.value as number | '')}
                >
                  {sizes.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.label}&apos;
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth margin="normal" sx={fieldSx} disabled={loadingLookups}>
                <InputLabel>Type</InputLabel>
                <Select
                  label="Type"
                  value={containerTypeId}
                  onChange={(e) => setContainerTypeId(e.target.value as number | '')}
                >
                  {types.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.code} — {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <TextField
              fullWidth
              margin="normal"
              label="Yard-in date"
              type="date"
              value={yardInDate}
              onChange={(e) => setYardInDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={fieldSx}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Remarks (optional)"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              multiline
              minRows={2}
              sx={fieldSx}
            />
          </Box>
        )}

        {tab === 1 && (
          <Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
              <Button
                variant="outlined"
                startIcon={<UploadFileOutlinedIcon />}
                onClick={() => fileInputRef.current?.click()}
                sx={{ fontWeight: 600, borderRadius: 2 }}
              >
                Choose CSV file
              </Button>
              <Button
                variant="text"
                onClick={() => setBulkText(BULK_TEMPLATE)}
                sx={{ fontWeight: 600 }}
              >
                Load template
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,text/csv"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file)
                  e.target.value = ''
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Columns: containerNo, depot, size, type, yardInDate [, remarks]. Depot can be name or ID. Date
              format: YYYY-MM-DD.
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={8}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={BULK_TEMPLATE}
              sx={{ ...fieldSx, fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
            {bulkText.trim() && (
              <Typography variant="body2" sx={{ mt: 1.5 }}>
                {validBulkCount} ready to import
                {invalidBulkCount > 0 ? ` · ${invalidBulkCount} with errors` : ''}
              </Typography>
            )}
            {bulkErrors.length > 0 && (
              <Box sx={{ mt: 1.5, maxHeight: 160, overflow: 'auto' }}>
                {bulkErrors.map((e, idx) => (
                  <Typography key={idx} variant="caption" color="error" sx={{ display: 'block' }}>
                    {e.line > 0 ? `Line ${e.line}` : 'Import'}: {e.containerNo ? `${e.containerNo} — ` : ''}
                    {e.message}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        {tab === 0 ? (
          <Button variant="contained" onClick={saveSingle} disabled={submitting || loadingLookups} sx={{ fontWeight: 700, borderRadius: 2 }}>
            {submitting ? 'Saving…' : 'Add container'}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={saveBulk}
            disabled={submitting || validBulkCount === 0}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {submitting ? 'Importing…' : `Import ${validBulkCount || ''} container${validBulkCount === 1 ? '' : 's'}`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
