import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import axios from 'axios'
import { useCallback, useMemo, useRef, useState } from 'react'
import { resolveAssetUrl } from '../../utils/assetUrl'
import {
  CONTAINER_PHOTO_CATEGORIES,
  DAMAGE_PHOTO_CATEGORY,
  containerPhotoLabel,
  type ContainerPhotoCategoryValue,
} from '../../config/containerPhotoCategories'
import { preAdviceApi, type PreAdviceDocument } from '../../services/api'

const primaryDark = '#0B3D91'

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

type Props = {
  preAdviceId: number
  documents: PreAdviceDocument[]
  loading?: boolean
  canManage?: boolean
  onChange: () => void
  error?: string
  onError?: (message: string) => void
}

export default function ContainerIdentityPhotos({
  preAdviceId,
  documents,
  loading = false,
  canManage = false,
  onChange,
  error,
  onError,
}: Props) {
  const [uploading, setUploading] = useState<string | null>(null)
  const [damageOpen, setDamageOpen] = useState(false)
  const [damageComment, setDamageComment] = useState('')
  const [damageFile, setDamageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({})
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({})

  const markImageBroken = useCallback((filePath: string) => {
    setBrokenImages((prev) => (prev[filePath] ? prev : { ...prev, [filePath]: true }))
  }, [])

  const byCategory = useMemo(() => {
    const map = new Map<string, PreAdviceDocument>()
    for (const doc of documents) {
      if (doc.category && !map.has(doc.category)) {
        map.set(doc.category, doc)
      }
    }
    return map
  }, [documents])

  const damagePhotos = useMemo(
    () => documents.filter((d) => d.category === DAMAGE_PHOTO_CATEGORY.value),
    [documents],
  )

  const standardUploaded = CONTAINER_PHOTO_CATEGORIES.filter((c) => byCategory.has(c.value)).length
  const progress = Math.round((standardUploaded / CONTAINER_PHOTO_CATEGORIES.length) * 100)

  const uploadPhoto = useCallback(
    async (category: ContainerPhotoCategoryValue, file: File, comment?: string) => {
      setUploading(category)
      onError?.('')
      try {
        await preAdviceApi.uploadDocument(preAdviceId, file, category, comment)
        onChange()
      } catch (err) {
        onError?.(apiErrorMessage(err, 'Failed to upload photo.'))
      } finally {
        setUploading(null)
      }
    },
    [preAdviceId, onChange, onError],
  )

  const deletePhoto = async (documentId: number) => {
    if (!window.confirm('Remove this photo?')) return
    setUploading(`delete-${documentId}`)
    onError?.('')
    try {
      await preAdviceApi.deleteDocument(preAdviceId, documentId)
      onChange()
    } catch (err) {
      onError?.(apiErrorMessage(err, 'Failed to remove photo.'))
    } finally {
      setUploading(null)
    }
  }

  const handleDamageSubmit = async () => {
    if (!damageFile || !damageComment.trim()) return
    await uploadPhoto(DAMAGE_PHOTO_CATEGORY.value, damageFile, damageComment.trim())
    setDamageOpen(false)
    setDamageComment('')
    setDamageFile(null)
  }

  const renderSlot = (category: { value: ContainerPhotoCategoryValue; label: string }) => {
    const doc = byCategory.get(category.value)
    const busy = uploading === category.value

    return (
      <Paper
        key={category.value}
        elevation={0}
        sx={{
          borderRadius: 2.5,
          border: '1px solid',
          borderColor: doc ? hexToRgba(primaryDark, 0.25) : 'divider',
          bgcolor: doc ? hexToRgba(primaryDark, 0.02) : '#fff',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: hexToRgba(primaryDark, 0.03) }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: primaryDark }}>
            {category.label}
          </Typography>
        </Box>

        <Box sx={{ position: 'relative', aspectRatio: '4/3', bgcolor: '#f8fafc' }}>
          {doc ? (
            <>
              {brokenImages[doc.filePath] ? (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    p: 2,
                    textAlign: 'center',
                  }}
                >
                  <ReportProblemOutlinedIcon color="warning" />
                  <Typography variant="caption" color="text.secondary">
                    Photo file missing on server — re-upload this image.
                  </Typography>
                  {canManage && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<CameraAltOutlinedIcon />}
                      onClick={() => fileInputsRef.current[category.value]?.click()}
                    >
                      Re-upload
                    </Button>
                  )}
                </Box>
              ) : (
                <Box
                  component="img"
                  src={resolveAssetUrl(doc.filePath)}
                  alt={category.label}
                  onError={() => markImageBroken(doc.filePath)}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              )}
              {!brokenImages[doc.filePath] && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'flex-end',
                  gap: 0.5,
                  p: 0.75,
                  background: 'linear-gradient(transparent 55%, rgba(0,0,0,0.45))',
                }}
              >
                <Tooltip title="View full size">
                  <IconButton
                    size="small"
                    onClick={() => setPreviewUrl(resolveAssetUrl(doc.filePath))}
                    sx={{ bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: '#fff' } }}
                    aria-label={`View ${category.label}`}
                  >
                    <ZoomInIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {canManage && (
                  <>
                    <Tooltip title="Replace photo">
                      <IconButton
                        size="small"
                        disabled={!!uploading}
                        onClick={() => fileInputsRef.current[category.value]?.click()}
                        sx={{ bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: '#fff' } }}
                        aria-label={`Replace ${category.label}`}
                      >
                        <CameraAltOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove photo">
                      <IconButton
                        size="small"
                        color="error"
                        disabled={!!uploading}
                        onClick={() => deletePhoto(doc.id)}
                        sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}
                        aria-label={`Remove ${category.label}`}
                      >
                        <DeleteOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </Box>
              )}
            </>
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                p: 2,
              }}
            >
              {busy ? (
                <CircularProgress size={28} sx={{ color: primaryDark }} />
              ) : canManage ? (
                <>
                  <CameraAltOutlinedIcon sx={{ color: 'text.disabled', fontSize: 32 }} />
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!!uploading}
                    onClick={() => fileInputsRef.current[category.value]?.click()}
                    sx={{ fontWeight: 600, borderRadius: 2 }}
                  >
                    Add photo
                  </Button>
                </>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  No photo
                </Typography>
              )}
            </Box>
          )}
        </Box>

        {canManage && (
          <input
            ref={(el) => {
              fileInputsRef.current[category.value] = el
            }}
            type="file"
            hidden
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void uploadPhoto(category.value, file)
              e.target.value = ''
            }}
          />
        )}
      </Paper>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Container identity photos
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Upload images of each container view for evaluator review (JPG, PNG, WEBP — max 10 MB)
            {!canManage && ' · read-only'}
          </Typography>
        </Box>
        <Chip
          label={`${standardUploaded}/${CONTAINER_PHOTO_CATEGORIES.length} views`}
          size="small"
          sx={{
            fontWeight: 700,
            bgcolor: progress === 100 ? hexToRgba('#2E7D32', 0.12) : hexToRgba(primaryDark, 0.08),
            color: progress === 100 ? '#2E7D32' : primaryDark,
          }}
        />
      </Box>

      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          mb: 2.5,
          height: 6,
          borderRadius: 3,
          bgcolor: hexToRgba(primaryDark, 0.08),
          '& .MuiLinearProgress-bar': { bgcolor: progress === 100 ? '#2E7D32' : primaryDark, borderRadius: 3 },
        }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress sx={{ color: primaryDark }} />
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
              gap: 2,
              mb: 3,
            }}
          >
            {CONTAINER_PHOTO_CATEGORIES.map(renderSlot)}
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: hexToRgba('#ED6C02', 0.35),
              bgcolor: hexToRgba('#ED6C02', 0.04),
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: damagePhotos.length ? 2 : 0, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <ReportProblemOutlinedIcon sx={{ color: '#ED6C02' }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Damage photos (optional)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Add extra photos for visible damage — a description is required for each
                  </Typography>
                </Box>
              </Box>
              {canManage && (
                <Button
                  startIcon={<AddPhotoAlternateIcon />}
                  variant="outlined"
                  color="warning"
                  disabled={!!uploading}
                  onClick={() => {
                    setDamageComment('')
                    setDamageFile(null)
                    setDamageOpen(true)
                  }}
                  sx={{ fontWeight: 600, borderRadius: 2 }}
                >
                  Add damage photo
                </Button>
              )}
            </Box>

            {damagePhotos.length > 0 && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
                  gap: 2,
                }}
              >
                {damagePhotos.map((doc) => (
                  <Paper key={doc.id} elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ position: 'relative', aspectRatio: '4/3' }}>
                      {brokenImages[doc.filePath] ? (
                        <Box
                          sx={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: 2,
                            bgcolor: '#f8fafc',
                          }}
                        >
                          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                            Photo missing — re-upload
                          </Typography>
                        </Box>
                      ) : (
                        <Box
                          component="img"
                          src={resolveAssetUrl(doc.filePath)}
                          alt="Damage"
                          onError={() => markImageBroken(doc.filePath)}
                          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                      <Box sx={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => setPreviewUrl(resolveAssetUrl(doc.filePath))}
                          sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}
                          aria-label="View damage photo"
                        >
                          <ZoomInIcon fontSize="small" />
                        </IconButton>
                        {canManage && (
                          <IconButton
                            size="small"
                            color="error"
                            disabled={!!uploading}
                            onClick={() => deletePhoto(doc.id)}
                            sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}
                            aria-label="Remove damage photo"
                          >
                            <DeleteOutlinedIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ p: 1.5, bgcolor: '#fff' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Damage description
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500 }}>
                        {doc.comment || '—'}
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </Paper>
        </>
      )}

      <Dialog
        open={damageOpen}
        onClose={() => setDamageOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { overflow: 'hidden' } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pr: 6 }}>
          Add damage photo
          <IconButton
            onClick={() => setDamageOpen(false)}
            sx={{ position: 'absolute', right: 12, top: 12 }}
            aria-label="Close"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ overflow: 'hidden' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload a photo showing container damage and describe what you see. Evaluators will review this during approval.
          </Typography>
          <Box sx={{ mb: 2, minWidth: 0 }}>
            <Button
              component="label"
              variant="outlined"
              fullWidth
              startIcon={<AddPhotoAlternateIcon />}
              sx={{ py: 1.25, borderRadius: 2, fontWeight: 600 }}
            >
              {damageFile ? 'Change image' : 'Choose image'}
              <input
                type="file"
                hidden
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setDamageFile(e.target.files?.[0] ?? null)}
              />
            </Button>
            {damageFile && (
              <Tooltip title={damageFile.name} placement="top">
                <Typography
                  variant="body2"
                  sx={{
                    mt: 1,
                    px: 0.5,
                    color: primaryDark,
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {damageFile.name}
                </Typography>
              </Tooltip>
            )}
          </Box>
          <TextField
            fullWidth
            label="Damage description"
            required
            multiline
            minRows={3}
            value={damageComment}
            onChange={(e) => setDamageComment(e.target.value)}
            placeholder="e.g. Dent on right door panel, rust on flooring near front corner"
            sx={fieldSx}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDamageOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!damageFile || !damageComment.trim() || !!uploading}
            onClick={() => void handleDamageSubmit()}
            sx={{ fontWeight: 700 }}
          >
            Upload damage photo
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!previewUrl} onClose={() => setPreviewUrl(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Photo preview</DialogTitle>
        <DialogContent sx={{ p: 1 }}>
          {previewUrl && (
            <Box
              component="img"
              src={previewUrl}
              alt="Container photo preview"
              sx={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewUrl(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export { containerPhotoLabel }
