import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import { Box, Button, Chip, IconButton, TextField, Typography } from '@mui/material'
import { LIST_PRIMARY } from '../layout/ListPagePrimitives'
import { FEE_PRESETS, feeRowsTotal, type FeeRow } from './demurrageBillingUtils'
import { formatPeso } from '../../utils/datetime'

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

export default function DemurrageFeeLineEditor({
  rows,
  onChange,
  disabled,
}: {
  rows: FeeRow[]
  onChange: (rows: FeeRow[]) => void
  disabled?: boolean
}) {
  const updateRow = (index: number, patch: Partial<FeeRow>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const removeRow = (index: number) => {
    if (rows.length <= 1) return
    onChange(rows.filter((_, i) => i !== index))
  }

  const addRow = (description = '') => {
    onChange([...rows, { key: `new-${Date.now()}`, description, amount: 0 }])
  }

  const addPreset = (description: string) => {
    if (rows.some((r) => r.description.toLowerCase() === description.toLowerCase())) return
    addRow(description)
  }

  const usedPresets = new Set(rows.map((r) => r.description.toLowerCase()))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {FEE_PRESETS.filter((p) => !usedPresets.has(p.toLowerCase())).map((preset) => (
          <Chip
            key={preset}
            label={`+ ${preset}`}
            size="small"
            onClick={() => addPreset(preset)}
            disabled={disabled}
            sx={{ fontWeight: 600, cursor: disabled ? 'default' : 'pointer' }}
          />
        ))}
      </Box>

      <Box
        sx={{
          display: { xs: 'none', sm: 'grid' },
          gridTemplateColumns: '1fr 140px 40px',
          gap: 1,
          px: 0.5,
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
          Description
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
          Amount (PHP)
        </Typography>
        <Box />
      </Box>

      {rows.map((row, index) => (
        <Box
          key={row.key}
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 140px 40px' },
            gap: 1,
            alignItems: 'flex-start',
            p: { xs: 1.5, sm: 1 },
            borderRadius: 2,
            border: { xs: '1px solid', sm: 'none' },
            borderColor: 'divider',
            bgcolor: { xs: 'grey.50', sm: 'transparent' },
          }}
        >
          <TextField
            fullWidth
            size="small"
            label={index === 0 ? 'Description' : undefined}
            placeholder="Fee description"
            value={row.description}
            disabled={disabled}
            onChange={(e) => updateRow(index, { description: e.target.value })}
            sx={fieldSx}
          />
          <TextField
            size="small"
            label={index === 0 ? 'Amount' : undefined}
            placeholder="0"
            type="number"
            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
            value={row.amount || ''}
            disabled={disabled}
            onChange={(e) => updateRow(index, { amount: Number(e.target.value) || 0 })}
            sx={{ ...fieldSx, width: { xs: '100%', sm: 140 } }}
          />
          <IconButton
            color="error"
            onClick={() => removeRow(index)}
            disabled={disabled || rows.length <= 1}
            aria-label="Remove fee line"
            sx={{ mt: { xs: 0, sm: 0.5 }, justifySelf: { xs: 'flex-end', sm: 'center' } }}
          >
            <DeleteOutlineOutlinedIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}

      <Button
        startIcon={<AddIcon />}
        onClick={() => addRow()}
        disabled={disabled}
        sx={{ alignSelf: 'flex-start', fontWeight: 600, borderRadius: 2 }}
      >
        Add fee line
      </Button>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pt: 1,
          borderTop: '1px dashed',
          borderColor: 'divider',
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
          Total
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 800, color: LIST_PRIMARY, fontVariantNumeric: 'tabular-nums' }}>
          {formatPeso(feeRowsTotal(rows))}
        </Typography>
      </Box>
    </Box>
  )
}
