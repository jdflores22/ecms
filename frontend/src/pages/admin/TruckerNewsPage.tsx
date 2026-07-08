import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import PublishOutlinedIcon from '@mui/icons-material/PublishOutlined'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { hexToRgba } from '../../components/layout/DetailPagePrimitives'
import { ListLoadingState, LIST_PRIMARY, listPageRootSx } from '../../components/layout/ListPagePrimitives'
import { truckerNewsApi, type TruckerNewsAdmin } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { formatDateTime } from '../../utils/datetime'

const primaryDark = LIST_PRIMARY
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

function resolveImageUrl(path?: string | null) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/api$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export default function TruckerNewsPage() {
  const currentUser = useAppSelector((s) => s.auth.user)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [items, setItems] = useState<TruckerNewsAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingId, setUploadingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [pendingUploadId, setPendingUploadId] = useState<number | null>(null)

  const loadItems = useCallback(() => {
    setLoading(true)
    truckerNewsApi
      .list()
      .then(({ data }) => setItems(data))
      .catch(() => setError('Unable to load news items.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  if (currentUser?.role !== 'Administrator') {
    return <Navigate to="/" replace />
  }

  const handleCreate = async () => {
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      await truckerNewsApi.create({ title, body })
      setTitle('')
      setBody('')
      setSuccess('News draft created. Upload a cover image, then publish.')
      loadItems()
    } catch {
      setError('Unable to create news item.')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async (id: number) => {
    setError('')
    setSuccess('')
    try {
      await truckerNewsApi.publish(id)
      setSuccess('News published to trucker home carousel.')
      loadItems()
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Unable to publish. Upload a cover image first.'
      setError(message)
    }
  }

  const handlePickImage = (id: number) => {
    setPendingUploadId(id)
    fileInputRef.current?.click()
  }

  const handleImageSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    const id = pendingUploadId
    event.target.value = ''
    setPendingUploadId(null)
    if (!file || id == null) return

    setUploadingId(id)
    setError('')
    try {
      await truckerNewsApi.uploadImage(id, file)
      setSuccess('Cover image uploaded.')
      loadItems()
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Unable to upload cover image.'
      setError(message)
    } finally {
      setUploadingId(null)
    }
  }

  return (
    <Box sx={listPageRootSx}>
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <ArticleOutlinedIcon sx={{ color: primaryDark, fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Trucker news feed
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Publish stories with cover images for the trucker app home carousel.
            </Typography>
          </Box>
        </Stack>
      </Stack>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          New story
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            sx={fieldSx}
          />
          <TextField
            label="Body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            fullWidth
            multiline
            minRows={4}
            sx={fieldSx}
          />
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={saving || !title.trim() || !body.trim()}
            sx={{ alignSelf: 'flex-start', borderRadius: 2 }}
          >
            {saving ? 'Saving…' : 'Create draft'}
          </Button>
        </Stack>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={handleImageSelected}
      />

      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
        Stories
      </Typography>
      {loading ? (
        <ListLoadingState />
      ) : items.length === 0 ? (
        <Typography color="text.secondary">No news items yet.</Typography>
      ) : (
        <Stack spacing={2}>
          {items.map((item) => {
            const imageUrl = resolveImageUrl(item.imagePath)
            return (
              <Paper key={item.id} sx={{ p: 2.5, borderRadius: 3 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Box
                    sx={{
                      width: { xs: '100%', sm: 120 },
                      height: 180,
                      borderRadius: 3,
                      overflow: 'hidden',
                      bgcolor: hexToRgba(primaryDark, 0.08),
                      flexShrink: 0,
                      backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <Stack spacing={1} flex={1}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Typography variant="subtitle1" fontWeight={700}>
                        {item.title}
                      </Typography>
                      <Chip
                        size="small"
                        label={item.isPublished ? 'Published' : 'Draft'}
                        color={item.isPublished ? 'success' : 'default'}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                      {item.body.length > 180 ? `${item.body.slice(0, 180)}…` : item.body}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.createdByName} · {formatDateTime(item.createdAt)}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<CloudUploadOutlinedIcon />}
                        onClick={() => handlePickImage(item.id)}
                        disabled={uploadingId === item.id}
                      >
                        {uploadingId === item.id ? 'Uploading…' : 'Cover image'}
                      </Button>
                      {!item.isPublished && (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<PublishOutlinedIcon />}
                          onClick={() => handlePublish(item.id)}
                        >
                          Publish
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </Stack>
              </Paper>
            )
          })}
        </Stack>
      )}

      <Divider sx={{ my: 3 }} />
    </Box>
  )
}
