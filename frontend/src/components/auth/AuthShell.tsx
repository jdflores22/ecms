import { Box, Paper, Typography } from '@mui/material'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import { ECMS_BRAND } from '../../config/brandCopy'

const primaryDark = '#0B3D91'
const primaryLight = '#00A3E0'

interface AuthShellProps {
  title: string
  subtitle: string
  children: React.ReactNode
  footer?: React.ReactNode
}

function BrandIcon({ size = 32 }: { size?: number }) {
  return (
    <Box
      sx={{
        width: size + 24,
        height: size + 24,
        borderRadius: 2.5,
        bgcolor: 'rgba(255,255,255,0.14)',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
      }}
    >
      <Inventory2OutlinedIcon sx={{ fontSize: size }} />
    </Box>
  )
}

export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        justifyContent: 'center',
        p: { xs: 2, sm: 3 },
        pt: { xs: 'max(16px, env(safe-area-inset-top))', sm: 3 },
        pb: { xs: 'max(16px, env(safe-area-inset-bottom))', sm: 3 },
        px: {
          xs: 'max(16px, env(safe-area-inset-left))',
          sm: 'max(24px, env(safe-area-inset-left))',
        },
        background: `linear-gradient(135deg, ${primaryDark} 0%, #0A3580 45%, #0C4DA8 75%, ${primaryLight} 140%)`,
        position: 'relative',
        overflowX: 'hidden',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            width: { xs: 240, sm: 420 },
            height: { xs: 240, sm: 420 },
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.05)',
            top: { xs: -80, sm: -120 },
            left: { xs: -60, sm: -80 },
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: { xs: 200, sm: 320 },
            height: { xs: 200, sm: 320 },
            borderRadius: '50%',
            bgcolor: 'rgba(0, 163, 224, 0.12)',
            bottom: { xs: -60, sm: -100 },
            right: { xs: -40, sm: -60 },
          }}
        />
      </Box>

      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: { xs: 440, md: 920 },
          m: 'auto',
          borderRadius: { xs: 3, sm: 4 },
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          boxShadow: '0 24px 64px rgba(11, 61, 145, 0.35)',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            p: { md: 4 },
            background: `linear-gradient(160deg, ${primaryDark} 0%, #0A3580 100%)`,
            color: '#fff',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ mb: 3 }}>
            <BrandIcon />
          </Box>
          <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.75)', letterSpacing: 1.5 }}>
            {ECMS_BRAND.shortName}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, mb: 1.5 }}>
            {ECMS_BRAND.name}
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.82)', lineHeight: 1.6, maxWidth: 360 }}>
            {ECMS_BRAND.description}
          </Typography>
        </Box>

        <Box sx={{ p: { xs: 2.5, sm: 4 }, bgcolor: '#fff', minWidth: 0 }}>
          <Box
            sx={{
              display: { xs: 'flex', md: 'none' },
              alignItems: 'center',
              gap: 1.5,
              mb: 2.5,
              pb: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: 'rgba(11, 61, 145, 0.08)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <Inventory2OutlinedIcon sx={{ fontSize: 26, color: primaryDark }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="overline"
                sx={{ color: primaryDark, letterSpacing: 1.2, lineHeight: 1.2, display: 'block' }}
              >
                {ECMS_BRAND.shortName}
              </Typography>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: primaryDark, lineHeight: 1.3 }}
              >
                {ECMS_BRAND.appBarCaption}
              </Typography>
            </Box>
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 800, color: primaryDark, mb: 0.5, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: { xs: 2, sm: 3 } }}>
            {subtitle}
          </Typography>
          {children}
          {footer}
        </Box>
      </Paper>
    </Box>
  )
}

export const authFieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 2 },
}

export const authPrimaryButtonSx = {
  mt: { xs: 1, sm: 2 },
  py: 1.35,
  fontWeight: 700,
  borderRadius: 2,
  boxShadow: '0 6px 16px rgba(11, 61, 145, 0.25)',
}
