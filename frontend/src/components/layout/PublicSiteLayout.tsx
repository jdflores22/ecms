import AndroidOutlinedIcon from '@mui/icons-material/AndroidOutlined'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined'
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined'
import {
  Box,
  Breadcrumbs,
  Button,
  Container,
  Link,
  Typography,
} from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import IcsLogo from '../brand/IcsLogo'
import { authColors } from '../auth/AuthShell'
import { ICS_BRAND, ICS_LANDING } from '../../config/brandCopy'
import { TRUCKER_APP_DOWNLOAD } from '../../config/truckerAppDownload'

export const publicColors = {
  ...authColors,
  heroGradient: `
    radial-gradient(circle at 15% 20%, rgba(11, 61, 145, 0.08) 0%, transparent 42%),
    radial-gradient(circle at 85% 80%, rgba(0, 163, 224, 0.06) 0%, transparent 40%),
    linear-gradient(180deg, #ffffff 0%, #fafaf9 100%)
  `,
  ctaGradient: `linear-gradient(135deg, ${authColors.primaryDark} 0%, ${authColors.primary} 55%, ${authColors.accent} 100%)`,
}

const contentMaxWidth = '72rem'

export const publicPrimaryButtonSx: SxProps<Theme> = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 1,
  minHeight: 44,
  px: 2.25,
  py: 1.25,
  borderRadius: '0.625rem',
  fontSize: '0.9375rem',
  fontWeight: 600,
  textTransform: 'none',
  textDecoration: 'none',
  border: `1px solid ${publicColors.primary}`,
  bgcolor: publicColors.primary,
  color: '#fff',
  boxShadow: 'none',
  '&:hover': {
    bgcolor: publicColors.primaryDark,
    borderColor: publicColors.primaryDark,
    boxShadow: 'none',
  },
}

export const publicOutlineButtonSx: SxProps<Theme> = {
  ...publicPrimaryButtonSx,
  bgcolor: 'transparent',
  color: publicColors.textMuted,
  borderColor: publicColors.border,
  '&:hover': {
    bgcolor: publicColors.pageBg,
    borderColor: publicColors.border,
    color: publicColors.primary,
  },
}

export const publicNavLinkSx: SxProps<Theme> = {
  px: 1.5,
  py: 1,
  fontSize: '0.9375rem',
  fontWeight: 500,
  color: publicColors.textMuted,
  textTransform: 'none',
  minWidth: 0,
  '&:hover': { bgcolor: 'transparent', color: publicColors.primary },
}

function PublicBreadcrumb({ current }: { current: string }) {
  return (
    <Breadcrumbs
      separator={<ChevronRightRoundedIcon sx={{ fontSize: 16, color: publicColors.textLight }} />}
      aria-label="Breadcrumb"
      sx={{
        mb: 3,
        '& .MuiBreadcrumbs-ol': { flexWrap: 'wrap' },
        '& .MuiBreadcrumbs-li': { display: 'flex', alignItems: 'center' },
      }}
    >
      <Link
        component={RouterLink}
        to="/"
        underline="hover"
        sx={{
          fontSize: '0.8125rem',
          fontWeight: 500,
          color: publicColors.textMuted,
          '&:hover': { color: publicColors.primary },
        }}
      >
        Home
      </Link>
      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: publicColors.textDark }}>
        {current}
      </Typography>
    </Breadcrumbs>
  )
}

