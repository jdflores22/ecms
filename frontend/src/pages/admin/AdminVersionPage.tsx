import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, List, ListItem, ListItemIcon, ListItemText, Paper, Typography } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import NewReleasesOutlinedIcon from '@mui/icons-material/NewReleasesOutlined'
import SystemUpdateAltOutlinedIcon from '@mui/icons-material/SystemUpdateAltOutlined'
import { Navigate } from 'react-router-dom'
import { LIST_PRIMARY } from '../../components/layout/ListPagePrimitives'
import {
  APP_VERSION,
  formatReleaseDate,
  getCurrentRelease,
  getPreviousReleases,
} from '../../config/versionHistory'
import { useAppSelector } from '../../store/hooks'

const primaryDark = LIST_PRIMARY

function HighlightList({ items }: { items: string[] }) {
  return (
    <List dense disablePadding sx={{ mt: 0.5 }}>
      {items.map((item) => (
        <ListItem key={item} disableGutters sx={{ alignItems: 'flex-start', py: 0.75 }}>
          <ListItemIcon sx={{ minWidth: 32, mt: 0.25 }}>
            <CheckCircleIcon sx={{ fontSize: 18, color: primaryDark }} />
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
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          mb: 3,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${primaryDark} 0%, #0A3580 60%, #0C4DA8 100%)`,
          color: '#fff',
          boxShadow: '0 8px 24px rgba(11, 61, 145, 0.22)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            right: -30,
            top: -30,
            width: 140,
            height: 140,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.06)',
          }}
        />
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', position: 'relative' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <SystemUpdateAltOutlinedIcon />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1.2 }}>
              ECMS release
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Version {APP_VERSION}
              </Typography>
              <Chip
                size="small"
                label="Current"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.16)',
                  color: '#fff',
                  fontWeight: 700,
                  border: '1px solid rgba(255,255,255,0.25)',
                }}
              />
            </Box>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.75 }}>
              {current.title} · Released {formatReleaseDate(current.releasedOn)}
            </Typography>
          </Box>
        </Box>
      </Paper>

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
          <NewReleasesOutlinedIcon sx={{ color: primaryDark }} />
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
