import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined'
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined'
import { Box, Button, Container, Paper, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  ICS_BRAND,
  ICS_LANDING,
  ICS_LANDING_FEATURES,
  ICS_LANDING_WORKFLOW,
} from '../config/brandCopy'
import {
  PublicSiteFooter,
  PublicSiteHeader,
  publicColors,
  publicOutlineButtonSx,
  publicPrimaryButtonSx,
} from '../components/layout/PublicSiteLayout'

const featureIcons = {
  forecast: AssignmentOutlinedIcon,
  evaluation: FactCheckOutlinedIcon,
  yard: Inventory2OutlinedIcon,
  schedule: ScheduleOutlinedIcon,
  payment: PaymentsOutlinedIcon,
  qr: QrCode2OutlinedIcon,
} as const

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Typography
      variant="overline"
      sx={{
        color: publicColors.primary,
        fontWeight: 700,
        letterSpacing: '0.08em',
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
        borderRadius: '1rem',
        border: `1px solid ${publicColors.border}`,
        bgcolor: publicColors.white,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: publicColors.primary,
          boxShadow: '0 12px 32px rgba(11, 61, 145, 0.08)',
        },
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '0.75rem',
          display: 'grid',
          placeItems: 'center',
          mb: 2,
          bgcolor: 'rgba(11, 61, 145, 0.08)',
          color: publicColors.primary,
        }}
      >
        <Icon />
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, color: publicColors.textDark, mb: 1, fontSize: '1.05rem' }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: publicColors.textMuted, lineHeight: 1.7 }}>
        {description}
      </Typography>
    </Paper>
  )
}