export function PublicSiteHeader() {
  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: `1px solid ${publicColors.border}`,
        bgcolor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Container
        maxWidth={false}
        sx={{
          maxWidth: contentMaxWidth,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          minHeight: 64,
          px: { xs: 2.5, sm: 3 },
        }}
      >
        <Link
          component={RouterLink}
          to="/"
          underline="none"
          aria-label={`${ICS_BRAND.name} home`}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            minWidth: 0,
            color: publicColors.textDark,
          }}
        >
          <IcsLogo height={36} maxWidth={120} />
        </Link>

        <Box component="nav" aria-label="Primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button component={RouterLink} to="/trucker/faq" sx={{ ...publicNavLinkSx, display: { xs: 'none', md: 'inline-flex' } }}>
            Trucker FAQ
          </Button>
          <Button
            component={RouterLink}
            to={TRUCKER_APP_DOWNLOAD.publicPagePath}
            startIcon={<AndroidOutlinedIcon sx={{ fontSize: 18 }} />}
            sx={{ ...publicNavLinkSx, display: { xs: 'none', sm: 'inline-flex' } }}
          >
            Android app
          </Button>
          <Button component={RouterLink} to="/login" startIcon={<LoginOutlinedIcon />} sx={publicNavLinkSx}>
            Sign in
          </Button>
          <Button
            component={RouterLink}
            to="/signup/trucker"
            startIcon={<PersonAddAltOutlinedIcon />}
            sx={publicPrimaryButtonSx}
          >
            Register
          </Button>
        </Box>
      </Container>
    </Box>
  )
}

export function PublicSiteFooter() {
  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        borderTop: `1px solid ${publicColors.border}`,
        bgcolor: publicColors.white,
      }}
    >
      <Container
        maxWidth={false}
        sx={{
          maxWidth: contentMaxWidth,
          px: { xs: 2.5, sm: 3 },
          py: 3,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IcsLogo height={32} maxWidth={96} />
          <Typography variant="body2" sx={{ color: publicColors.textMuted, fontWeight: 600 }}>
            {ICS_BRAND.name}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: publicColors.textLight }}>
          {ICS_LANDING.footer}
        </Typography>
      </Container>
    </Box>
  )
}

export function PublicPageHero({
  title,
  subtitle,
  subtitleTl,
  eyebrow,
}: {
  title: string
  subtitle: string
  subtitleTl?: string
  eyebrow?: string
}) {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '1rem',
        border: `1px solid ${publicColors.border}`,
        bgcolor: publicColors.brandBg,
        backgroundImage: publicColors.heroGradient,
        p: { xs: 2.5, sm: 3.5 },
        mb: 3,
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: '-3rem',
          right: '-2rem',
          width: '14rem',
          height: '14rem',
          borderRadius: '9999px',
          bgcolor: 'rgba(11, 61, 145, 0.06)',
          pointerEvents: 'none',
        }}
      />
      {eyebrow && (
        <Typography
          variant="overline"
          sx={{
            display: 'block',
            mb: 1,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: publicColors.primary,
          }}
        >
          {eyebrow}
        </Typography>
      )}
      <Typography
        component="h1"
        sx={{
          m: 0,
          fontSize: { xs: '1.75rem', sm: '2.125rem' },
          lineHeight: 1.2,
          fontWeight: 700,
          color: publicColors.textDark,
        }}
      >
        {title}
      </Typography>
      <Typography sx={{ mt: 1.5, color: publicColors.textMuted, lineHeight: 1.7, maxWidth: '40rem' }}>
        {subtitle}
      </Typography>
      {subtitleTl && (
        <Typography variant="body2" sx={{ mt: 1, color: publicColors.textLight, lineHeight: 1.7 }}>
          {subtitleTl}
        </Typography>
      )}
    </Box>
  )
}

interface PublicSiteLayoutProps {
  children: ReactNode
  breadcrumb?: string
  maxWidth?: false | 'sm' | 'md' | 'lg'
  contentPy?: number | { xs?: number; sm?: number }
}

export default function PublicSiteLayout({
  children,
  breadcrumb,
  maxWidth = 'lg',
  contentPy = { xs: 3, sm: 4 },
}: PublicSiteLayoutProps) {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: publicColors.pageBg,
        color: publicColors.textDark,
      }}
    >
      <PublicSiteHeader />
      <Box component="main" sx={{ flex: 1 }}>
        <Container maxWidth={maxWidth} sx={{ px: { xs: 2.5, sm: 3 }, py: contentPy }}>
          {breadcrumb ? <PublicBreadcrumb current={breadcrumb} /> : null}
          {children}
        </Container>
      </Box>
      <PublicSiteFooter />
    </Box>
  )
}
