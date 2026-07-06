import { Box, Checkbox, FormControlLabel, FormGroup, Paper, Typography } from '@mui/material'
import {
  APP_PAGES,
  REQUIRED_PAGE_KEYS,
  getAssignablePageKeys,
  groupPagesBySection,
  type AppPageKey,
} from '../../config/routeAccess'

type RolePageAccessEditorProps = {
  roleName: string
  value: AppPageKey[]
  onChange: (pages: AppPageKey[]) => void
}

export default function RolePageAccessEditor({ roleName, value, onChange }: RolePageAccessEditorProps) {
  const assignable = getAssignablePageKeys(roleName)
  const sections = groupPagesBySection(assignable.map((key) => APP_PAGES[key]))
  const selected = new Set(value)

  const toggle = (key: AppPageKey, checked: boolean) => {
    if (REQUIRED_PAGE_KEYS.includes(key)) return
    const next = new Set(value)
    if (checked) {
      next.add(key)
      if (key === 'truckerQr') next.add('truckerQrPrint')
    } else {
      next.delete(key)
      if (key === 'truckerQr') next.delete('truckerQrPrint')
    }
    REQUIRED_PAGE_KEYS.forEach((required) => next.add(required))
    onChange(
      assignable.filter((pageKey) => next.has(pageKey)),
    )
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2.5,
        bgcolor: 'rgba(11, 61, 145, 0.03)',
        border: '1px solid',
        borderColor: 'rgba(11, 61, 145, 0.1)',
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        Page access
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, lineHeight: 1.5 }}>
        Uncheck pages this role should not see. Dashboard and Profile are always required.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {sections.map(({ group, pages }) => (
          <Box key={group}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', mb: 0.25 }}
            >
              {group}
            </Typography>
            <FormGroup sx={{ gap: 0 }}>
              {pages.map((page) => {
                const required = REQUIRED_PAGE_KEYS.includes(page.key)
                const checked = selected.has(page.key) || required
                return (
                  <FormControlLabel
                    key={page.key}
                    control={
                      <Checkbox
                        size="small"
                        checked={checked}
                        disabled={required}
                        onChange={(e) => toggle(page.key, e.target.checked)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {page.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {page.path}
                          {required ? ' · Required' : ''}
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start', ml: 0, mr: 0, py: 0.25 }}
                  />
                )
              })}
            </FormGroup>
          </Box>
        ))}
      </Box>
    </Paper>
  )
}
