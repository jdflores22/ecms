import {
  Box,
  Button,
  Paper,
  Typography,
} from '@mui/material'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import { Link as RouterLink } from 'react-router-dom'
import { ICS_BRAND } from '../config/brandCopy'

const primaryDark = '#0B3D91'
const primaryLight = '#00A3E0'

const signupCardSx = {
  p: { xs: 2.5, sm: 3 },
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: '#fff',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
  '&:hover': {
    borderColor: 'rgba(11, 61, 145, 0.35)',
    boxShadow: '0 12px 32px rgba(11, 61, 145, 0.12)',
  },
} as const

export default function LandingPage() {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(135deg, ${primaryDark} 0%, #0A3580 45%, #0C4DA8 75%, ${primaryLight} 140%)`,
        position: 'relative',
        overflowX: 'hidden',
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
            width: { xs: 280, md: 480 },
            height: { xs: 280, md: 480 },
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.05)',
            top: -100,
            right: -80,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: { xs: 220, md: 360 },
            height: { xs: 220, md: 360 },
            borderRadius: '50%',
            bgcolor: 'rgba(0, 163, 224, 0.12)',
            bottom: -80,
            left: -60,
          }}
        />
      </Box>

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 960,
          mx: 'auto',
          px: { xs: 2, sm: 3 },
          py: { xs: 3, sm: 5 },
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: { xs: 4, sm: 6 } }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2.5,
              bgcolor: 'rgba(255,255,255,0.14)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Inventory2OutlinedIcon sx={{ fontSize: 28, color: '#fff' }} />
          </Box>
          <Box>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.75)', letterSpacing: 1.5, lineHeight: 1.2 }}>
              {ICS_BRAND.shortName}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
              {ICS_BRAND.name}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              color: '#fff',
              mb: 1.5,
              fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.75rem' },
              maxWidth: 640,
            }}
          >
            {ICS_BRAND.tagline}
          </Typography>
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.85)',
              lineHeight: 1.7,
              maxWidth: 560,
              mb: { xs: 3, sm: 4 },
            }}
          >
            {ICS_BRAND.description}
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
              mb: 3,
            }}
          >
            <Paper elevation={0} sx={signupCardSx}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: 'rgba(21, 101, 192, 0.1)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <StorefrontOutlinedIcon sx={{ color: '#1565C0' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: primaryDark }}>
                  Broker
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, flex: 1 }}>
                {ICS_BRAND.brokerCard}
              </Typography>
              <Button
                component={RouterLink}
                to="/signup/broker"
                variant="contained"
                fullWidth
                sx={{ fontWeight: 700, borderRadius: 2, py: 1.2 }}
              >
                Create broker account
              </Button>
            </Paper>

            <Paper elevation={0} sx={signupCardSx}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: 'rgba(106, 27, 154, 0.1)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <LocalShippingOutlinedIcon sx={{ color: '#6A1B9A' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: primaryDark }}>
                  Trucker
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, flex: 1 }}>
                View assigned returns, upload payment proofs, and download booking QR passes for depot gate entry.
              </Typography>
              <Button
                component={RouterLink}
                to="/signup/trucker"
                variant="contained"
                fullWidth
                sx={{ fontWeight: 700, borderRadius: 2, py: 1.2 }}
              >
                Create trucker account
              </Button>
            </Paper>
          </Box>

          <Button
            component={RouterLink}
            to="/login"
            variant="outlined"
            startIcon={<LoginOutlinedIcon />}
            sx={{
              alignSelf: { xs: 'stretch', sm: 'flex-start' },
              fontWeight: 700,
              borderRadius: 2,
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.55)',
              px: 3,
              py: 1.1,
              '&:hover': {
                borderColor: '#fff',
                bgcolor: 'rgba(255,255,255,0.08)',
              },
            }}
          >
            Sign in to existing account
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
