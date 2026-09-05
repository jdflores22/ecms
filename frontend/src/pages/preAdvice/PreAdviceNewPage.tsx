import { Alert, Box, Button, Paper, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { FormWizardSkeleton } from '../../components/layout/SkeletonPrimitives'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'
import axios from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom'
import CroEdoAttachPanel, { type CroEdoAttachSuccess } from '../../components/preAdvice/CroEdoAttachPanel'
import CroEdoLegacyUploadPanel from '../../components/preAdvice/CroEdoLegacyUploadPanel'
import PreAdviceForm, {
  type PreAdviceFormSubmitValues,
  type PreAdviceFormValues,
} from '../../components/preAdvice/PreAdviceForm'
import { isPreAdviceManager } from '../../config/roleConfig'
import { preAdviceApi, type PreAdviceLookups } from '../../services/api'
import type { CroEdoVerificationLine } from '../../services/publicApi'
import { useAppSelector } from '../../store/hooks'
import { formatContainerSizeLabel } from '../../utils/containerSize'
import { isCroFreeTimeExpired } from '../../utils/croFreeTime'

const primaryDark = '#0B3D91'

type PreForecastEntryMode = 'ics' | 'legacy'

function apiErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

const emptyForm: PreAdviceFormValues = {
  shippingLineId: '',
  containerNo: '',
  containerSizeId: '',
  containerTypeId: '',
  remarks: '',
}

const icsWorkflowSteps = [
  'Attach the issued CRO/eDO so the system can read the QR and fill container details.',
  'Confirm the auto-filled shipping line, container, size, and type.',
  'Save as draft — then add identity photos and submit from the detail page.',
]

const legacyWorkflowSteps = [
  'Upload a copy of your legacy CRO/eDO and enter container details manually.',
  'Save as draft, then add identity photos on the detail page.',
  'Submit when complete. The evaluator will review your uploaded CRO/eDO.',
]

function norm(value: string) {
  return value.trim().toUpperCase().replace(/'/g, '')
}

function mapCroLineToForm(
  lookups: PreAdviceLookups,
  shippingLineId: number | null | undefined,
  shippingLineName: string | null | undefined,
  line: CroEdoVerificationLine,
): { values: PreAdviceFormValues; error?: string } {
  const byId =
    shippingLineId != null
      ? lookups.shippingLines.find((s) => s.id === shippingLineId)
      : undefined
  const byName = shippingLineName
    ? lookups.shippingLines.find(
        (s) =>
          norm(s.name) === norm(shippingLineName) ||
          norm(s.code) === norm(shippingLineName) ||
          norm(shippingLineName).includes(norm(s.name)),
      )
    : undefined
  const shippingLine = byId ?? byName
  if (!shippingLine) {
    return {
      values: emptyForm,
      error: `Shipping line from CRO/eDO could not be matched (${shippingLineName || 'unknown'}).`,
    }
  }

  const size = lookups.containerSizes.find((s) => {
    const label = norm(formatContainerSizeLabel(s.label))
    const cro = norm(line.size)
    return label === cro || label.startsWith(cro) || cro.startsWith(label)
  })
  if (!size) {
    return {
      values: emptyForm,
      error: `Container size from CRO/eDO could not be matched (${line.size}).`,
    }
  }

  const type = lookups.containerTypes.find(
    (t) => norm(t.code) === norm(line.type) || norm(t.label) === norm(line.type),
  )
  if (!type) {
    return {
      values: emptyForm,
      error: `Container type from CRO/eDO could not be matched (${line.type}).`,
    }
  }

  return {
    values: {
      shippingLineId: shippingLine.id,
      containerNo: line.containerNumber.trim().toUpperCase(),
      containerSizeId: size.id,
      containerTypeId: type.id,
      remarks: '',
    },
  }
}

export default function PreAdviceNewPage() {
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const [lookups, setLookups] = useState<PreAdviceLookups | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [entryMode, setEntryMode] = useState<PreForecastEntryMode>('ics')
  const [formInitial, setFormInitial] = useState<PreAdviceFormValues>(emptyForm)
  const [croLink, setCroLink] = useState<CroEdoAttachSuccess | null>(null)
  const [legacyFile, setLegacyFile] = useState<File | null>(null)

  useEffect(() => {
    preAdviceApi
      .lookups()
      .then(({ data }) => setLookups(data))
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 403) {
          setError('Access denied. Log out and sign in again to refresh your session.')
          return
        }
        setError('Failed to load form options.')
      })
      .finally(() => setLoading(false))
  }, [])

  const formComplete = useMemo(
    () =>
      formInitial.shippingLineId !== '' &&
      formInitial.containerSizeId !== '' &&
      formInitial.containerTypeId !== '' &&
      !!formInitial.containerNo.trim(),
    [formInitial],
  )

  const croLinked = useMemo(
    () => entryMode === 'ics' && !!croLink && formComplete,
    [entryMode, croLink, formComplete],
  )

  const freeTimeExpired = useMemo(
    () => (croLink ? isCroFreeTimeExpired(croLink.line.demurrageValidUntil) : false),
    [croLink],
  )

  const workflowSteps = entryMode === 'ics' ? icsWorkflowSteps : legacyWorkflowSteps

  const heroSubtitle =
    entryMode === 'ics'
      ? 'Attach your ICS CRO/eDO first. Free demurrage time and container details come from the verified document.'
      : 'For older CRO/eDO documents issued outside ICS. Enter container details manually and upload a copy of the paper document.'

  if (!isPreAdviceManager(user?.role)) {
    return <Navigate to="/" replace />
  }

  const resetFormFields = () => {
    setFormInitial((prev) => ({ ...emptyForm, remarks: prev.remarks }))
  }

  const switchEntryMode = (mode: PreForecastEntryMode) => {
    if (entryMode === mode) return
    setEntryMode(mode)
    setError('')
    setCroLink(null)
    setLegacyFile(null)
    resetFormFields()
  }

  const onCroLinked = (payload: CroEdoAttachSuccess) => {
    if (!lookups) return
    const mapped = mapCroLineToForm(
      lookups,
      payload.result.shippingLineId,
      payload.result.shippingLineName,
      payload.line,
    )
    if (mapped.error) {
      setError(mapped.error)
      setCroLink(null)
      setFormInitial(emptyForm)
      return
    }
    setError('')
    setCroLink(payload)
    setFormInitial({ ...mapped.values, remarks: formInitial.remarks })
  }

  const onCroCleared = () => {
    setCroLink(null)
    resetFormFields()
  }

  const handleCreate = async (values: PreAdviceFormSubmitValues) => {
    if (entryMode === 'ics' && !croLink) {
      setError('Attach and verify a CRO/eDO before creating the pre-forecast.')
      return
    }
    if (entryMode === 'legacy' && !legacyFile) {
      setError('Upload a copy of your CRO/eDO document before creating the pre-forecast.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const { data } = await preAdviceApi.create({
        ...values,
        ...(entryMode === 'ics' && croLink
          ? {
              croVerificationToken: croLink.token,
              croLineNo: croLink.line.lineNo,
            }
          : {}),
      })

      const attachment = entryMode === 'ics' ? croLink?.file : legacyFile
      if (attachment) {
        try {
          await preAdviceApi.uploadDocument(data.id, attachment, 'CroEdo')
        } catch {
          // Draft is created; attachment can be re-uploaded later if needed.
        }
      }
      navigate(`/preforecast/${data.id}`)
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to create pre-forecast.'))
      setSubmitting(false)
    }
  }

  return (
    <Box>
      <Button
        component={RouterLink}
        to="/preforecast"
        startIcon={<ArrowBackIcon />}
        sx={{
          mb: 2,
          color: 'text.secondary',
          fontWeight: 600,
          '&:hover': { color: primaryDark, bgcolor: 'rgba(11, 61, 145, 0.06)' },
        }}
      >
        Back to list
      </Button>

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
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            alignItems: 'flex-start',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.14)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <DescriptionOutlinedIcon />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              New pre-forecast
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5, maxWidth: 560 }}>
              {heroSubtitle}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 320px' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: '#fff',
            boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
            <AddIcon sx={{ color: primaryDark, fontSize: 22 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Request details
            </Typography>
          </Box>

          {loading ? (
            <FormWizardSkeleton />
          ) : lookups ? (
            <>
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
                  How are you filing this pre-forecast?
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  value={entryMode}
                  onChange={(_, value: PreForecastEntryMode | null) => {
                    if (value) switchEntryMode(value)
                  }}
                  disabled={submitting}
                  sx={{
                    '& .MuiToggleButton-root': {
                      py: 1.25,
                      fontWeight: 700,
                      borderRadius: 2,
                      textTransform: 'none',
                    },
                  }}
                >
                  <ToggleButton value="ics">
                    <QrCodeScannerIcon sx={{ mr: 1, fontSize: 18 }} />
                    ICS CRO/eDO (QR)
                  </ToggleButton>
                  <ToggleButton value="legacy">
                    <DescriptionOutlinedIcon sx={{ mr: 1, fontSize: 18 }} />
                    Legacy manual entry
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {entryMode === 'ics' ? (
                <CroEdoAttachPanel
                  disabled={submitting}
                  onLinked={onCroLinked}
                  onCleared={onCroCleared}
                />
              ) : (
                <>
                  <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                    For older CRO/eDO documents issued outside ICS. Enter container details manually and
                    upload a photo or PDF of the paper document.
                  </Alert>
                  <CroEdoLegacyUploadPanel
                    fileName={legacyFile?.name ?? ''}
                    onFileChange={setLegacyFile}
                    disabled={submitting}
                  />
                </>
              )}

              <PreAdviceForm
                lookups={lookups}
                initial={formInitial}
                onSubmit={handleCreate}
                onCancel={() => navigate('/preforecast')}
                submitLabel="Create draft"
                submitting={submitting}
                lockCatalogFields={entryMode === 'ics' && croLinked}
                requireCroLink={entryMode === 'ics'}
                requireLegacyDocument={entryMode === 'legacy'}
                legacyDocumentReady={!!legacyFile}
                croLinked={croLinked}
                freeTimeExpired={freeTimeExpired}
                freeTimeUntil={croLink?.line.demurrageValidUntil}
              />
            </>
          ) : (
            <Alert severity="error">Unable to load shipping lines, sizes, and types.</Alert>
          )}
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: '#fff',
            boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
            What happens next
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {workflowSteps.map((step, i) => (
              <Box key={step} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Box
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#fff',
                    bgcolor: i === 0 ? '#00A3E0' : primaryDark,
                  }}
                >
                  {i + 1}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, pt: 0.25 }}>
                  {step}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}
