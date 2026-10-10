import { Box, Paper, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { ICS_PRIMARY, hexToRgba } from '../layout/DetailPagePrimitives'

const primaryDark = ICS_PRIMARY

export function EvaluationTabShell({
  title,
  headerExtra,
  children,
}: {
  title: string
  headerExtra?: ReactNode
  children: ReactNode
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2,
        border: '1px solid',
        borderColor: hexToRgba(primaryDark, 0.15),
        bgcolor: hexToRgba(primaryDark, 0.02),
      }}
    >
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: primaryDark }}>
            {title}
          </Typography>
          {headerExtra}
        </Box>
        {children}
      </Stack>
    </Paper>
  )
}

export function EvaluationSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.6 }}>
        {title}
      </Typography>
      <Box
        sx={{
          mt: 1,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: { xs: 1.5, sm: 2 },
          alignItems: 'start',
        }}
      >
        {children}
      </Box>
    </Box>
  )
}

export function EvaluationField({
  label,
  value,
  mono,
  span = 1,
}: {
  label: string
  value: ReactNode
  mono?: boolean
  span?: 1 | 2
}) {
  return (
    <Box sx={{ gridColumn: span === 2 ? { xs: '1', sm: '1 / -1' } : undefined, minWidth: 0 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, display: 'block' }}
      >
        {label}
      </Typography>
      <Typography
        component="div"
        variant="body2"
        sx={{
          mt: 0.35,
          fontWeight: 600,
          wordBreak: 'break-word',
          ...(mono && { fontFamily: 'monospace', fontSize: '0.875rem' }),
        }}
      >
        {value}
      </Typography>
    </Box>
  )
}

export function EvaluationTwoColumnBody({
  left,
  right,
}: {
  left: ReactNode
  right?: ReactNode | null
}) {
  if (!right) {
    return <Box sx={{ minWidth: 0 }}>{left}</Box>
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: { xs: 2.5, md: 3 },
        alignItems: 'start',
      }}
    >
      <Box sx={{ minWidth: 0 }}>{left}</Box>
      <Box sx={{ minWidth: 0 }}>{right}</Box>
    </Box>
  )
}

/** Single-column field stack for the left/right halves of a tab (avoids nested 2-col grids). */
export function EvaluationFieldColumn({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.6 }}>
        {title}
      </Typography>
      <Stack spacing={2} sx={{ mt: 1.25 }}>
        {children}
      </Stack>
    </Box>
  )
}

export function EvaluationTabFooter({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        pt: 2,
        mt: 0.5,
        borderTop: '1px solid',
        borderColor: hexToRgba(primaryDark, 0.12),
      }}
    >
      <Stack spacing={2}>{children}</Stack>
    </Box>
  )
}
