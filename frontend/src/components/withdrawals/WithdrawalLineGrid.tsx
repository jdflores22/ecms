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
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import { useEffect, useState } from 'react'
import { withdrawalApi, demurrageBillingApi } from '../../services/api'
import { formatContainerSizeLabel } from '../../utils/containerSize'
import { containerNumberError } from '../../utils/containerNumber'

export interface WithdrawalLineFormValue {
  containerNo: string
  containerSizeId: number | ''
  containerTypeId: number | ''
}

export interface WithdrawalLineSubmitValue {
  containerNo: string
  containerSizeId: number
  containerTypeId: number
}

interface SizeOption {
  id: number
  label: string
}

interface TypeOption {
  id: number
  label: string
}

interface WithdrawalLineGridProps {
  lines: WithdrawalLineFormValue[]
  onChange: (lines: WithdrawalLineFormValue[]) => void
  containerSizes: SizeOption[]
  containerTypes: TypeOption[]
  currentDepotId?: number | ''
  shippingLineId?: number | ''
  excludeWithdrawalId?: number
  disabled?: boolean
  compact?: boolean
}

const emptyLine = (): WithdrawalLineFormValue => ({
  containerNo: '',
  containerSizeId: '',
  containerTypeId: '',
})

export function toLineSubmitValues(lines: WithdrawalLineFormValue[]): WithdrawalLineSubmitValue[] | null {
  const valid = lines.filter(
    (line) =>
      line.containerNo.trim() &&
      line.containerSizeId !== '' &&
      line.containerTypeId !== '',
  )
  if (valid.length === 0) return null
  return valid.map((line) => ({
    containerNo: line.containerNo.trim().toUpperCase(),
    containerSizeId: line.containerSizeId as number,
    containerTypeId: line.containerTypeId as number,
  }))
}

