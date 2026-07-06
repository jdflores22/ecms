import { Alert, Box, Button, CircularProgress, Paper, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { certificateTemplateApi } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { documentTypeLabel } from '../../utils/certificateLayoutTypes'
import {
  readStashedCertificatePreview,
  stashCertificatePreview,
} from '../../utils/certificatePreviewStorage'

const primaryDark = '#0B3D91'

type PreviewLocationState = {
  layoutJson?: string
  title?: string
  documentType?: string
}

export default function CertificateTemplatePreviewPage() {
  const user = useAppSelector((s) => s.auth.user)
  const location = useLocation()
  const navigate = useNavigate()
  const locationState = (location.state ?? {}) as PreviewLocationState

  const [title, setTitle] = useState(locationState.title ?? 'Certificate preview')
  const [documentType, setDocumentType] = useState(locationState.documentType ?? 'Atw')
  const [pdfUrl, setPdfUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const resolveLayoutJson = useCallback(() => {
    if (locationState.layoutJson) return locationState.layoutJson
    return readStashedCertificatePreview()?.layoutJson ?? null
  }, [locationState.layoutJson])

  useEffect(() => {
    const layoutJson = resolveLayoutJson()
    const resolvedTitle =
      locationState.title ?? readStashedCertificatePreview()?.title ?? 'Certificate preview'
    const resolvedDocType =
      locationState.documentType ?? readStashedCertificatePreview()?.documentType ?? 'Atw'
    setTitle(resolvedTitle)
    setDocumentType(resolvedDocType)

    if (!layoutJson) {
      setLoading(false)
      setError('No layout to preview. Return to the template editor and try again.')
      return undefined
    }

    stashCertificatePreview(layoutJson, resolvedTitle, resolvedDocType)

    let cancelled = false
    let objectUrl = ''

    setLoading(true)
    setError('')
    setPdfUrl('')

    certificateTemplateApi
      .previewLayout(layoutJson, resolvedDocType)
      .then(({ data }) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(data)
        setPdfUrl(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setError('Failed to generate preview PDF.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [locationState.title, locationState.documentType, resolveLayoutJson])

  const handleDownload = () => {
    if (!pdfUrl) return
    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = `${title.replace(/\s+/g, '-').toLowerCase() || 'atw'}-preview.pdf`
    link.click()
  }

  const handleBack = () => {
    navigate('/admin/certificate-templates')
  }

  if (user?.role !== 'Administrator') {
    return <Navigate to="/" replace />
  }

  if (!resolveLayoutJson() && !loading && error) {
    return (
      <Box sx={{ maxWidth: 560, mx: 'auto', py: 4 }}>
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
        <Button component={RouterLink} to="/admin/certificate-templates" startIcon={<ArrowBackIcon />}>
          Back to templates
        </Button>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: { xs: 'calc(100vh - 96px)', md: 'calc(100vh - 88px)' },
        minHeight: 480,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          px: { xs: 2, sm: 2.5 },
          py: 1.5,
          mb: 2,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          alignItems: 'center',
        }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ fontWeight: 600, color: 'text.secondary' }}
        >
          Back to editor
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          <PictureAsPdfOutlinedIcon sx={{ color: primaryDark }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Sample {documentTypeLabel(documentType as import('../../utils/certificateLayoutTypes').CertificateDocumentType)} preview
            </Typography>
          </Box>
        </Box>
        <Button
          variant="outlined"
          startIcon={<DownloadOutlinedIcon />}
          onClick={handleDownload}
          disabled={!pdfUrl || loading}
          sx={{ fontWeight: 600, borderRadius: 2 }}
        >
          Download PDF
        </Button>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          flex: 1,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          bgcolor: '#E8ECF1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {loading ? (
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={36} sx={{ mb: 1.5 }} />
            <Typography variant="body2" color="text.secondary">
              Generating preview…
            </Typography>
          </Box>
        ) : pdfUrl ? (
          <Box
            component="iframe"
            src={pdfUrl}
            title={`${title} PDF preview`}
            sx={{
              width: '100%',
              height: '100%',
              border: 0,
              bgcolor: '#fff',
            }}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            Preview unavailable.
          </Typography>
        )}
      </Paper>
    </Box>
  )
}
