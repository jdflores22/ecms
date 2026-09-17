import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import { Box, Breadcrumbs, Link, Typography } from '@mui/material'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { portalColors } from '../../theme/portalTheme'

export interface PortalBreadcrumbItem {
  label: string
  href?: string
}

function buildBreadcrumbs(pathname: string, navLabels: PortalBreadcrumbItem[]): PortalBreadcrumbItem[] {
  if (pathname === '/') {
    return [{ label: 'Dashboard' }]
  }

  const match = navLabels
    .filter((item) => item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`)))
    .sort((a, b) => (b.href?.length ?? 0) - (a.href?.length ?? 0))[0]

  const items: PortalBreadcrumbItem[] = [{ label: 'Dashboard', href: '/' }]
  if (match) {
    items.push({ label: match.label })
  }
  return items
}

export function PortalBreadcrumbs({ navItems }: { navItems: PortalBreadcrumbItem[] }) {
  const { pathname } = useLocation()
  const items = buildBreadcrumbs(pathname, navItems)

  if (items.length === 0) return null

  return (
    <Box component="nav" aria-label="Breadcrumb" sx={{ mb: 3 }}>
      <Breadcrumbs
        separator={<NavigateNextIcon sx={{ fontSize: 16, color: portalColors.textLight }} />}
        sx={{
          '& .MuiBreadcrumbs-ol': { flexWrap: 'wrap' },
          '& .MuiBreadcrumbs-li': { display: 'flex', alignItems: 'center' },
        }}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          if (isLast || !item.href) {
            return (
              <Typography
                key={`${item.label}-${index}`}
                sx={{
                  fontSize: '0.8125rem',
                  fontWeight: isLast ? 600 : 500,
                  color: isLast ? portalColors.textDark : portalColors.textMuted,
                }}
              >
                {item.label}
              </Typography>
            )
          }
          return (
            <Link
              key={`${item.label}-${index}`}
              component={RouterLink}
              to={item.href}
              underline="hover"
              sx={{
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: portalColors.textMuted,
                '&:hover': { color: portalColors.primary },
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </Breadcrumbs>
    </Box>
  )
}
