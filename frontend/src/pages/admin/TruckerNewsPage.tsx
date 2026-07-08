import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PublishOutlinedIcon from '@mui/icons-material/PublishOutlined'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
import { useAssetUrlState } from '../../hooks/useAssetUrl'
import { truckerNewsApi, type TruckerNewsAdmin } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { formatDateTime } from '../../utils/datetime'

const primaryDark = LIST_PRIMARY
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

function NewsCoverPreview({ imagePath }: { imagePath?: string | null }) {
  const { url, loading } = useAssetUrlState(imagePath)
  return (
    <Box
      sx={{
        width: { xs: '100%', sm: 120 },
        height: 180,
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: hexToRgba(primaryDark, 0.08),
        flexShrink: 0,
        backgroundImage: url ? `url(${url})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: loading ? 0.6 : 1,
      }}
    />
  )
}

export default function TruckerNewsPage() {
  const currentUser = useAppSelector((s) => s.auth.user)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [items, setItems] = useState<TruckerNewsAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [publishingId, setPublishingId] = useState<number | null>(null)
  const [uploadingId, setUploadingId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
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
    setPublishingId(id)
    try {
      await truckerNewsApi.publish(id)
      setSuccess('News published to trucker home carousel.')
      loadItems()
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Unable to publish. Upload a cover image first.'
      setError(message)
    } finally {
      setPublishingId(null)
    }
  }

  const handleStartEdit = (item: TruckerNewsAdmin) => {
    setEditingId(item.id)
    setEditTitle(item.title)
    setEditBody(item.body)
    setError('')
    setSuccess('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
    setEditBody('')
  }

  const handleSaveEdit = async (id: number) => {
    setError('')
    setSuccess('')
    setUpdatingId(id)
    try {
      await truckerNewsApi.update(id, { title: editTitle, body: editBody })
      setSuccess('News story updated.')
      handleCancelEdit()
      loadItems()
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Unable to update news story.'
      setError(message)
    } finally {
      setUpdatingId(null)
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
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <ArticleOutlinedIcon sx={{ color: primaryDark, fontSize: 32 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Trucker news feed
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Publish stories with cover images for the trucker app home carousel. Each published story stays in the feed — swipe horizontally in the app to see older stories.
            </Typography>
          </Box>
        </Stack>
      </Stack>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
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

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
        Stories
      </Typography>
      {loading ? (
        <ListLoadingState />
      ) : items.length === 0 ? (
        <Typography color="text.secondary">No news items yet.</Typography>
      ) : (
        <Stack spacing={2}>
          {items.map((item) => (
              <Paper key={item.id} sx={{ p: 2.5, borderRadius: 3 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <NewsCoverPreview imagePath={item.imagePath} />
                  <Stack spacing={1} sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {item.title}
                      </Typography>
                      <Chip
                        size="small"
                        label={item.isPublished ? 'Published' : 'Draft'}
                        color={item.isPublished ? 'success' : 'default'}
                      />
                    </Stack>
                    {editingId === item.id ? (
                      <Stack spacing={1}>
                        <TextField
                          label="Title"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          fullWidth
                          sx={fieldSx}
                        />
                        <TextField
                          label="Body"
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          fullWidth
                          multiline
                          minRows={3}
                          sx={fieldSx}
                        />
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                        {item.body.length > 180 ? `${item.body.slice(0, 180)}…` : item.body}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {item.createdByName} · {formatDateTime(item.createdAt)}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                      {editingId === item.id ? (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleSaveEdit(item.id)}
                            disabled={updatingId === item.id || !editTitle.trim() || !editBody.trim()}
                            startIcon={
                              updatingId === item.id ? <CircularProgress size={14} color="inherit" /> : undefined
                            }
                          >
                            {updatingId === item.id ? 'Saving…' : 'Save changes'}
                          </Button>
                          <Button size="small" variant="text" onClick={handleCancelEdit} disabled={updatingId === item.id}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={
                              uploadingId === item.id ? (
                                <CircularProgress size={14} color="inherit" />
                              ) : (
                                <CloudUploadOutlinedIcon />
                              )
                            }
                            onClick={() => handlePickImage(item.id)}
                            disabled={uploadingId === item.id}
                          >
                            {uploadingId === item.id ? 'Uploading…' : 'Cover image'}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditOutlinedIcon />}
                            onClick={() => handleStartEdit(item)}
                          >
                            Edit
                          </Button>
                        </>
                      )}
                      {!item.isPublished && editingId !== item.id && (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={
                            publishingId === item.id ? (
                              <CircularProgress size={14} color="inherit" />
                            ) : (
                              <PublishOutlinedIcon />
                            )
                          }
                          onClick={() => handlePublish(item.id)}
                          disabled={publishingId === item.id}
                        >
                          {publishingId === item.id ? 'Publishing…' : 'Publish'}
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </Stack>
              </Paper>
          ))}
        </Stack>
      )}

      <Divider sx={{ my: 3 }} />
    </Box>
  )
}