export default function WithdrawalLineGrid({
  lines,
  onChange,
  containerSizes,
  containerTypes,
  currentDepotId,
  shippingLineId,
  excludeWithdrawalId,
  disabled = false,
  compact = false,
}: WithdrawalLineGridProps) {
  const [duplicateWarnings, setDuplicateWarnings] = useState<Record<number, string>>({})
  const [demurrageWarnings, setDemurrageWarnings] = useState<Record<number, string>>({})
  const [yardWarnings, setYardWarnings] = useState<Record<number, string>>({})

  useEffect(() => {
    if (currentDepotId === '' || currentDepotId === undefined) {
      setDuplicateWarnings({})
      return
    }

    const timer = window.setTimeout(() => {
      const checks = lines.map(async (line, index) => {
        if (
          !line.containerNo.trim() ||
          line.containerSizeId === '' ||
          line.containerTypeId === ''
        ) {
          return { index, warning: null as string | null }
        }

        try {
          const { data } = await withdrawalApi.checkDuplicate({
            currentDepotId: currentDepotId as number,
            containerNo: line.containerNo.trim().toUpperCase(),
            containerSizeId: line.containerSizeId as number,
            containerTypeId: line.containerTypeId as number,
            excludeWithdrawalId,
          })
          return {
            index,
            warning: data.isDuplicate
              ? `Duplicate ${data.referenceNo ?? ''} (${data.status ?? ''})${data.truckerName ? ` — ${data.truckerName}` : ''}`
              : null,
          }
        } catch {
          return { index, warning: null }
        }
      })

      void Promise.all(checks).then((results) => {
        const next: Record<number, string> = {}
        for (const result of results) {
          if (result.warning) next[result.index] = result.warning
        }
        setDuplicateWarnings(next)
      })
    }, 400)

    return () => window.clearTimeout(timer)
  }, [lines, currentDepotId, excludeWithdrawalId])

  useEffect(() => {
    if (shippingLineId === '' || shippingLineId === undefined) {
      setDemurrageWarnings({})
      return
    }

    const timer = window.setTimeout(() => {
      const checks = lines.map(async (line, index) => {
        if (!line.containerNo.trim() || line.containerSizeId === '' || line.containerTypeId === '') {
          return { index, warning: null as string | null }
        }
        try {
          const { data } = await demurrageBillingApi.checkBlock({
            containerNo: line.containerNo.trim().toUpperCase(),
            shippingLineId: shippingLineId as number,
            containerSizeId: line.containerSizeId as number,
            containerTypeId: line.containerTypeId as number,
          })
          return { index, warning: data.isBlocked ? data.message ?? 'Outstanding demurrage must be settled first.' : null }
        } catch {
          return { index, warning: null }
        }
      })

      void Promise.all(checks).then((results) => {
        const next: Record<number, string> = {}
        for (const result of results) {
          if (result.warning) next[result.index] = result.warning
        }
        setDemurrageWarnings(next)
      })
    }, 400)

    return () => window.clearTimeout(timer)
  }, [lines, shippingLineId])

  useEffect(() => {
    if (currentDepotId === '' || currentDepotId === undefined) {
      setYardWarnings({})
      return
    }

    const timer = window.setTimeout(() => {
      const checks = lines.map(async (line, index) => {
        if (!line.containerNo.trim() || line.containerSizeId === '' || line.containerTypeId === '') {
          return { index, warning: null as string | null }
        }
        try {
          const { data } = await withdrawalApi.checkYard({
            depotId: currentDepotId as number,
            containerNo: line.containerNo.trim().toUpperCase(),
            containerSizeId: line.containerSizeId as number,
            containerTypeId: line.containerTypeId as number,
          })
          return { index, warning: !data.isInYard ? data.message ?? 'Not found in yard inventory.' : null }
        } catch {
          return { index, warning: null }
        }
      })

      void Promise.all(checks).then((results) => {
        const next: Record<number, string> = {}
        for (const result of results) {
          if (result.warning) next[result.index] = result.warning
        }
        setYardWarnings(next)
      })
    }, 400)

    return () => window.clearTimeout(timer)
  }, [lines, currentDepotId])

  const updateLine = (index: number, patch: Partial<WithdrawalLineFormValue>) => {
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }

  const removeLine = (index: number) => {
    if (lines.length <= 1) return
    onChange(lines.filter((_, i) => i !== index))
  }

  const addLine = () => {
    onChange([...lines, emptyLine()])
  }

  const batchDuplicate = (() => {
    const seen = new Set<string>()
    for (const line of lines) {
      if (!line.containerNo.trim() || line.containerSizeId === '' || line.containerTypeId === '') continue
      const key = `${line.containerNo.trim().toUpperCase()}|${line.containerSizeId}|${line.containerTypeId}`
      if (seen.has(key)) return `Duplicate container in batch: ${line.containerNo.trim().toUpperCase()}`
      seen.add(key)
    }
    return null
  })()

  const sizeLabel = (id: number | '') => {
    if (id === '') return compact ? 'Size' : ''
    return formatContainerSizeLabel(containerSizes.find((s) => s.id === id)?.label ?? '')
  }

  const typeLabel = (id: number | '') => {
    if (id === '') return compact ? 'Type' : ''
    return containerTypes.find((t) => t.id === id)?.label ?? ''
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, gap: 1, flexWrap: 'wrap' }}>
        <Typography
          variant={compact ? 'caption' : 'subtitle1'}
          sx={{
            fontWeight: 700,
            ...(compact
              ? { textTransform: 'uppercase', letterSpacing: 0.6, color: 'text.secondary' }
              : {}),
          }}
        >
          Containers ({lines.length})
        </Typography>
        {!disabled && (
          <Button size="small" startIcon={<AddIcon />} onClick={addLine} sx={{ fontWeight: 600 }}>
            Add container
          </Button>
        )}
      </Box>

      {batchDuplicate && (
        <Alert severity="warning" sx={{ mb: 1.5, borderRadius: 2 }}>
          {batchDuplicate}
        </Alert>
      )}

      <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5, mb: 1 }}>
        {lines.map((line, index) => (
          <Paper
            key={index}
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: duplicateWarnings[index] ? 'warning.light' : 'divider',
              bgcolor: '#fff',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                Container {index + 1}
              </Typography>
              {!disabled && (
                <IconButton
                  size="small"
                  aria-label="Remove container"
                  disabled={lines.length <= 1}
                  onClick={() => removeLine(index)}
                >
                  <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField
                label="Container no."
                value={line.containerNo}
                onChange={(e) => updateLine(index, { containerNo: e.target.value.toUpperCase() })}
                size="small"
                fullWidth
                disabled={disabled}
                placeholder="MSCU1234567"
                slotProps={{ input: { style: { fontFamily: 'monospace' } } }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <FormControl size="small" fullWidth disabled={disabled} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                  <InputLabel>Size</InputLabel>
                  <Select
                    label="Size"
                    value={line.containerSizeId}
                    onChange={(e) => updateLine(index, { containerSizeId: e.target.value as number | '' })}
                  >
                    {containerSizes.map((size) => (
                      <MenuItem key={size.id} value={size.id}>
                        {formatContainerSizeLabel(size.label)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" fullWidth disabled={disabled} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                  <InputLabel>Type</InputLabel>
                  <Select
                    label="Type"
                    value={line.containerTypeId}
                    onChange={(e) => updateLine(index, { containerTypeId: e.target.value as number | '' })}
                  >
                    {containerTypes.map((type) => (
                      <MenuItem key={type.id} value={type.id}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              {duplicateWarnings[index] && (
                <Typography variant="caption" color="warning.main">
                  {duplicateWarnings[index]}
                </Typography>
              )}
              {containerNumberError(line.containerNo) && (
                <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>
                  {containerNumberError(line.containerNo)}
                </Typography>
              )}
              {demurrageWarnings[index] && (
                <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>
                  {demurrageWarnings[index]}
                </Typography>
              )}
              {yardWarnings[index] && (
                <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                  {yardWarnings[index]}
                </Typography>
              )}
            </Box>
          </Paper>
        ))}
      </Box>

      <TableContainer
        sx={{
          display: { xs: 'none', md: 'block' },
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          mb: 1,
          ...(compact ? { '& .MuiTableCell-root': { py: 0.75, px: 1 } } : {}),
        }}
      >
        <Table size="small" stickyHeader={compact && lines.length > 6}>
          <TableHead>
            <TableRow sx={compact ? { '& .MuiTableCell-head': { fontWeight: 700, bgcolor: 'grey.50' } } : undefined}>
              <TableCell width={40}>#</TableCell>
              <TableCell sx={compact ? { minWidth: 180 } : undefined}>Container no.</TableCell>
              <TableCell width={compact ? 120 : undefined}>Size</TableCell>
              <TableCell width={compact ? 140 : undefined}>Type</TableCell>
              {!disabled && <TableCell width={48} />}
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line, index) => (
              <TableRow key={index} hover={compact}>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>{index + 1}</TableCell>
                <TableCell>
                  <TextField
                    value={line.containerNo}
                    onChange={(e) => updateLine(index, { containerNo: e.target.value.toUpperCase() })}
                    size="small"
                    fullWidth
                    disabled={disabled}
                    placeholder="MSCU1234567"
                    slotProps={compact ? { input: { style: { fontFamily: 'monospace', fontSize: '0.875rem' } } } : undefined}
                  />
                  {duplicateWarnings[index] && (
                    <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                      {duplicateWarnings[index]}
                    </Typography>
                  )}
                  {containerNumberError(line.containerNo) && (
                    <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5 }}>
                      {containerNumberError(line.containerNo)}
                    </Typography>
                  )}
                  {demurrageWarnings[index] && (
                    <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5 }}>
                      {demurrageWarnings[index]}
                    </Typography>
                  )}
                  {yardWarnings[index] && (
                    <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                      {yardWarnings[index]}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {compact ? (
                    <Select
                      size="small"
                      fullWidth
                      displayEmpty
                      disabled={disabled}
                      value={line.containerSizeId}
                      onChange={(e) => updateLine(index, { containerSizeId: e.target.value as number | '' })}
                      renderValue={() =>
                        line.containerSizeId === '' ? (
                          <Typography component="span" variant="body2" color="text.secondary">
                            Size
                          </Typography>
                        ) : (
                          sizeLabel(line.containerSizeId)
                        )
                      }
                      sx={{ borderRadius: 2, fontSize: '0.875rem' }}
                    >
                      {containerSizes.map((size) => (
                        <MenuItem key={size.id} value={size.id}>
                          {formatContainerSizeLabel(size.label)}
                        </MenuItem>
                      ))}
                    </Select>
                  ) : (
                    <FormControl size="small" fullWidth disabled={disabled}>
                      <InputLabel>Size</InputLabel>
                      <Select
                        label="Size"
                        value={line.containerSizeId}
                        onChange={(e) => updateLine(index, { containerSizeId: e.target.value as number })}
                      >
                        {containerSizes.map((size) => (
                          <MenuItem key={size.id} value={size.id}>
                            {formatContainerSizeLabel(size.label)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </TableCell>
                <TableCell>
                  {compact ? (
                    <Select
                      size="small"
                      fullWidth
                      displayEmpty
                      disabled={disabled}
                      value={line.containerTypeId}
                      onChange={(e) => updateLine(index, { containerTypeId: e.target.value as number | '' })}
                      renderValue={() =>
                        line.containerTypeId === '' ? (
                          <Typography component="span" variant="body2" color="text.secondary">
                            Type
                          </Typography>
                        ) : (
                          typeLabel(line.containerTypeId)
                        )
                      }
                      sx={{ borderRadius: 2, fontSize: '0.875rem' }}
                    >
                      {containerTypes.map((type) => (
                        <MenuItem key={type.id} value={type.id}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  ) : (
                    <FormControl size="small" fullWidth disabled={disabled}>
                      <InputLabel>Type</InputLabel>
                      <Select
                        label="Type"
                        value={line.containerTypeId}
                        onChange={(e) => updateLine(index, { containerTypeId: e.target.value as number })}
                      >
                        {containerTypes.map((type) => (
                          <MenuItem key={type.id} value={type.id}>
                            {type.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </TableCell>
                {!disabled && (
                  <TableCell>
                    <IconButton
                      size="small"
                      aria-label="Remove container"
                      disabled={lines.length <= 1}
                      onClick={() => removeLine(index)}
                    >
                      <DeleteOutlinedIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="caption" color="text.secondary">
        Add every container covered by this ATW. Mixed sizes and types are supported (up to 50 per batch).
      </Typography>
    </Box>
  )
}
