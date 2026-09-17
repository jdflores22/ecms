import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import type { ComponentType } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { portalAnalyticsColors, portalColors } from '../../theme/portalTheme'

export interface DashboardStatItem {
  label: string
  value: string | number
  caption?: string
}

export function DashboardStatStrip({ items }: { items: DashboardStatItem[] }) {
  const mdCols = items.length <= 2 ? 2 : Math.min(items.length, 4)
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          md: `repeat(${mdCols}, minmax(0, 1fr))`,
        },
        gap: 1.5,
      }}
    >
      {items.map((item) => (
        <Box
          key={item.label}
          sx={{
            p: 2,
            borderRadius: '0.875rem',
            bgcolor: portalColors.bgWhite,
            border: `1px solid ${portalColors.border}`,
            height: '100%',
          }}
        >
            <Typography
              sx={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: portalColors.textMuted,
              }}
            >
              {item.label}
            </Typography>
            <Typography
              sx={{
                mt: 0.75,
                fontSize: '1.5rem',
                fontWeight: 700,
                color: portalAnalyticsColors.darkest,
                lineHeight: 1.1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {item.value}
            </Typography>
            {item.caption && (
              <Typography sx={{ mt: 0.5, fontSize: '0.8125rem', color: portalColors.textMuted }}>
                {item.caption}
              </Typography>
            )}
        </Box>
      ))}
    </Box>
  )
}

export function DashboardQuickLinkCard({
  to,
  icon: Icon,
  label,
  description,
}: {
  to: string
  icon: ComponentType<{ sx?: object }>
  label: string
  description: string
}) {
  return (
    <Box
      component={RouterLink}
      to={to}
      sx={{
        display: 'block',
        height: '100%',
        p: 2,
        borderRadius: '0.875rem',
        border: `1px solid ${portalColors.border}`,
        bgcolor: portalColors.bgWhite,
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
        '&:hover': {
          borderColor: portalAnalyticsColors.softStrong,
          boxShadow: '0 8px 20px rgba(11, 61, 145, 0.08)',
          transform: 'translateY(-1px)',
        },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '0.625rem',
            bgcolor: portalAnalyticsColors.soft,
            border: `1px solid ${portalAnalyticsColors.softStrong}`,
            display: 'grid',
            placeItems: 'center',
            color: portalAnalyticsColors.dark,
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: 20 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, color: portalAnalyticsColors.darkest }}>{label}</Typography>
          <Typography sx={{ mt: 0.25, fontSize: '0.8125rem', color: portalColors.textMuted, lineHeight: 1.45 }}>
            {description}
          </Typography>
        </Box>
      </Stack>
    </Box>
  )
}

export interface DashboardAttentionItem {
  label: string
  value: string | number
  href?: string
  onClick?: () => void
}

export function DashboardAttentionPanel({
  title = 'Needs attention',
  subtitle = 'Operational items that may require follow-up.',
  items,
}: {
  title?: string
  subtitle?: string
  items: DashboardAttentionItem[]
}) {
  if (items.length === 0) return null

  return (
    <Box
      sx={{
        borderRadius: '0.875rem',
        border: `1px solid ${portalAnalyticsColors.softStrong}`,
        bgcolor: portalAnalyticsColors.soft,
        p: 2.5,
        height: '100%',
      }}
    >
      <Typography sx={{ fontWeight: 700, color: portalAnalyticsColors.darkest, mb: 0.5 }}>{title}</Typography>
      <Typography sx={{ fontSize: '0.8125rem', color: portalColors.textMuted, mb: 2 }}>{subtitle}</Typography>
      <Stack spacing={1.25}>
        {items.map((item) => {
          const content = (
            <>
              <Typography sx={{ fontSize: '0.875rem', color: portalColors.textMuted }}>{item.label}</Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1.125rem', color: portalAnalyticsColors.darkest }}>
                  {item.value}
                </Typography>
                <ArrowForwardIcon sx={{ fontSize: 16, color: portalColors.textMuted }} />
              </Stack>
            </>
          )

          const rowSx = {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            p: 1.5,
            borderRadius: '0.75rem',
            bgcolor: portalColors.bgWhite,
            border: `1px solid ${portalColors.border}`,
            textDecoration: 'none',
            color: 'inherit',
            cursor: item.href || item.onClick ? 'pointer' : 'default',
            '&:hover':
              item.href || item.onClick
                ? { borderColor: portalAnalyticsColors.base }
                : undefined,
          }

          if (item.href) {
            return (
              <Box key={item.label} component={RouterLink} to={item.href} sx={rowSx}>
                {content}
              </Box>
            )
          }

          return (
            <Box key={item.label} onClick={item.onClick} sx={rowSx} role={item.onClick ? 'button' : undefined}>
              {content}
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}

export function DashboardWorkflowPanel({ steps }: { steps: string[] }) {
  return (
    <Box
      sx={{
        borderRadius: '0.875rem',
        border: `1px solid ${portalColors.border}`,
        bgcolor: portalColors.bgWhite,
        p: 2.5,
        height: '100%',
      }}
    >
      <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Workflow</Typography>
      <Typography sx={{ fontSize: '0.8125rem', color: portalColors.textMuted, mb: 2 }}>
        Typical steps for your role in ICS.
      </Typography>
      <Stack spacing={1.25}>
        {steps.map((step, index) => (
          <Box
            key={step}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.5,
              p: 1.5,
              borderRadius: '0.75rem',
              border: `1px solid ${portalColors.border}`,
              bgcolor: portalColors.bgWhite,
            }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#fff',
                bgcolor: index === 0 ? portalAnalyticsColors.light : portalAnalyticsColors.dark,
              }}
            >
              {index + 1}
            </Box>
            <Typography sx={{ fontSize: '0.875rem', color: portalColors.textMuted, lineHeight: 1.5, pt: 0.25 }}>
              {step}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  )
}
