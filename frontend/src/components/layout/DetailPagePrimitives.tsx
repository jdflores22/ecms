import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Alert, Box, Button, Chip, Paper, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { SYSTEM_TIMEZONE } from '../../utils/datetime'
import { appColors, hexToRgba, ICS_PRIMARY, icsOnBrand } from '../../theme/colors'
import {
  pageHeroIconBoxSx,
  pageHeroMutedChipSx,
  pageHeroOrbSx,
  pageHeroPaperSx,
  pageHeroSubtitleSx,
  pageHeroTitleSx,
} from './PageHeroPrimitives'

export { pageHeroTitleSx, pageHeroSubtitleSx }
import { DetailPageSkeleton } from './SkeletonPrimitives'

export { ICS_PRIMARY, hexToRgba }

export const sectionPaperSx = {
  p: { xs: 2, sm: 2.5 },
  mb: 3,
  borderRadius: '1rem',
  border: `1px solid ${appColors.border}`,
  bgcolor: appColors.white,
  boxShadow: appColors.surfaceShadow,
  minWidth: 0,
  maxWidth: '100%',
  boxSizing: 'border-box',
}

export const infoGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: { xs: 1.5, sm: 2 },
}

export const heroPaperSx = pageHeroPaperSx

export const heroMutedChipSx = pageHeroMutedChipSx

export function InfoTile({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        height: '100%',
        borderRadius: '0.75rem',
        border: `1px solid ${appColors.border}`,
        bgcolor: hexToRgba(ICS_PRIMARY, 0.03),
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

export function DetailBackButton({
  to,
  label,
  disabled = false,
}: {
  to: string
  label: string
  disabled?: boolean
}) {
  return (
    <Button
      component={disabled ? 'button' : RouterLink}
      to={disabled ? undefined : to}
      disabled={disabled}
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
    <Alert severity="error" sx={{ borderRadius: '0.75rem' }}>
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
      <Box aria-hidden sx={pageHeroOrbSx} />
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
          <Box sx={pageHeroIconBoxSx}>{icon}</Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" sx={{ ...pageHeroTitleSx, wordBreak: 'break-all' }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body1" sx={{ ...pageHeroSubtitleSx, wordBreak: 'break-word' }}>
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
      <Typography variant="caption" sx={{ color: icsOnBrand.muted, display: 'block', fontSize: '0.75rem' }}>
        {label}
      </Typography>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          fontSize: '1.125rem',
          lineHeight: 1.3,
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
          color: icsOnBrand.title,
        }}
      >
        {primary}
      </Typography>
      {secondary && (
        <Typography variant="body2" sx={{ color: icsOnBrand.body, fontSize: '0.875rem' }}>
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
