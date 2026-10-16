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
import { PageHero } from '../../components/layout/ListPagePrimitives'
import {appColors, ICS_PRIMARY } from '../../theme/colors'
import { isPreAdviceManager } from '../../config/roleConfig'
import { preAdviceApi, type PreAdviceLookups } from '../../services/api'
import { fetchPreAdviceLookups } from '../../utils/preAdviceLookupsCache'
import type { CroEdoVerificationLine } from '../../services/publicApi'
import { usePortalSettings } from '../../context/PortalSettingsContext'
import { useAppSelector } from '../../store/hooks'
import { formatContainerSizeLabel } from '../../utils/containerSize'
import { isCroFreeTimeExpired } from '../../utils/croFreeTime'


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
  isBackToBack: false,
  backToBackCompanionContainerNo: '',
  backToBackCompanionContainerSizeId: '',
  backToBackCompanionContainerTypeId: '',
}

const icsWorkflowSteps = [
  'In the primary section, attach the ICS CRO/eDO (QR) — details auto-fill for the first container.',
  'If back-to-back, enter the companion container and attach its CRO/eDO in the second section.',
  'Save as draft, add identity photos on the detail page, then submit.',
]

const manualWorkflowSteps = [
  'Enter container details and attach CRO/eDO in each container section (two sections when back-to-back).',
  'Save as draft, then add identity photos on the detail page.',
  'Submit when complete. The evaluator will review your CRO/eDO copies.',
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
      isBackToBack: false,
      backToBackCompanionContainerNo: '',
      backToBackCompanionContainerSizeId: '',
      backToBackCompanionContainerTypeId: '',
    },
  }
}

