import { Box, Paper, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { ICS_PRIMARY, hexToRgba } from './DetailPagePrimitives'

export const LIST_PRIMARY = ICS_PRIMARY

export const listPageRootSx = {
  minWidth: 0,
  maxWidth: '100%',
}

export const listTablePaperSx = {
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: '#fff',
  boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
  overflow: 'hidden',
}

export const listMobileStackSx = {
  display: { xs: 'flex', md: 'none' },
  flexDirection: 'column',
  gap: 2,
  p: 2,
}

export const listDesktopTableSx = {
  display: { xs: 'none', md: 'block' },
}

export const listHeroActionSx = {
  bgcolor: '#fff',
  color: LIST_PRIMARY,
  fontWeight: 700,
  flexShrink: 0,
  width: { xs: '100%', sm: 'auto' },
  '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' },
}

export const listMobileActionsSx = {
  display: 'flex',
  flexDirection: { xs: 'column', sm: 'row' },
  gap: 1,
  mt: 1.5,
  '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' } },
}

export function ListMobileOnly({ children }: { children: ReactNode }) {
  return (
    <Box sx={listMobileStackSx}>
      {children}
    </Box>
  )
}

export function ListDesktopOnly({ children }: { children: ReactNode }) {
  return <Box sx={listDesktopTableSx}>{children}</Box>
}

type ListMobileCardProps = {
  onClick?: () => void
  children: ReactNode
}

export function ListMobileCard({ onClick, children }: ListMobileCardProps) {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: hexToRgba(LIST_PRIMARY, 0.02),
        cursor: onClick ? 'pointer' : 'default',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      {children}
    </Paper>
  )
}

export function ListMobileTitle({ children }: { children: ReactNode }) {
  return (
    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: LIST_PRIMARY, wordBreak: 'break-all' }}>
      {children}
    </Typography>
  )
}

export function ListMobileMeta({ children }: { children: ReactNode }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, wordBreak: 'break-word' }}>
      {children}
    </Typography>
  )
}

export function ListMobileChipRow({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.25, minWidth: 0 }}>
      {children}
    </Box>
  )
}
