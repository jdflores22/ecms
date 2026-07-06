import { Box, Button, Container, Paper, Typography } from '@mui/material'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined'
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined'
import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import IcsLogo from '../components/brand/IcsLogo'
import {
  ICS_BRAND,
  ICS_LANDING,
  ICS_LANDING_FEATURES,
  ICS_LANDING_WORKFLOW,
} from '../config/brandCopy'

const primaryDark = '#0B3D91'
const primaryMid = '#0C4DA8'
const primaryLight = '#00A3E0'
const ink = '#0F172A'
const muted = '#64748B'
const surface = '#F8FAFC'

const featureIcons = {
  forecast: AssignmentOutlinedIcon,
  evaluation: FactCheckOutlinedIcon,
  yard: Inventory2OutlinedIcon,
  schedule: ScheduleOutlinedIcon,
  payment: PaymentsOutlinedIcon,
  qr: QrCode2OutlinedIcon,
} as const

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function SectionLabel({ children, onDark = false }: { children: ReactNode; onDark?: boolean }) {
  return (
    <Typography
      variant="overline"
      sx={{
        color: onDark ? primaryLight : primaryDark,
        fontWeight: 800,
        letterSpacing: 1.6,
        display: 'block',
        mb: 1,
      }}
    >
      {children}
    </Typography>
  )
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: keyof typeof featureIcons
}) {
  const Icon = featureIcons[icon]
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2.5, sm: 3 },
        height: '100%',
        borderRadius: 3,
        border: '1px solid',
        borderColor: hexToRgba(primaryDark, 0.1),
        bgcolor: '#fff',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          borderColor: hexToRgba(primaryDark, 0.22),
          boxShadow: '0 16px 40px rgba(11, 61, 145, 0.1)',
        },
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2.5,
          display: 'grid',
          placeItems: 'center',
          mb: 2,
          bgcolor: hexToRgba(primaryDark, 0.08),
          color: primaryDark,
        }}
      >
        <Icon />
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 800, color: ink, mb: 1, fontSize: '1.05rem' }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: muted, lineHeight: 1.7 }}>
        {description}
      </Typography>
    </Paper>
  )
}

