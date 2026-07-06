import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Alert, Box, Button, Chip, Paper, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { SYSTEM_TIMEZONE } from '../../utils/datetime'
import { DetailPageSkeleton } from './SkeletonPrimitives'

export const ICS_PRIMARY = '#0B3D91'

export const sectionPaperSx = {
  p: { xs: 2, sm: 2.5 },
  mb: 3,
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: '#fff',
  boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
  minWidth: 0,
  maxWidth: '100%',
  boxSizing: 'border-box',
}

export const infoGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: { xs: 1.5, sm: 2 },
}

export const heroPaperSx = {
  p: { xs: 2.5, sm: 3 },
  mb: 3,
  borderRadius: 3,
  background: `linear-gradient(135deg, ${ICS_PRIMARY} 0%, #0A3580 60%, #0C4DA8 100%)`,
  color: '#fff',
  boxShadow: '0 8px 24px rgba(11, 61, 145, 0.22)',
  position: 'relative' as const,
  overflow: 'hidden' as const,
}

export const heroMutedChipSx = {
  bgcolor: 'rgba(255,255,255,0.12)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.2)',
  fontWeight: 600,
}

export function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function InfoTile({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        height: '100%',
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: hexToRgba(ICS_PRIMARY, 0.02),
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}
      >
        {label}
      </Typography>
      <Typography
        component="div"
        sx={{
          mt: 0.75,
          fontWeight: 600,
          fontSize: '0.95rem',
          wordBreak: 'break-word',
          ...(mono && { fontFamily: 'monospace' }),
        }}
      >
        {value}
      </Typography>
    </Paper>
  )
}

export function DetailBackButton({ to, label }: { to: string; label: string }) {
  return (
    <Button
      component={RouterLink}
      to={to}
      startIcon={<ArrowBackIcon />}
      sx={{
        mb: 2,
        color: 'text.secondary',
        fontWeight: 600,
        maxWidth: '100%',
        justifyContent: { xs: 'flex-start', sm: 'center' },
        '&:hover': { color: ICS_PRIMARY, bgcolor: hexToRgba(ICS_PRIMARY, 0.06) },
      }}
    >
      {label}
    </Button>
  )
}

export function DetailLoadingState({
  showTabs = true,
  infoTiles = 6,
  sections = 1,
}: {
  showTabs?: boolean
  infoTiles?: number
  sections?: number
} = {}) {
  return <DetailPageSkeleton showTabs={showTabs} infoTiles={infoTiles} sections={sections} />
}

export function DetailErrorState({ message }: { message: string }) {
  return (
    <Alert severity="error" sx={{ borderRadius: 2 }}>
      {message}
    </Alert>
  )
}

export function TimezoneChip() {
  return <Chip label={SYSTEM_TIMEZONE.labelLong} size="small" sx={heroMutedChipSx} />
}

export function PhotoProgressChip({ uploaded, total }: { uploaded: number; total: number }) {
  return <Chip label={`${uploaded}/${total} photos`} size="small" sx={heroMutedChipSx} />
}

type DetailHeroProps = {
  icon: ReactNode
  title: string
  subtitle?: ReactNode
  chips?: ReactNode
  aside?: ReactNode
}

export function DetailHero({ icon, title, subtitle, chips, aside }: DetailHeroProps) {
  return (
    <Paper elevation={0} sx={heroPaperSx}>
      <Box
        sx={{
          position: 'absolute',
          right: -40,
          top: -40,
          width: 160,
          height: 160,
          borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.06)',
        }}
      />
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2,
          position: 'relative',
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', minWidth: 0 }}>
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
            {icon}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, fontSize: { xs: '1.35rem', sm: '1.75rem' }, wordBreak: 'break-all' }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.88, wordBreak: 'break-word' }}>
                {subtitle}
              </Typography>
            )}
            {chips && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.25 }}>
                {chips}
              </Box>
            )}
          </Box>
        </Box>
        {aside}
      </Box>
    </Paper>
  )
}

type DetailHeroAsideProps = {
  label: string
  primary: ReactNode
  secondary?: ReactNode
}

export function DetailHeroAside({ label, primary, secondary }: DetailHeroAsideProps) {
  return (
    <Box sx={{ flexShrink: 0, minWidth: 0, maxWidth: '100%', textAlign: { xs: 'left', md: 'right' } }}>
      <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 800, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
        {primary}
      </Typography>
      {secondary && (
        <Typography variant="body2" sx={{ opacity: 0.88 }}>
          {secondary}
        </Typography>
      )}
    </Box>
  )
}

type DetailSectionProps = {
  title: string
  icon?: ReactNode
  headerAction?: ReactNode
  children: ReactNode
  sx?: object
  noMargin?: boolean
}

export function DetailSection({ title, icon, headerAction, children, sx, noMargin }: DetailSectionProps) {
  return (
    <Paper elevation={0} sx={{ ...sectionPaperSx, ...(noMargin ? { mb: 0 } : {}), ...sx }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        {icon}
        <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
          {title}
        </Typography>
        {headerAction}
      </Box>
      {children}
    </Paper>
  )
}

export const detailTabsSx = {
  borderBottom: 1,
  borderColor: 'divider',
  '& .MuiTab-root': {
    fontWeight: 600,
    textTransform: 'none',
    minHeight: 48,
    fontSize: { xs: '0.8rem', sm: '0.875rem' },
    px: { xs: 1.5, sm: 2 },
  },
  '& .MuiTabs-indicator': {
    height: 3,
    borderRadius: '3px 3px 0 0',
    bgcolor: ICS_PRIMARY,
  },
}

export function DetailTabPanel({
  value,
  activeTab,
  children,
}: {
  value: string
  activeTab: string
  children: ReactNode
}) {
  if (value !== activeTab) return null
  return <Box role="tabpanel">{children}</Box>
}
