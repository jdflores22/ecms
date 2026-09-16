import AndroidOutlinedIcon from '@mui/icons-material/AndroidOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined'
import {
  Alert,
  Box,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import PublicSiteLayout, {
  PublicPageHero,
  publicColors,
  publicPrimaryButtonSx,
} from '../../components/layout/PublicSiteLayout'
import { ICS_BRAND } from '../../config/brandCopy'
import { TRUCKER_APP_DOWNLOAD, truckerAppApkUrl } from '../../config/truckerAppDownload'

export default function TruckerAppDownloadPage() {
  const downloadUrl = truckerAppApkUrl()

  return (
    <PublicSiteLayout breadcrumb="Download Android app" maxWidth="sm">
      <PublicPageHero
        eyebrow="Android · Official release"
        title="Download ICS Trucker"
        subtitle="Install the mobile app for pre-forecast, returns, payments, withdrawals, demurrage, and push notifications — the same workflows as the trucker web portal."
      />

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          borderRadius: '1rem',
          border: `1px solid ${publicColors.border}`,
          bgcolor: publicColors.white,
          mb: 2.5,
        }}
      >
        <Stack spacing={2.5} sx={{ alignItems: 'stretch' }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '0.75rem',
                bgcolor: 'rgba(11, 61, 145, 0.08)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <AndroidOutlinedIcon sx={{ fontSize: 32, color: publicColors.primary }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: publicColors.textDark }}>
                ICS Trucker v{TRUCKER_APP_DOWNLOAD.version}
              </Typography>
              <Typography variant="body2" sx={{ color: publicColors.textMuted }}>
                Android {TRUCKER_APP_DOWNLOAD.minAndroid} · ~76 MB
              </Typography>
            </Box>
          </Box>

          <Button
            component="a"
            href={downloadUrl}
            download={TRUCKER_APP_DOWNLOAD.apkFileName}
            startIcon={<DownloadOutlinedIcon />}
            sx={{ ...publicPrimaryButtonSx, width: '100%', py: 1.5 }}
          >
            Download APK
          </Button>

          <Typography variant="caption" sx={{ color: publicColors.textLight, wordBreak: 'break-all' }}>
            Direct link: {downloadUrl}
          </Typography>
        </Stack>
      </Paper>

      <Alert
        severity="info"
        icon={<SecurityOutlinedIcon />}
        sx={{
          borderRadius: '0.75rem',
          mb: 2.5,
          border: `1px solid ${publicColors.border}`,
          bgcolor: publicColors.white,
        }}
      >
        After download, open the file on your phone and tap <strong>Install</strong>. If blocked, allow installs
        from your browser or Files app under <strong>Settings → Install unknown apps</strong>.
      </Alert>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: '1rem',
          border: `1px solid ${publicColors.border}`,
          bgcolor: publicColors.white,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: publicColors.textDark }}>
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
                <Typography variant="caption" sx={{ fontWeight: 700, color: publicColors.primary }}>
                  •
                </Typography>
              </ListItemIcon>
              <ListItemText
                primary={step}
                slotProps={{ primary: { variant: 'body2', sx: { color: publicColors.textMuted } } }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: publicColors.textMuted, mb: 1 }}>
          Need help? Read the{' '}
          <Button
            component={RouterLink}
            to="/trucker/faq"
            sx={{ fontWeight: 600, p: 0, minWidth: 0, color: publicColors.primary, textTransform: 'none' }}
          >
            Trucker FAQ
          </Button>
        </Typography>
        <Typography variant="caption" sx={{ color: publicColors.textLight }}>
          {ICS_BRAND.name} · Package {TRUCKER_APP_DOWNLOAD.packageId}
        </Typography>
      </Box>
    </PublicSiteLayout>
  )
}
