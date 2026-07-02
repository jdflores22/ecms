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
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import axios from 'axios'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useToast } from '../feedback/ToastProvider'
import { useAssetUrls } from '../../hooks/useAssetUrl'
import {
  CONTAINER_PHOTO_CATEGORIES,
  CONTAINER_PHOTO_GRID_CATEGORIES,
  DAMAGE_PHOTO_CATEGORY,
  formatDamageComment,
  isDamageForView,
  isRequiredContainerPhotoCategory,
  parseDamageDescription,
  parseDamageView,
  type ContainerPhotoCategoryValue,
  type ContainerPhotoGridCategory,
} from '../../config/containerPhotoCategories'
import { preAdviceApi, type PreAdviceDocument } from '../../services/api'

const primaryDark = '#0B3D91'
const damageRed = '#C62828'

const damageBadgeSx = {
  height: 22,
  fontWeight: 800,
  bgcolor: damageRed,
  color: '#fff',
  '& .MuiChip-label': { px: 1 },
} as const

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

function ResolvedDocumentImage({
  url,
  alt,
  onError,
  sx,
}: {
  url: string
  alt: string
  onError?: () => void
  sx?: object
}) {
  if (!url) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: '#f8fafc',
          ...sx,
        }}
      >
        <CircularProgress size={24} sx={{ color: primaryDark }} />
      </Box>
    )
  }

  return (
    <Box
      component="img"
      src={url}
      alt={alt}
      onError={onError}
      sx={sx}
    />
  )
}

function mergeUploadedDocument(
  documents: PreAdviceDocument[],
  uploaded: PreAdviceDocument,
  category: string,
): PreAdviceDocument[] {
  if (category === DAMAGE_PHOTO_CATEGORY.value) {
    const view = uploaded.comment?.match(/^\[([A-Za-z]+)\]/)?.[1]
    if (view) {
      return [
        ...documents.filter((d) => !isDamageForView(d, view)),
        uploaded,
      ]
    }
    return [...documents, uploaded]
  }
  return [...documents.filter((d) => d.category !== category), uploaded]
}

function removeDocument(documents: PreAdviceDocument[], documentId: number) {
  return documents.filter((d) => d.id !== documentId)
}

type Props = {
  preAdviceId: number
  documents: PreAdviceDocument[]
  loading?: boolean
  canManage?: boolean
  /** Full reload fallback for read-only parents */
  onChange?: () => void
  /** Incremental update — avoids page-level loading spinner */
  onDocumentsChange?: (documents: PreAdviceDocument[]) => void
  error?: string
  onError?: (message: string) => void
}

type DamageDialogState = {
  view: ContainerPhotoGridCategory['value']
  label: string
}

