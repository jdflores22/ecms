import { Box, Chip, Tooltip, Typography } from '@mui/material'
import {
  groupPagesBySection,
  pageGroupChipSx,
  resolveAccessiblePages,
  type AppPage,
  type AppPageKey,
} from '../../config/routeAccess'
import RolePageAccessEditor from './RolePageAccessEditor'

type RolePageAccessListProps = {
  roleName: string
  allowedPages?: string[] | null
  compact?: boolean
}

export function RolePageAccessList({ roleName, allowedPages, compact = false }: RolePageAccessListProps) {
  const pages = resolveAccessiblePages(roleName, allowedPages)

  if (compact) {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {pages.map((page) => (
          <PageAccessChip key={page.key} page={page} />
        ))}
      </Box>
    )
  }

  const sections = groupPagesBySection(pages)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {sections.map(({ group, pages: groupPages }) => (
        <Box key={group}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', mb: 0.5 }}
          >
            {group}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {groupPages.map((page) => (
              <PageAccessChip key={page.key} page={page} />
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  )
}

function PageAccessChip({ page }: { page: AppPage }) {
  return (
    <Tooltip title={`${page.path} — ${page.description}`} arrow>
      <Chip label={page.label} size="small" sx={pageGroupChipSx(page.group)} />
    </Tooltip>
  )
}

export function RolePageAccessSummary({
  roleName,
  allowedPages,
  onChange,
}: {
  roleName: string
  allowedPages: AppPageKey[]
  onChange: (pages: AppPageKey[]) => void
}) {
  return (
    <Box sx={{ mb: 2 }}>
      <RolePageAccessEditor roleName={roleName} value={allowedPages} onChange={onChange} />
    </Box>
  )
}

export { RolePageAccessEditor }