export default function PreAdviceNewPage() {
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const { settings: portal } = usePortalSettings()
  const icsCroEdoQrEnabled = portal.icsCroEdoQrEnabled
  const [lookups, setLookups] = useState<PreAdviceLookups | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [entryMode, setEntryMode] = useState<PreForecastEntryMode>('ics')
  const [formInitial, setFormInitial] = useState<PreAdviceFormValues>(emptyForm)
  const [croLink, setCroLink] = useState<CroEdoAttachSuccess | null>(null)
  const [legacyPrimaryFile, setLegacyPrimaryFile] = useState<File | null>(null)
  const [legacyCompanionFile, setLegacyCompanionFile] = useState<File | null>(null)

  const effectiveEntryMode: PreForecastEntryMode =
    icsCroEdoQrEnabled ? entryMode : 'legacy'

  useEffect(() => {
    fetchPreAdviceLookups()
      .then((data) => setLookups(data))
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 403) {
          setError('Access denied. Log out and sign in again to refresh your session.')
          return
        }
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          setError('Session expired. Log in again to load shipping lines and container options.')
          return
        }
        const msg = axios.isAxiosError(err) ? err.response?.data?.message : null
        setError(typeof msg === 'string' ? msg : 'Failed to load form options.')
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
    () => effectiveEntryMode === 'ics' && !!croLink && formComplete,
    [effectiveEntryMode, croLink, formComplete],
  )

  const freeTimeExpired = useMemo(
    () => (croLink ? isCroFreeTimeExpired(croLink.line.demurrageValidUntil) : false),
    [croLink],
  )

  const workflowSteps =
    effectiveEntryMode === 'ics' ? icsWorkflowSteps : manualWorkflowSteps

  const heroSubtitle = effectiveEntryMode === 'ics'
    ? 'Attach CRO/eDO per container in the form below. ICS QR fills the primary unit; back-to-back needs a separate CRO/eDO for the companion.'
    : 'Enter each container and attach its CRO/eDO in the matching section so uploads are not swapped.'

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
    setLegacyPrimaryFile(null)
    setLegacyCompanionFile(null)
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
    if (effectiveEntryMode === 'ics' && !croLink) {
      setError('Attach and verify a CRO/eDO before creating the pre-forecast.')
      return
    }
    if (effectiveEntryMode === 'legacy' && !legacyPrimaryFile) {
      setError('Upload CRO/eDO for the primary container before creating the pre-forecast.')
      return
    }
    if (
      values.isBackToBack &&
      ((effectiveEntryMode === 'legacy' && !legacyCompanionFile) ||
        (effectiveEntryMode === 'ics' && !legacyCompanionFile))
    ) {
      setError('Upload CRO/eDO for the companion container in the second section.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const { data } = await preAdviceApi.create({
        ...values,
        ...(effectiveEntryMode === 'ics' && croLink
          ? {
              croVerificationToken: croLink.token,
              croLineNo: croLink.line.lineNo,
            }
          : {}),
      })

      const primaryAttachment =
        effectiveEntryMode === 'ics' ? croLink?.file : legacyPrimaryFile
      if (primaryAttachment) {
        try {
          await preAdviceApi.uploadDocument(data.id, primaryAttachment, 'CroEdo', undefined, undefined, 'Primary')
        } catch {
          // Draft is created; attachment can be re-uploaded later if needed.
        }
      }
      if (values.isBackToBack && legacyCompanionFile) {
        try {
          await preAdviceApi.uploadDocument(
            data.id,
            legacyCompanionFile,
            'CroEdo',
            undefined,
            undefined,
            'Companion',
          )
        } catch {
          // Companion CRO can be re-uploaded on the detail page.
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
          '&:hover': { color: appColors.primary, bgcolor: 'rgba(11, 61, 145, 0.06)' },
        }}
      >
        Back to list
      </Button>

      <PageHero icon={<DescriptionOutlinedIcon />} title="New pre-forecast" subtitle={heroSubtitle} />

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
            borderRadius: '1rem',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: '#fff',
            boxShadow: appColors.surfaceShadow,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
            <AddIcon sx={{ color: ICS_PRIMARY, fontSize: 22 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Request details
            </Typography>
          </Box>

          {loading ? (
            <FormWizardSkeleton />
          ) : lookups ? (
            <>
              {lookups.shippingLines.length === 0 && (
                <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                  No active shipping lines are configured yet. An administrator must add shipping lines under
                  Settings before you can create a pre-forecast.
                </Alert>
              )}
              {icsCroEdoQrEnabled && (
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
                      Manual entry
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              )}

              {effectiveEntryMode === 'legacy' && icsCroEdoQrEnabled && (
                <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                  Attach one CRO/eDO per container in the matching section below. Do not swap primary and companion
                  uploads.
                </Alert>
              )}

              <PreAdviceForm
                lookups={lookups}
                initial={formInitial}
                onSubmit={handleCreate}
                onCancel={() => navigate('/preforecast')}
                submitLabel="Create draft"
                submitting={submitting}
                lockCatalogFields={effectiveEntryMode === 'ics' && croLinked}
                requireCroLink={effectiveEntryMode === 'ics'}
                requireLegacyDocument={effectiveEntryMode === 'legacy'}
                legacyDocumentReady={!!legacyPrimaryFile}
                companionLegacyDocumentReady={!!legacyCompanionFile}
                croLinked={croLinked}
                freeTimeExpired={freeTimeExpired}
                freeTimeUntil={croLink?.line.demurrageValidUntil}
                primaryCroSlot={
                  effectiveEntryMode === 'ics' ? (
                    <CroEdoAttachPanel
                      embedded
                      unitLabel="Primary container"
                      disabled={submitting}
                      onLinked={onCroLinked}
                      onCleared={onCroCleared}
                    />
                  ) : (
                    <CroEdoLegacyUploadPanel
                      embedded
                      unitLabel="Primary container"
                      fileName={legacyPrimaryFile?.name ?? ''}
                      onFileChange={setLegacyPrimaryFile}
                      disabled={submitting}
                    />
                  )
                }
                companionCroSlot={
                  <CroEdoLegacyUploadPanel
                    embedded
                    unitLabel="Companion container"
                    fileName={legacyCompanionFile?.name ?? ''}
                    onFileChange={setLegacyCompanionFile}
                    disabled={submitting}
                    showRequiredHint
                  />
                }
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
            borderRadius: '1rem',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: '#fff',
            boxShadow: appColors.surfaceShadow,
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
                    bgcolor: i === 0 ? '#00A3E0' : ICS_PRIMARY,
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
