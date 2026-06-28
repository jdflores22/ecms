import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { Box, Chip, Paper, TextField, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { LOGICTECK_FORM_BORDER, LOGICTECK_FORM_FIELD_BG } from '../../config/logicteckEmptyReturn'
import { LIST_PRIMARY } from '../layout/ListPagePrimitives'

export const logicteckFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    bgcolor: LOGICTECK_FORM_FIELD_BG,
  },
  '& .MuiInputBase-input.Mui-disabled': {
    WebkitTextFillColor: 'rgba(0,0,0,0.78)',
    color: 'rgba(0,0,0,0.78)',
  },
} as const

type LogicteckFormShellProps = {
  title: string
  subtitle: string
  driverName: string
  username?: string
  children: ReactNode
}

export function LogicteckReadOnlyField({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <TextField
      label={label}
      value={value}
      fullWidth
      disabled
      slotProps={{
        input: {
          readOnly: true,
          endAdornment: <LockOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled', mr: 0.5 }} />,
        },
      }}
      sx={
        mono
          ? { ...logicteckFieldSx, '& .MuiInputBase-input': { fontFamily: 'monospace', fontWeight: 700 } }
          : logicteckFieldSx
      }
    />
  )
}

export default function LogicteckFormShell({
  title,
  subtitle,
  driverName,
  username,
  children,
}: LogicteckFormShellProps) {
  return (
    <Box sx={{ maxWidth: 980, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 800, color: LIST_PRIMARY, mb: 0.5 }}>
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {subtitle}
      </Typography>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          bgcolor: LOGICTECK_FORM_FIELD_BG,
          border: '1px solid',
          borderColor: LOGICTECK_FORM_BORDER,
          display: 'flex',
          gap: 1.5,
          alignItems: 'flex-start',
        }}
      >
        <AccountCircleOutlinedIcon sx={{ color: LIST_PRIMARY, mt: 0.25 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            Logged in as {driverName || username}
          </Typography>
          <Chip
            label="ICS data transfer"
            size="small"
            sx={{ mt: 1, fontWeight: 700, bgcolor: '#fff', border: '1px solid', borderColor: LOGICTECK_FORM_BORDER }}
          />
        </Box>
      </Paper>

      {children}
    </Box>
  )
}
