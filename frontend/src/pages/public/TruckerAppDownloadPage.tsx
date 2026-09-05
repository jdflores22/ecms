import AndroidOutlinedIcon from '@mui/icons-material/AndroidOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined'
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined'
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import IcsLogo from '../../components/brand/IcsLogo'
import { ICS_BRAND } from '../../config/brandCopy'
import { TRUCKER_APP_DOWNLOAD, truckerAppApkUrl } from '../../config/truckerAppDownload'

const primary = '#0B3D91'
const accent = '#00A3E0'

export default function TruckerAppDownloadPage() {
  const downloadUrl = truckerAppApkUrl()

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: '#F8FAFC' }}>
      <Box
        sx={{
          background: `linear-gradient(145deg, ${primary} 0%, #0A3580 55%, ${accent} 130%)`,
          color: '#fff',
          pb: { xs: 4, md: 5 },
        }}
      >
        <Container maxWidth="sm" sx={{ pt: { xs: 2.5, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 4 }}>
            <IcsLogo height={{ xs: 36, sm: 44 }} maxWidth={{ xs: 120, sm: 150 }} />
            <Button
              component={RouterLink}
              to="/login"
              variant="outlined"
              size="small"
              startIcon={<LoginOutlinedIcon />}
              sx={{
                fontWeight: 700,
                borderRadius: 2,
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.45)',
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
              }}
            >
              Sign in
            </Button>
          </Box>

          <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
            <Chip
              label="Android · Official release"
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.14)', color: '#fff', fontWeight: 700 }}
            />
            <Typography variant="h4" sx={{ fontWeight: 800, fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
              Download ICS Trucker
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.86)', lineHeight: 1.6, maxWidth: 520 }}>
              Install the mobile app for pre-forecast, returns, payments, withdrawals, demurrage, and push
              notifications — the same workflows as the trucker web portal.
            </Typography>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ py: { xs: 3, sm: 4 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            mb: 2.5,
          }}
        >
          <Stack spacing={2.5} sx={{ alignItems: 'stretch' }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(11, 61, 145, 0.08)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <AndroidOutlinedIcon sx={{ fontSize: 32, color: primary }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  ICS Trucker v{TRUCKER_APP_DOWNLOAD.version}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Android {TRUCKER_APP_DOWNLOAD.minAndroid}+ · ~76 MB
                </Typography>
              </Box>
            </Box>

            <Button
              component="a"
              href={downloadUrl}
              download={TRUCKER_APP_DOWNLOAD.apkFileName}
              variant="contained"
              size="large"
              startIcon={<DownloadOutlinedIcon />}
              sx={{ fontWeight: 800, borderRadius: 2, py: 1.35 }}
            >
              Download APK
            </Button>

            <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
              Direct link: {downloadUrl}
            </Typography>
          </Stack>
        </Paper>

        <Alert severity="info" icon={<SecurityOutlinedIcon />} sx={{ borderRadius: 2, mb: 2.5 }}>
          After download, open the file on your phone and tap <strong>Install</strong>. If blocked, allow installs
          from your browser or Files app under <strong>Settings → Install unknown apps</strong>.
        </Alert>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
            Installation steps
          </Typography>
          <List dense disablePadding>
            {[
              'Download the APK using the button above.',
              'Open the downloaded file on your Android device.',
              'Tap Install and allow camera, photos, and notifications when prompted.',
              'Sign in with your ICS trucker account.',
            ].map((step) => (
              <ListItem key={step} disableGutters sx={{ alignItems: 'flex-start' }}>
                <ListItemIcon sx={{ minWidth: 28, mt: 0.25 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: primary }}>
                    •
                  </Typography>
                </ListItemIcon>
                <ListItemText primary={step} slotProps={{ primary: { variant: 'body2' } }} />
              </ListItem>
            ))}
          </List>
        </Paper>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Need help? Read the{' '}
            <Button component={RouterLink} to="/trucker/faq" sx={{ fontWeight: 700, p: 0, minWidth: 0 }}>
              Trucker FAQ
            </Button>
          </Typography>
          <Typography variant="caption" color="text.disabled">
            {ICS_BRAND.name} · Package {TRUCKER_APP_DOWNLOAD.packageId}
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}
