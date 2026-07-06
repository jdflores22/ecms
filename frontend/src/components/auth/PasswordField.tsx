import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import CircleOutlinedIcon from '@mui/icons-material/CircleOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import {
  Box,
  IconButton,
  InputAdornment,
  LinearProgress,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { authFieldSx } from './AuthShell'
import { evaluatePasswordStrength, type PasswordStrength } from '../../utils/passwordStrength'

const primaryDark = '#0B3D91'

const strengthColors: Record<PasswordStrength['label'], string> = {
  Weak: '#C62828',
  Fair: '#ED6C02',
  Good: '#0288D1',
  Strong: '#2E7D32',
}

type PasswordFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  showStrength?: boolean
  error?: boolean
  helperText?: string
}

export function PasswordStrengthHint({ password }: { password: string }) {
  const strength = useMemo(() => evaluatePasswordStrength(password), [password])
  if (!password) return null

  const progress = (strength.score / strength.checks.length) * 100

  return (
    <Box sx={{ mt: 1, mb: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
          Password strength
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 800, color: strengthColors[strength.label] }}>
          {strength.label}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 6,
          borderRadius: 99,
          mb: 1.25,
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': {
            borderRadius: 99,
            bgcolor: strengthColors[strength.label],
          },
        }}
      />
      <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 0.5 }}>
        {strength.checks.map((check) => (
          <Box
            component="li"
            key={check.id}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
          >
            {check.met ? (
              <CheckCircleOutlinedIcon sx={{ fontSize: 16, color: '#2E7D32' }} />
            ) : (
              <CircleOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
            )}
            <Typography
              variant="caption"
              sx={{ color: check.met ? 'text.secondary' : 'text.disabled', lineHeight: 1.4 }}
            >
              {check.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

export default function PasswordField({
  label,
  value,
  onChange,
  autoComplete = 'new-password',
  showStrength = false,
  error = false,
  helperText,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <Box>
      <TextField
        label={label}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        fullWidth
        error={error}
        helperText={helperText}
        autoComplete={autoComplete}
        sx={authFieldSx}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  type="button"
                  aria-label={visible ? 'Hide password' : 'Show password'}
                  onClick={() => setVisible((v) => !v)}
                  edge="end"
                  size="small"
                  sx={{ color: primaryDark }}
                >
                  {visible ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
      {showStrength && <PasswordStrengthHint password={value} />}
    </Box>
  )
}