export default function LandingPage() {
  const headlineParts = ICS_LANDING.headline.split(ICS_LANDING.headlineAccent)

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: '#fff', color: ink }}>
      <Box
        component="header"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(145deg, ${primaryDark} 0%, #0A3580 42%, ${primaryMid} 72%, ${primaryLight} 130%)`,
          color: '#fff',
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
            maskImage: 'linear-gradient(to bottom, black 0%, transparent 85%)',
          }}
        />
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            width: 520,
            height: 520,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.06)',
            top: -180,
            right: -120,
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: { xs: 2.5, sm: 3 } }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              mb: { xs: 6, md: 8 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
              <IcsLogo height={{ xs: 40, sm: 48 }} maxWidth={{ xs: 130, sm: 160 }} />
              <Box sx={{ display: { xs: 'none', md: 'block' }, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 800, lineHeight: 1.2, fontSize: '1rem' }}>
                  {ICS_BRAND.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                  {ICS_BRAND.appBarCaption}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                component={RouterLink}
                to="/login"
                variant="outlined"
                size="small"
                startIcon={<LoginOutlinedIcon />}
                sx={{
                  display: { xs: 'none', sm: 'inline-flex' },
                  fontWeight: 700,
                  borderRadius: 2,
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,0.45)',
                  '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
                }}
              >
                {ICS_LANDING.secondaryCta}
              </Button>
              <Button
                component={RouterLink}
                to="/signup/trucker"
                variant="contained"
                size="small"
                sx={{
                  fontWeight: 700,
                  borderRadius: 2,
                  bgcolor: '#fff',
                  color: primaryDark,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' },
                }}
              >
                {ICS_LANDING.primaryCta}
              </Button>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' },
              gap: { xs: 4, md: 6 },
              alignItems: 'center',
              pb: { xs: 6, md: 10 },
            }}
          >
            <Box>
              <SectionLabel onDark>{ICS_LANDING.eyebrow}</SectionLabel>
              <Typography
                component="h1"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '2rem', sm: '2.65rem', md: '3.1rem' },
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em',
                  mb: 2,
                  maxWidth: 720,
                }}
              >
                {headlineParts[0]}
                <Box component="span" sx={{ color: primaryLight }}>
                  {ICS_LANDING.headlineAccent}
                </Box>
                {headlineParts[1]}
              </Typography>
              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.88)',
                  lineHeight: 1.75,
                  fontSize: { xs: '1rem', sm: '1.125rem' },
                  maxWidth: 600,
                  mb: 3.5,
                }}
              >
                {ICS_LANDING.subheadline}
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 1.5,
                }}
              >
                <Button
                  component={RouterLink}
                  to="/signup/trucker"
                  variant="contained"
                  size="large"
                  sx={{
                    fontWeight: 700,
                    borderRadius: 2.5,
                    py: 1.35,
                    px: 3,
                    bgcolor: '#fff',
                    color: primaryDark,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' },
                  }}
                >
                  {ICS_LANDING.primaryCta}
                </Button>
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="outlined"
                  size="large"
                  startIcon={<LoginOutlinedIcon />}
                  sx={{
                    fontWeight: 700,
                    borderRadius: 2.5,
                    py: 1.35,
                    px: 3,
                    color: '#fff',
                    borderColor: 'rgba(255,255,255,0.5)',
                    '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
                  }}
                >
                  {ICS_LANDING.secondaryCta}
                </Button>
              </Box>
            </Box>

            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 3 },
                borderRadius: 4,
                bgcolor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.18)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <Typography
                variant="overline"
                sx={{ color: primaryLight, fontWeight: 800, letterSpacing: 1.6, display: 'block' }}
              >
                End-to-end workflow
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1.5 }}>
                {ICS_LANDING_WORKFLOW.map((item) => (
                  <Box key={item.step} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        flexShrink: 0,
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        bgcolor: 'rgba(255,255,255,0.12)',
                        border: '1px solid rgba(255,255,255,0.22)',
                        color: '#fff',
                      }}
                    >
                      {item.step}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800, lineHeight: 1.3, color: '#fff' }}>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.25, lineHeight: 1.55 }}>
                        {item.detail}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>
        </Container>
      </Box>

      <Box component="section" sx={{ py: { xs: 6, md: 9 }, bgcolor: surface }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', maxWidth: 680, mx: 'auto', mb: { xs: 4, md: 5 } }}>
            <SectionLabel>{ICS_LANDING.featuresTitle}</SectionLabel>
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, color: ink, mb: 1.5, fontSize: { xs: '1.5rem', sm: '2rem' } }}
            >
              Everything your return operation needs
            </Typography>
            <Typography sx={{ color: muted, lineHeight: 1.75 }}>{ICS_LANDING.featuresSubtitle}</Typography>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' },
              gap: 2.5,
            }}
          >
            {ICS_LANDING_FEATURES.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </Box>
        </Container>
      </Box>

      <Box component="section" sx={{ py: { xs: 6, md: 8 }, bgcolor: '#fff' }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1.4fr' },
              gap: 4,
              alignItems: 'center',
            }}
          >
            <Box>
              <SectionLabel>{ICS_LANDING.workflowTitle}</SectionLabel>
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, color: ink, mb: 1.5, fontSize: { xs: '1.5rem', sm: '2rem' } }}
              >
                One platform, four clear stages
              </Typography>
              <Typography sx={{ color: muted, lineHeight: 1.75, mb: 3 }}>
                {ICS_LANDING.workflowSubtitle}
              </Typography>
              <Button
                component={RouterLink}
                to="/login"
                variant="contained"
                size="large"
                sx={{ fontWeight: 700, borderRadius: 2.5, px: 3 }}
              >
                Access the portal
              </Button>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
              }}
            >
              {ICS_LANDING_WORKFLOW.map((item) => (
                <Paper
                  key={item.step}
                  elevation={0}
                  sx={{
                    p: 2.5,
                    height: '100%',
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: surface,
                  }}
                >
                  <Typography
                    variant="overline"
                    sx={{ color: primaryLight, fontWeight: 800, letterSpacing: 1.2 }}
                  >
                    Step {item.step}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: ink, mt: 0.5, mb: 0.75 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: muted, lineHeight: 1.65 }}>
                    {item.detail}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      <Box
        component="section"
        sx={{
          py: { xs: 6, md: 8 },
          background: `linear-gradient(180deg, ${hexToRgba(primaryDark, 0.04)} 0%, #fff 100%)`,
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <SectionLabel>{ICS_LANDING.rolesTitle}</SectionLabel>
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, color: ink, mb: 1, fontSize: { xs: '1.5rem', sm: '2rem' } }}
            >
              Join as a trucker or sign in
            </Typography>
            <Typography sx={{ color: muted, maxWidth: 560, mx: 'auto', lineHeight: 1.75 }}>
              {ICS_LANDING.rolesSubtitle}
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2.5,
              maxWidth: 960,
              mx: 'auto',
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, sm: 3.5 },
                borderRadius: 4,
                border: '1px solid',
                borderColor: hexToRgba(primaryDark, 0.14),
                boxShadow: '0 20px 48px rgba(11, 61, 145, 0.08)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: 2.5,
                    bgcolor: hexToRgba(primaryDark, 0.08),
                    color: primaryDark,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <LocalShippingOutlinedIcon />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: ink }}>
                    Trucker registration
                  </Typography>
                  <Typography variant="caption" sx={{ color: muted }}>
                    Self-service onboarding
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" sx={{ color: muted, lineHeight: 1.75, flex: 1, mb: 3 }}>
                {ICS_BRAND.truckerCard}
              </Typography>
              <Button
                component={RouterLink}
                to="/signup/trucker"
                variant="contained"
                fullWidth
                size="large"
                sx={{ fontWeight: 700, borderRadius: 2.5, py: 1.35 }}
              >
                {ICS_LANDING.primaryCta}
              </Button>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, sm: 3.5 },
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: surface,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800, color: ink, mb: 1 }}>
                Evaluator, depot & admin
              </Typography>
              <Typography variant="body2" sx={{ color: muted, lineHeight: 1.75, flex: 1, mb: 3 }}>
                Shipping-line evaluators, depot personnel, and administrators receive credentials from
                your ICS administrator. Sign in with the account provided to your organization.
              </Typography>
              <Button
                component={RouterLink}
                to="/login"
                variant="outlined"
                fullWidth
                size="large"
                startIcon={<LoginOutlinedIcon />}
                sx={{ fontWeight: 700, borderRadius: 2.5, py: 1.35, borderColor: hexToRgba(primaryDark, 0.25) }}
              >
                {ICS_LANDING.secondaryCta}
              </Button>
            </Paper>
          </Box>
        </Container>
      </Box>

      <Box
        component="footer"
        sx={{
          py: 3,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: '#fff',
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <IcsLogo height={32} maxWidth={100} />
              <Typography variant="body2" sx={{ color: muted, fontWeight: 600 }}>
                {ICS_BRAND.name}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: muted }}>
              {ICS_LANDING.footer}
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  )
}
