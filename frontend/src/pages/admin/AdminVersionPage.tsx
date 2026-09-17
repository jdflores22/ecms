import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, List, ListItem, ListItemIcon, ListItemText, Paper, Typography } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import NewReleasesOutlinedIcon from '@mui/icons-material/NewReleasesOutlined'
import SystemUpdateAltOutlinedIcon from '@mui/icons-material/SystemUpdateAltOutlined'
import { Navigate } from 'react-router-dom'
import { PageHero, pageHeroMutedChipSx } from '../../components/layout/PageHeroPrimitives'
import { appColors } from '../../theme/colors'
import { ICS_BRAND } from '../../config/brandCopy'
import {
  APP_VERSION,
  formatReleaseDate,
  getCurrentRelease,
  getPreviousReleases,
} from '../../config/versionHistory'
import { useAppSelector } from '../../store/hooks'

function HighlightList({ items }: { items: string[] }) {
  return (
    <List dense disablePadding sx={{ mt: 0.5 }}>
      {items.map((item) => (
        <ListItem key={item} disableGutters sx={{ alignItems: 'flex-start', py: 0.75 }}>
          <ListItemIcon sx={{ minWidth: 32, mt: 0.25 }}>
            <CheckCircleIcon sx={{ fontSize: 18, color: appColors.primary }} />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography variant="body2" sx={{ lineHeight: 1.55 }}>
                {item}
              </Typography>
            }
          />
        </ListItem>
      ))}
    </List>
  )
}

export default function AdminVersionPage() {
  const currentUser = useAppSelector((s) => s.auth.user)
  const current = getCurrentRelease()
  const previous = getPreviousReleases()

  if (currentUser?.role !== 'Administrator') {
    return <Navigate to="/" replace />
  }

  return (
    <Box>
      <PageHero
        eyebrow={`${ICS_BRAND.shortName} release`}
        icon={<SystemUpdateAltOutlinedIcon />}
        title={`Version ${APP_VERSION}`}
        titleAddon={<Chip size="small" label="Current" sx={pageHeroMutedChipSx} />}
        subtitle={`${current.title} · Released ${formatReleaseDate(current.releasedOn)}`}
      />

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <NewReleasesOutlinedIcon sx={{ color: appColors.primary }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            What&apos;s new
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Highlights in version {current.version}
        </Typography>
        <HighlightList items={current.highlights} />
      </Paper>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
        Previous versions
      </Typography>

      {previous.length === 0 ? (
        <Paper
          elevation={0}
          sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
        >
          <Typography variant="body2" color="text.secondary">
            No earlier releases recorded yet.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {previous.map((release) => (
            <Accordion
              key={release.version}
              disableGutters
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '12px !important',
                '&:before': { display: 'none' },
                overflow: 'hidden',
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
                  <Typography sx={{ fontWeight: 700 }}>v{release.version}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {release.title}
                  </Typography>
                  <Chip
                    size="small"
                    label={formatReleaseDate(release.releasedOn)}
                    variant="outlined"
                    sx={{ ml: { sm: 'auto' } }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
                <HighlightList items={release.highlights} />
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  )
}
