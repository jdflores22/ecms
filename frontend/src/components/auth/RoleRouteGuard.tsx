import { Alert, Box, Button, Paper, Typography } from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { Navigate, useLocation } from 'react-router-dom'
import { canAccessPath, getDefaultPathForRole } from '../../config/routeAccess'
import { useAppSelector } from '../../store/hooks'

export default function RoleRouteGuard({ children }: { children: React.ReactNode }) {
  const user = useAppSelector((s) => s.auth.user)
  const location = useLocation()

  if (!user?.role) return <>{children}</>

  if (canAccessPath(user.role, location.pathname, user.allowedPages)) {
    return <>{children}</>
  }

  if (location.pathname !== '/') {
    return <Navigate to={getDefaultPathForRole(user.role, user.allowedPages)} replace />
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          textAlign: 'center',
          maxWidth: 480,
          mx: 'auto',
        }}
      >
        <LockOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Access denied
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Your role does not have permission to open this page.
        </Typography>
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2, textAlign: 'left' }}>
          Page: <strong>{location.pathname}</strong>
        </Alert>
        <Button variant="contained" href="/" sx={{ fontWeight: 700, borderRadius: 2 }}>
          Go to dashboard
        </Button>
      </Paper>
    </Box>
  )
}