export default function ContainerIdentityPhotos({
  preAdviceId,
  documents,
  loading = false,
  canManage = false,
  onChange,
  onDocumentsChange,
  error,
  onError,
}: Props) {
  const { showToast } = useToast()
  const [uploading, setUploading] = useState<string | null>(null)
  const [damageDialog, setDamageDialog] = useState<DamageDialogState | null>(null)
  const [damageComment, setDamageComment] = useState('')
  const [damageFile, setDamageFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ url: string; title: string; description?: string } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ documentId: number; label: string } | null>(null)
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({})
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({})
  const damageFileInputRef = useRef<HTMLInputElement | null>(null)

  const markImageBroken = useCallback((filePath: string) => {
    setBrokenImages((prev) => (prev[filePath] ? prev : { ...prev, [filePath]: true }))
  }, [])

  const identityByCategory = useMemo(() => {
    const map = new Map<string, PreAdviceDocument>()
    for (const doc of documents) {
      if (doc.category && doc.category !== DAMAGE_PHOTO_CATEGORY.value && !map.has(doc.category)) {
        map.set(doc.category, doc)
      }
    }
    return map
  }, [documents])

  const damageByView = useMemo(() => {
    const map = new Map<string, PreAdviceDocument>()
    for (const doc of documents) {
      if (doc.category !== DAMAGE_PHOTO_CATEGORY.value) continue
      const view = doc.comment?.match(/^\[([A-Za-z]+)\]/)?.[1]
      if (view && !map.has(view)) {
        map.set(view, doc)
      }
    }
    return map
  }, [documents])

  const legacyDamagePhotos = useMemo(
    () =>
      documents.filter(
        (d) =>
          d.category === DAMAGE_PHOTO_CATEGORY.value &&
          !d.comment?.match(/^\[([A-Za-z]+)\]/),
      ),
    [documents],
  )

  const damageCategories = useMemo(
    () => CONTAINER_PHOTO_GRID_CATEGORIES.filter((c) => damageByView.has(c.value)),
    [damageByView],
  )
  const hasDamageSection = damageCategories.length > 0 || legacyDamagePhotos.length > 0

  const assetUrls = useAssetUrls(documents.map((d) => d.filePath))
  const assetUrl = (path: string | null | undefined) => (path ? assetUrls[path] ?? '' : '')

  const standardUploaded = CONTAINER_PHOTO_CATEGORIES.filter((c) => identityByCategory.has(c.value)).length
  const progress = Math.round((standardUploaded / CONTAINER_PHOTO_CATEGORIES.length) * 100)

  const applyDocuments = useCallback(
    (next: PreAdviceDocument[]) => {
      if (onDocumentsChange) {
        onDocumentsChange(next)
      } else {
        onChange?.()
      }
    },
    [onChange, onDocumentsChange],
  )

  const uploadPhoto = useCallback(
    async (
      category: ContainerPhotoCategoryValue | typeof DAMAGE_PHOTO_CATEGORY.value,
      file: File,
      comment?: string,
      successMessage?: string,
    ) => {
      const uploadKey =
        category === DAMAGE_PHOTO_CATEGORY.value
          ? `damage-${parseDamageView(comment) ?? 'other'}`
          : category
      setUploading(uploadKey)
      onError?.('')
      try {
        const { data: uploaded } = await preAdviceApi.uploadDocument(preAdviceId, file, category, comment)
        const next = mergeUploadedDocument(documents, uploaded, category)
        applyDocuments(next)
        showToast(successMessage ?? 'Photo uploaded successfully')
        return uploaded
      } catch (err) {
        const message = apiErrorMessage(err, 'Failed to upload photo.')
        onError?.(message)
        showToast(message, 'error')
        return null
      } finally {
        setUploading(null)
      }
    },
    [preAdviceId, documents, applyDocuments, onError, showToast],
  )

  const requestDeletePhoto = useCallback((documentId: number, label: string) => {
    setDeleteConfirm({ documentId, label })
  }, [])

  const deletePhoto = useCallback(
    async (documentId: number, label: string) => {
      setUploading(`delete-${documentId}`)
      onError?.('')
      try {
        await preAdviceApi.deleteDocument(preAdviceId, documentId)
        applyDocuments(removeDocument(documents, documentId))
        showToast(`${label} removed`)
      } catch (err) {
        const message = apiErrorMessage(err, 'Failed to remove photo.')
        onError?.(message)
        showToast(message, 'error')
      } finally {
        setUploading(null)
      }
    },
    [preAdviceId, documents, applyDocuments, onError, showToast],
  )

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirm) return
    const { documentId, label } = deleteConfirm
    setDeleteConfirm(null)
    await deletePhoto(documentId, label)
  }, [deleteConfirm, deletePhoto])

  const openDamageDialog = (category: ContainerPhotoGridCategory) => {
    const existing = damageByView.get(category.value)
    setDamageComment(existing ? parseDamageDescription(existing.comment) : '')
    setDamageFile(null)
    setDamageDialog({ view: category.value, label: category.label })
  }

  const closeDamageDialog = () => {
    setDamageDialog(null)
    setDamageComment('')
    setDamageFile(null)
  }

  const handleDamageSubmit = async () => {
    if (!damageDialog || !damageFile || !damageComment.trim()) return
    const comment = formatDamageComment(damageDialog.view, damageComment.trim())
    const uploaded = await uploadPhoto(
      DAMAGE_PHOTO_CATEGORY.value,
      damageFile,
      comment,
      `${damageDialog.label} damage photo uploaded`,
    )
    if (uploaded) closeDamageDialog()
  }

  const renderIdentitySlot = (category: ContainerPhotoGridCategory) => {
    const identityDoc = identityByCategory.get(category.value)
    const hasDamage = damageByView.has(category.value)
    const busy = uploading === category.value
    const isOptional = !isRequiredContainerPhotoCategory(category.value)

    return (
      <Paper
        key={category.value}
        elevation={0}
        sx={{
          borderRadius: 2.5,
          border: '1px',
          borderStyle: isOptional && !identityDoc ? 'dashed' : 'solid',
          borderColor: hasDamage
            ? hexToRgba(damageRed, 0.45)
            : identityDoc
              ? hexToRgba(primaryDark, 0.25)
              : isOptional
                ? 'divider'
                : 'divider',
          bgcolor: identityDoc ? hexToRgba(primaryDark, 0.02) : '#fff',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            px: 1.5,
            py: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: hexToRgba(primaryDark, 0.03),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, color: primaryDark }}>
            {category.label}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {isOptional && !identityDoc && (
              <Chip
                label="Optional"
                size="small"
                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: 'action.hover' }}
              />
            )}
            {hasDamage && <Chip label="Damage" size="small" sx={damageBadgeSx} />}
          </Box>
        </Box>

        <Box sx={{ position: 'relative', aspectRatio: '4/3', bgcolor: '#f8fafc' }}>
          {identityDoc ? (
            <>
              {brokenImages[identityDoc.filePath] ? (
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
                <ResolvedDocumentImage
                  url={assetUrl(identityDoc.filePath)}
                  alt={category.label}
                  onError={() => markImageBroken(identityDoc.filePath)}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              )}
              {!brokenImages[identityDoc.filePath] && (
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
                        onClick={() => {
                          const url = assetUrl(identityDoc.filePath)
                          if (url) setPreview({ url, title: category.label })
                        }}
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
                          onClick={() => requestDeletePhoto(identityDoc.id, `${category.label} photo`)}
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
                  <PhotoCameraOutlinedIcon sx={{ color: 'text.disabled', fontSize: 32 }} />
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

        {canManage && !hasDamage && !isOptional && (
          <Box
            sx={{
              px: 1.5,
              py: 1,
              borderTop: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <Button
              size="small"
              color="warning"
              variant="outlined"
              startIcon={<ReportProblemOutlinedIcon />}
              disabled={!!uploading}
              onClick={() => openDamageDialog(category)}
              sx={{ fontWeight: 600, borderRadius: 2, textTransform: 'none' }}
            >
              Damage
            </Button>
          </Box>
        )}

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
              if (file) void uploadPhoto(category.value, file, undefined, `${category.label} photo uploaded`)
              e.target.value = ''
            }}
          />
        )}
      </Paper>
    )
  }

  const renderDamageSlot = (category: ContainerPhotoGridCategory) => {
    const damageDoc = damageByView.get(category.value)
    if (!damageDoc) return null
    const damageBusy = uploading === `damage-${category.value}` || uploading === `delete-${damageDoc.id}`

    return (
      <Paper
        key={`damage-${category.value}`}
        elevation={0}
        sx={{
          borderRadius: 2.5,
          border: '1px solid',
          borderColor: hexToRgba(damageRed, 0.55),
          bgcolor: hexToRgba(damageRed, 0.03),
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            px: 1.5,
            py: 1,
            borderBottom: '1px solid',
            borderColor: hexToRgba(damageRed, 0.2),
            bgcolor: hexToRgba(damageRed, 0.06),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, color: damageRed }}>
            {category.label}
          </Typography>
          <Chip label="Damage" size="small" sx={damageBadgeSx} />
        </Box>

        <Box sx={{ position: 'relative', aspectRatio: '4/3', bgcolor: '#1a1a1a' }}>
          {brokenImages[damageDoc.filePath] ? (
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
                  bgcolor: hexToRgba(damageRed, 0.08),
                }}
              >
                <ReportProblemOutlinedIcon sx={{ color: damageRed }} />
                <Typography variant="caption" color="text.secondary">
                  Damage photo missing — re-upload below.
                </Typography>
              </Box>
            ) : (
              <>
                <ResolvedDocumentImage
                  url={assetUrl(damageDoc.filePath)}
                  alt={`${category.label} damage`}
                  onError={() => markImageBroken(damageDoc.filePath)}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    bgcolor: hexToRgba(damageRed, 0.42),
                    pointerEvents: 'none',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1,
                    py: 0.35,
                    borderRadius: 1,
                    bgcolor: damageRed,
                    color: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                  }}
                >
                  <ReportProblemOutlinedIcon sx={{ fontSize: 14 }} />
                  <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 0.6, lineHeight: 1 }}>
                    DAMAGE
                  </Typography>
                </Box>
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: 0.5,
                    p: 0.75,
                    background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.55))',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#fff',
                      fontWeight: 500,
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                    }}
                  >
                    {parseDamageDescription(damageDoc.comment) || 'Damage photo'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                    <Tooltip title="View damage photo">
                      <IconButton
                        size="small"
                        onClick={() => {
                          const url = assetUrl(damageDoc.filePath)
                          if (!url) return
                          setPreview({
                            url,
                            title: `${category.label} — damage`,
                            description: parseDamageDescription(damageDoc.comment),
                          })
                        }}
                        sx={{ bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: '#fff' } }}
                        aria-label={`View ${category.label} damage`}
                      >
                        <ZoomInIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {canManage && (
                      <Tooltip title="Remove damage photo">
                        <IconButton
                          size="small"
                          color="error"
                          disabled={!!uploading || damageBusy}
                          onClick={() => requestDeletePhoto(damageDoc.id, `${category.label} damage photo`)}
                          sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}
                          aria-label={`Remove ${category.label} damage`}
                        >
                          <DeleteOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              </>
            )}
        </Box>

        {canManage && (
          <Box
            sx={{
              px: 1.5,
              py: 1,
              borderTop: '1px solid',
              borderColor: hexToRgba(damageRed, 0.15),
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <Button
              size="small"
              color="error"
              variant="outlined"
              startIcon={<ReportProblemOutlinedIcon />}
              disabled={!!uploading || damageBusy}
              onClick={() => openDamageDialog(category)}
              sx={{ fontWeight: 600, borderRadius: 2, textTransform: 'none' }}
            >
              Update damage
            </Button>
          </Box>
        )}
      </Paper>
    )
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 2,
          mb: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Container identity photos
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Upload each container view for evaluator review — Others is optional (JPG, PNG, WEBP — max 10 MB)
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
          '& .MuiLinearProgress-bar': {
            bgcolor: progress === 100 ? '#2E7D32' : primaryDark,
            borderRadius: 3,
          },
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
            }}
          >
            {CONTAINER_PHOTO_GRID_CATEGORIES.map(renderIdentitySlot)}
          </Box>

          {hasDamageSection && (
            <Box sx={{ mt: 4 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 2,
                  mb: 2,
                  flexWrap: 'wrap',
                }}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: damageRed }}>
                    Damage photos
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Damage photos attached to container views (JPG, PNG, WEBP — max 10 MB)
                    {!canManage && ' · read-only'}
                  </Typography>
                </Box>
                <Chip
                  label={`${damageCategories.length} attached`}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    bgcolor: hexToRgba(damageRed, 0.1),
                    color: damageRed,
                  }}
                />
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
                  gap: 2,
                }}
              >
                {damageCategories.map(renderDamageSlot)}
              </Box>

              {legacyDamagePhotos.length > 0 && (
                <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                  {legacyDamagePhotos.length} older damage photo(s) are not linked to a specific view.
                  Re-upload them using the Damage button on the matching identity card.
                </Alert>
              )}
            </Box>
          )}
        </>
      )}

      <Dialog
        open={!!damageDialog}
        onClose={closeDamageDialog}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { overflow: 'hidden' } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pr: 6 }}>
          {damageDialog ? `${damageDialog.label} — damage photo` : 'Damage photo'}
          <IconButton
            onClick={closeDamageDialog}
            sx={{ position: 'absolute', right: 12, top: 12 }}
            aria-label="Close"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ overflow: 'hidden' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload a photo showing damage on the {damageDialog?.label.toLowerCase()} view and describe
            what you see.
          </Typography>
          <Box sx={{ mb: 2, minWidth: 0 }}>
            <Button
              component="label"
              variant="outlined"
              fullWidth
              startIcon={<PhotoCameraOutlinedIcon />}
              sx={{ py: 1.25, borderRadius: 2, fontWeight: 600 }}
            >
              {damageFile ? 'Change image' : 'Choose image'}
              <input
                ref={damageFileInputRef}
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
            placeholder="e.g. Dent on corner, rust spots near the edge"
            sx={fieldSx}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDamageDialog}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            disabled={!damageFile || !damageComment.trim() || !!uploading}
            onClick={() => void handleDamageSubmit()}
            sx={{ fontWeight: 700 }}
          >
            Upload damage photo
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, pr: 6 }}>
          Remove photo
          <IconButton
            onClick={() => setDeleteConfirm(null)}
            sx={{ position: 'absolute', right: 12, top: 12 }}
            aria-label="Close"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {deleteConfirm
              ? `Remove this ${deleteConfirm.label.toLowerCase()}? This cannot be undone.`
              : ''}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirm(null)} disabled={!!uploading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!!uploading}
            onClick={() => void handleConfirmDelete()}
            startIcon={<DeleteOutlinedIcon />}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Remove photo
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!preview} onClose={() => setPreview(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{preview?.title ?? 'Photo preview'}</DialogTitle>
        <DialogContent sx={{ p: 1 }}>
          {preview?.description && (
            <Typography variant="body2" color="text.secondary" sx={{ px: 1, pb: 1 }}>
              {preview.description}
            </Typography>
          )}
          {preview?.url ? (
            <Box
              component="img"
              src={preview.url}
              alt={preview.title}
              sx={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 2 }}
            />
          ) : preview ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={28} sx={{ color: primaryDark }} />
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreview(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export { containerPhotoLabel } from '../../config/containerPhotoCategories'
