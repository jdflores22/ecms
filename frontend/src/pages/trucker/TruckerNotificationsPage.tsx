import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined'
import {
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { hexToRgba } from '../../components/layout/DetailPagePrimitives'
import { ListLoadingState, LIST_PRIMARY, listPageRootSx } from '../../components/layout/ListPagePrimitives'
import { notificationApi, type Notification } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { formatRelativeTime } from '../../utils/datetime'

const primaryDark = LIST_PRIMARY

export default function TruckerNotificationsPage() {
  const currentUser = useAppSelector((s) => s.auth.user)
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    notificationApi
      .list({ pageSize: 50 })
      .then(({ data }) => setItems(data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleMarkAllRead = async () => {
    await notificationApi.markAllRead().catch(() => {})
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  if (currentUser?.role !== 'Trucker') {
    return <Navigate to="/" replace />
  }

  return (
    <Box sx={listPageRootSx}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: 2,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <NotificationsNoneOutlinedIcon sx={{ color: primaryDark }} />
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Notifications
            </Typography>
          </Box>
          {items.some((n) => !n.isRead) && (
            <Button size="small" onClick={handleMarkAllRead} sx={{ fontWeight: 600, textTransform: 'none' }}>
              Mark all read
            </Button>
          )}
        </Box>
      </Paper>

      {loading ? (
        <ListLoadingState />
      ) : items.length === 0 ? (
        <Paper
          elevation={0}
          sx={{ p: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}
        >
          <Typography variant="body2" color="text.secondary">
            No notifications yet.
          </Typography>
        </Paper>
      ) : (
        <Paper
          elevation={0}
          sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}
        >
          <List disablePadding>
            {items.map((item, index) => (
              <Box key={item.id}>
                {index > 0 && <Divider />}
                <ListItem
                  alignItems="flex-start"
                  sx={{
                    py: 2,
                    px: { xs: 2, sm: 2.5 },
                    bgcolor: item.isRead ? 'transparent' : hexToRgba(primaryDark, 0.04),
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.75 }}>
                        {item.title}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          component="span"
                          sx={{ display: 'block', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
                        >
                          {item.message}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          component="span"
                          sx={{ display: 'block', mt: 1 }}
                        >
                          {formatRelativeTime(item.createdAt)}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              </Box>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  )
}