export default function LandingPage() {
  const headlineParts = ICS_LANDING.headline.split(ICS_LANDING.headlineAccent)

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
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderBottom: `1px solid ${publicColors.border}`,
            bgcolor: publicColors.white,
            backgroundImage: publicColors.heroGradient,
          }}
        >
          <Box
            aria-hidden
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

          <Container maxWidth="lg" sx={{ position: 'relative', py: { xs: 5, md: 8 }, px: { xs: 2.5, sm: 3 } }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' },
                gap: { xs: 4, md: 6 },
                alignItems: 'center',
              }}
            >
              <Box>
                <SectionLabel>{ICS_LANDING.eyebrow}</SectionLabel>
                <Typography
                  component="h1"
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '2rem', sm: '2.65rem', md: '3rem' },
                    lineHeight: 1.15,
                    letterSpacing: '-0.02em',
                    mb: 2,
                    maxWidth: 720,
                    color: publicColors.textDark,
                  }}
                >
                  {headlineParts[0]}
                  <Box component="span" sx={{ color: publicColors.primary }}>
                    {ICS_LANDING.headlineAccent}
                  </Box>
                  {headlineParts[1]}
                </Typography>
                <Typography
                  sx={{
                    color: publicColors.textMuted,
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
                  <Button component={RouterLink} to="/signup/trucker" sx={publicPrimaryButtonSx}>
                    {ICS_LANDING.primaryCta}
                  </Button>
                  <Button
                    component={RouterLink}
                    to="/login"
                    startIcon={<LoginOutlinedIcon />}
                    sx={publicOutlineButtonSx}
                  >
                    {ICS_LANDING.secondaryCta}
                  </Button>
                </Box>
              </Box>

              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2.5, sm: 3 },
                  borderRadius: '1rem',
                  bgcolor: publicColors.white,
                  border: `1px solid ${publicColors.border}`,
                  boxShadow: '0 8px 32px rgba(28, 25, 23, 0.06)',
                }}
              >
                <Typography
                  variant="overline"
                  sx={{ color: publicColors.primary, fontWeight: 700, letterSpacing: '0.08em', display: 'block' }}
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
                          borderRadius: '0.5rem',
                          flexShrink: 0,
                          display: 'grid',
                          placeItems: 'center',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          bgcolor: 'rgba(11, 61, 145, 0.08)',
                          border: `1px solid ${publicColors.border}`,
                          color: publicColors.primary,
                        }}
                      >
                        {item.step}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, lineHeight: 1.3, color: publicColors.textDark }}>
                          {item.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: publicColors.textMuted, mt: 0.25, lineHeight: 1.55 }}>
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

        <Box component="section" sx={{ py: { xs: 6, md: 9 } }}>
          <Container maxWidth="lg" sx={{ px: { xs: 2.5, sm: 3 } }}>
            <Box sx={{ textAlign: 'center', maxWidth: 680, mx: 'auto', mb: { xs: 4, md: 5 } }}>
              <SectionLabel>{ICS_LANDING.featuresTitle}</SectionLabel>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: publicColors.textDark,
                  mb: 1.5,
                  fontSize: { xs: '1.5rem', sm: '2rem' },
                }}
              >
                Everything your return operation needs
              </Typography>
              <Typography sx={{ color: publicColors.textMuted, lineHeight: 1.75 }}>
                {ICS_LANDING.featuresSubtitle}
              </Typography>
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

        <Box
          component="section"
          sx={{
            py: { xs: 6, md: 8 },
            bgcolor: publicColors.white,
            borderTop: `1px solid ${publicColors.border}`,
            borderBottom: `1px solid ${publicColors.border}`,
          }}
        >
          <Container maxWidth="lg" sx={{ px: { xs: 2.5, sm: 3 } }}>
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
                  sx={{
                    fontWeight: 700,
                    color: publicColors.textDark,
                    mb: 1.5,
                    fontSize: { xs: '1.5rem', sm: '2rem' },
                  }}
                >
                  One platform, four clear stages
                </Typography>
                <Typography sx={{ color: publicColors.textMuted, lineHeight: 1.75, mb: 3 }}>
                  {ICS_LANDING.workflowSubtitle}
                </Typography>
                <Button component={RouterLink} to="/login" sx={publicPrimaryButtonSx}>
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
                      borderRadius: '1rem',
                      border: `1px solid ${publicColors.border}`,
                      bgcolor: publicColors.pageBg,
                    }}
                  >
                    <Typography
                      variant="overline"
                      sx={{ color: publicColors.accent, fontWeight: 700, letterSpacing: '0.06em' }}
                    >
                      Step {item.step}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: publicColors.textDark, mt: 0.5, mb: 0.75 }}>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: publicColors.textMuted, lineHeight: 1.65 }}>
                      {item.detail}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Box>
          </Container>
        </Box>

        <Box component="section" sx={{ py: { xs: 6, md: 8 } }}>
          <Container maxWidth="lg" sx={{ px: { xs: 2.5, sm: 3 } }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <SectionLabel>{ICS_LANDING.rolesTitle}</SectionLabel>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: publicColors.textDark,
                  mb: 1,
                  fontSize: { xs: '1.5rem', sm: '2rem' },
                }}
              >
                Join as a trucker or sign in
              </Typography>
              <Typography sx={{ color: publicColors.textMuted, maxWidth: 560, mx: 'auto', lineHeight: 1.75 }}>
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
                  borderRadius: '1rem',
                  border: `1px solid ${publicColors.border}`,
                  bgcolor: publicColors.white,
                  boxShadow: '0 12px 40px rgba(11, 61, 145, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: '0.75rem',
                      bgcolor: 'rgba(11, 61, 145, 0.08)',
                      color: publicColors.primary,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <LocalShippingOutlinedIcon />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: publicColors.textDark }}>
                      Trucker registration
                    </Typography>
                    <Typography variant="caption" sx={{ color: publicColors.textMuted }}>
                      Self-service onboarding
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" sx={{ color: publicColors.textMuted, lineHeight: 1.75, flex: 1, mb: 3 }}>
                  {ICS_BRAND.truckerCard}
                </Typography>
                <Button component={RouterLink} to="/signup/trucker" fullWidth sx={publicPrimaryButtonSx}>
                  {ICS_LANDING.primaryCta}
                </Button>
                <Button
                  component={RouterLink}
                  to="/trucker/faq"
                  fullWidth
                  sx={{ ...publicOutlineButtonSx, mt: 1.5 }}
                >
                  Trucker FAQ — no login needed
                </Button>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, sm: 3.5 },
                  borderRadius: '1rem',
                  border: `1px solid ${publicColors.border}`,
                  bgcolor: publicColors.pageBg,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700, color: publicColors.textDark, mb: 1 }}>
                  Evaluator, depot & admin
                </Typography>
                <Typography variant="body2" sx={{ color: publicColors.textMuted, lineHeight: 1.75, flex: 1, mb: 3 }}>
                  Shipping-line evaluators, depot personnel, and administrators receive credentials from
                  your ICS administrator. Sign in with the account provided to your organization.
                </Typography>
                <Button
                  component={RouterLink}
                  to="/login"
                  fullWidth
                  startIcon={<LoginOutlinedIcon />}
                  sx={publicOutlineButtonSx}
                >
                  {ICS_LANDING.secondaryCta}
                </Button>
              </Paper>
            </Box>
          </Container>
        </Box>
      </Box>

      <PublicSiteFooter />
    </Box>
  )
}
