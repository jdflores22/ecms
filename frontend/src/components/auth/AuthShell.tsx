import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import { Box, Breadcrumbs, Link, Paper, Typography } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import { Link as RouterLink } from 'react-router-dom'
import IcsLogo from '../brand/IcsLogo'
import { ICS_BRAND } from '../../config/brandCopy'
import { authColors } from '../../theme/colors'

export { authColors }

const ROLE_CHIPS = ['Truckers', 'Shipping lines', 'Depots', 'Administrators']

interface AuthShellProps {
  title: string
  subtitle?: React.ReactNode
  maxWidth?: string
  alerts?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}

function AuthBrandPanel() {
  return (
    <Box
      aria-hidden
      sx={{
        display: { xs: 'none', md: 'flex' },
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'flex-start',
        overflow: 'hidden',
        p: { md: '2.5rem 2.5rem 2.5rem 3rem', lg: '2.5rem 3.5rem 2.5rem 4rem' },
        bgcolor: authColors.brandBg,
        backgroundImage: `
          radial-gradient(circle at 18% 82%, rgba(11, 61, 145, 0.1) 0%, transparent 42%),
          radial-gradient(circle at 82% 18%, rgba(0, 163, 224, 0.08) 0%, transparent 40%),
          linear-gradient(160deg, #fafaf9 0%, #f5f5f4 55%, #ececea 100%)
        `,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: '-4rem',
          right: '-3rem',
          width: '18rem',
          height: '18rem',
          borderRadius: '9999px',
          bgcolor: 'rgba(11, 61, 145, 0.06)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-5rem',
          left: '-4rem',
          width: '22rem',
          height: '22rem',
          borderRadius: '9999px',
          bgcolor: 'rgba(0, 163, 224, 0.06)',
          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '30rem',
          display: 'flex',
          flexDirection: 'column',
          gap: 3.5,
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '1rem',
            bgcolor: authColors.white,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 15px -3px rgba(11, 61, 145, 0.15)',
            overflow: 'hidden',
            p: 0.75,
          }}
        >
          <IcsLogo height={44} maxWidth={52} />
        </Box>

        <Box>
          <Typography
            component="h2"
            sx={{
              m: 0,
              fontSize: { md: 'clamp(2rem, 3vw, 2.75rem)' },
              lineHeight: 1.15,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: authColors.textDark,
            }}
          >
            Welcome to {ICS_BRAND.shortName}
          </Typography>
          <Typography sx={{ mt: 1.5, fontSize: '1rem', lineHeight: 1.7, color: authColors.textMuted }}>
            {ICS_BRAND.description}
          </Typography>
        </Box>

        <Box
          aria-label="Supported user types"
          sx={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.25rem', pt: 0.5 }}
        >
          {ROLE_CHIPS.map((role, index) => (
            <Typography
              key={role}
              component="span"
              sx={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: authColors.textMuted,
                opacity: 0.85,
                '&::after':
                  index < ROLE_CHIPS.length - 1
                    ? { content: '"·"', ml: '1.25rem', opacity: 0.45 }
                    : undefined,
              }}
            >
              {role}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

function AuthBreadcrumb({ current }: { current: string }) {
  return (
    <Breadcrumbs
      separator={<ChevronRightRoundedIcon sx={{ fontSize: 16, color: authColors.textLight }} />}
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
          color: authColors.textMuted,
          '&:hover': { color: authColors.primary },
        }}
      >
        Home
      </Link>
      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: authColors.textDark }}>
        {current}
      </Typography>
    </Breadcrumbs>
  )
}

function AuthMobileBrandMark() {
  return (
    <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 2.5 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '0.5rem',
          bgcolor: authColors.white,
          border: `1px solid ${authColors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          p: 0.5,
        }}
      >
        <IcsLogo height={28} maxWidth={34} />
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: authColors.primary }}>
        {ICS_BRAND.shortName}
      </Typography>
    </Box>
  )
}

function AuthFormHeader({ title, subtitle }: { title: string; subtitle?: React.ReactNode }) {
  return (
    <Box component="header" sx={{ mb: 3 }}>
      <Typography
        component="h1"
        variant="h5"
        sx={{
          m: 0,
          fontSize: '1.5rem',
          lineHeight: 1.3,
          fontWeight: 800,
          color: authColors.textDark,
        }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body1" sx={{ mt: 1.5, fontSize: '1rem', lineHeight: 1.6, color: authColors.textMuted }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  )
}

type AuthRouterLinkProps = {
  to: string
  children: React.ReactNode
  sx?: SxProps<Theme>
}

export function AuthLink({ to, children, sx }: AuthRouterLinkProps) {
  return (
    <Link
      component={RouterLink}
      to={to}
      underline="hover"
      sx={{
        color: authColors.primary,
        fontWeight: 600,
        textDecoration: 'none',
        '&:hover': { color: authColors.primaryDark },
        ...sx,
      }}
    >
      {children}
    </Link>
  )
}

export function AuthInlineLink({ to, children, sx }: AuthRouterLinkProps) {
  return (
    <Link
      component={RouterLink}
      to={to}
      underline="hover"
      sx={{
        color: authColors.primary,
        fontWeight: 500,
        fontSize: 'inherit',
        '&:hover': { color: authColors.primaryDark },
        ...sx,
      }}
    >
      {children}
    </Link>
  )
}

export function AuthAlert({ children, severity = 'error' }: { children: React.ReactNode; severity?: 'error' | 'success' | 'info' }) {
  const palette =
    severity === 'success'
      ? { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534' }
      : severity === 'info'
        ? { bg: authColors.pageBg, border: authColors.border, color: authColors.textDark }
        : { bg: authColors.errorBg, border: authColors.errorBorder, color: authColors.errorText }

  return (
    <Paper
      elevation={0}
      role="alert"
      sx={{
        mb: 2.25,
        px: 1.75,
        py: 1.25,
        borderRadius: '0.625rem',
        bgcolor: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.color,
        fontSize: '0.875rem',
        lineHeight: 1.5,
      }}
    >
      {children}
    </Paper>
  )
}

export default function AuthShell({
  title,
  subtitle,
  maxWidth = '28rem',
  alerts,
  children,
  footer,
}: AuthShellProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        minHeight: '100dvh',
        bgcolor: authColors.white,
        color: authColors.textDark,
        height: { md: '100dvh' },
        overflow: { md: 'hidden' },
      }}
    >
      <AuthBrandPanel />

      <Box
        component="main"
        sx={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          minHeight: { xs: '100dvh', md: '100%' },
          bgcolor: authColors.white,
          overflow: { md: 'hidden' },
        }}
      >
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            px: { xs: 2.5, sm: 4 },
            py: { xs: 4, md: 5 },
            overflowY: { md: 'auto' },
          }}
        >
          <AuthBreadcrumb current={title} />

          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box sx={{ width: '100%', maxWidth }}>
              <AuthMobileBrandMark />
              <AuthFormHeader title={title} subtitle={subtitle} />
              {alerts}
              <Box>{children}</Box>
              {footer}
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            display: { xs: 'flex', md: 'none' },
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            px: 2.5,
            py: 2,
            borderTop: `1px solid ${authColors.border}`,
            bgcolor: authColors.pageBg,
            color: authColors.textMuted,
            fontSize: '0.8125rem',
          }}
        >
          <LocalShippingOutlinedIcon sx={{ fontSize: 18 }} />
          {ICS_BRAND.appBarCaption}
        </Box>
      </Box>
    </Box>
  )
}

export const authFieldSx: SxProps<Theme> = {
  '& .MuiInputLabel-root': {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: authColors.textDark,
    position: 'static',
    transform: 'none',
    mb: 0.5,
    '&.Mui-focused': { color: authColors.textDark },
  },
  '& .MuiFormHelperText-root': {
    fontSize: '0.75rem',
    color: authColors.textMuted,
    mt: 0.5,
    mx: 0,
  },
  '& .MuiOutlinedInput-root': {
    minHeight: 48,
    borderRadius: '0.625rem',
    fontSize: '0.9375rem',
    bgcolor: authColors.white,
    '& fieldset': { borderColor: authColors.border },
    '&:hover fieldset': { borderColor: authColors.border },
    '&.Mui-focused fieldset': { borderColor: authColors.primary, borderWidth: 1 },
    '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(11, 61, 145, 0.12)' },
  },
  '& .MuiOutlinedInput-input::placeholder': {
    color: authColors.placeholder,
    opacity: 1,
  },
  '& .MuiOutlinedInput-input:-webkit-autofill': {
    WebkitBoxShadow: `0 0 0 100px ${authColors.white} inset`,
    WebkitTextFillColor: authColors.textDark,
    caretColor: authColors.textDark,
  },
}

export const authPrimaryButtonSx: SxProps<Theme> = {
  mt: 0.5,
  minHeight: 48,
  borderRadius: '0.625rem',
  bgcolor: authColors.primary,
  color: '#fff',
  fontSize: '1rem',
  fontWeight: 600,
  textTransform: 'none',
  boxShadow: 'none',
  gap: 1,
  '&:hover': {
    bgcolor: authColors.primaryDark,
    boxShadow: 'none',
  },
  '&.Mui-disabled': {
    opacity: 0.65,
    color: '#fff',
    bgcolor: authColors.primary,
  },
}
