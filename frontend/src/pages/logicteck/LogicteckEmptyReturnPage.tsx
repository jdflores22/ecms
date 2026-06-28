import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LogicteckPhotoUploadCard from '../../components/logicteck/LogicteckPhotoUploadCard'
import { listPageRootSx, LIST_PRIMARY } from '../../components/layout/ListPagePrimitives'
import {
  LOGICTECK_DAMAGE_VIEWS,
  LOGICTECK_EMPTY_RETURN,
  LOGICTECK_FORM_BORDER,
  LOGICTECK_FORM_FIELD_BG,
  type LogicteckDamageViewKey,
} from '../../config/logicteckEmptyReturn'
import { logicteckEmptyReturnApi, preAdviceApi, type LogicteckEmptyReturnSubmitResponse, type PreAdviceLookups } from '../../services/api'
import { useAppSelector } from '../../store/hooks'
import { formatContainerSizeLabel } from '../../utils/containerSize'

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    bgcolor: LOGICTECK_FORM_FIELD_BG,
  },
}

const MAX_BYTES = 5 * 1024 * 1024

function uploadBoxSx(active: boolean) {
  return {
    minHeight: 140,
    p: 2,
    border: '2px dashed',
    borderColor: active ? LOGICTECK_FORM_BORDER : 'divider',
    borderRadius: 2,
    bgcolor: active ? LOGICTECK_FORM_FIELD_BG : '#fafafa',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0.75,
    cursor: 'pointer',
    textAlign: 'center' as const,
  }
}

export default function LogicteckEmptyReturnPage() {
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)

  const [lookups, setLookups] = useState<PreAdviceLookups | null>(null)
  const [loadingLookups, setLoadingLookups] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<LogicteckEmptyReturnSubmitResponse | null>(null)

  const [driverName, setDriverName] = useState(user?.fullName ?? '')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [plateDifferent, setPlateDifferent] = useState(false)
  const [platePrefix, setPlatePrefix] = useState('')
  const [plateSuffix, setPlateSuffix] = useState('')
  const [alternatePlate, setAlternatePlate] = useState('')
  const [shippingLineCode, setShippingLineCode] = useState('')
  const [blNumber, setBlNumber] = useState('')
  const [containerSize, setContainerSize] = useState('')
  const [containerType, setContainerType] = useState('')
  const [containerNumber, setContainerNumber] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [returnTime, setReturnTime] = useState('')
  const [damageDescription, setDamageDescription] = useState('')
  const [icsBookingReference, setIcsBookingReference] = useState('')
  const [preAdviseAttachment, setPreAdviseAttachment] = useState<File | null>(null)
  const [driversLicensePhoto, setDriversLicensePhoto] = useState<File | null>(null)
  const [damagePhotos, setDamagePhotos] = useState<Record<LogicteckDamageViewKey, File | null>>(() =>
    Object.fromEntries(LOGICTECK_DAMAGE_VIEWS.map((v) => [v.key, null])) as Record<LogicteckDamageViewKey, File | null>,
  )
  const [damageFlags, setDamageFlags] = useState<Record<LogicteckDamageViewKey, boolean>>(() =>
    Object.fromEntries(LOGICTECK_DAMAGE_VIEWS.map((v) => [v.key, false])) as Record<LogicteckDamageViewKey, boolean>,
  )

  useEffect(() => {
    preAdviceApi
      .lookups()
      .then(({ data }) => setLookups(data))
      .catch(() => setError('Failed to load shipping line and container catalogs.'))
      .finally(() => setLoadingLookups(false))
  }, [])

  useEffect(() => {
    if (user?.fullName && !driverName) setDriverName(user.fullName)
  }, [user?.fullName, driverName])

  const sizeOptions = useMemo(
    () => lookups?.containerSizes.map((s) => formatContainerSizeLabel(s.label)) ?? [],
    [lookups],
  )
  const typeOptions = useMemo(
    () => lookups?.containerTypes.map((t) => t.label || t.code) ?? [],
    [lookups],
  )

  const validateFiles = () => {
    const files = [preAdviseAttachment, driversLicensePhoto, ...Object.values(damagePhotos).filter(Boolean)] as File[]
    for (const file of files) {
      if (file.size > MAX_BYTES) return `${file.name} exceeds 5 MB.`
    }
    return null
  }

  const buildFormData = (submitMode: 'draft' | 'submit') => {
    const form = new FormData()
    form.append('driverName', driverName.trim())
    form.append('licenseNumber', licenseNumber.trim())
    form.append('plateNumberDifferent', String(plateDifferent))
    form.append('platePrefix', platePrefix.trim().toUpperCase())
    form.append('plateSuffix', plateSuffix.trim())
    form.append('plateNumber', alternatePlate.trim().toUpperCase())
    form.append('shippingLine', shippingLineCode.trim())
    form.append('blNumber', blNumber.trim())
    form.append('containerSize', containerSize.trim())
    form.append('containerType', containerType.trim())
    form.append('containerNumber', containerNumber.trim().toUpperCase())
    form.append('returnDate', returnDate)
    form.append('returnTime', returnTime)
    form.append('damageDescription', damageDescription.trim())
    form.append('icsBookingReference', icsBookingReference.trim())
    form.append('submitMode', submitMode)
    form.append(
      'damageViews',
      JSON.stringify(
        LOGICTECK_DAMAGE_VIEWS.map((view) => ({
          view: view.key,
          isDamaged: damageFlags[view.key],
        })),
      ),
    )

    if (preAdviseAttachment) form.append('preAdviseAttachment', preAdviseAttachment)
    if (driversLicensePhoto) form.append('driversLicensePhoto', driversLicensePhoto)

    LOGICTECK_DAMAGE_VIEWS.forEach((view) => {
      const file = damagePhotos[view.key]
      if (file) form.append(`photo_${view.key}`, file)
    })

    return form
  }

  const handleSubmit = async (submitMode: 'draft' | 'submit') => {
    setError('')
    setResult(null)

    const fileError = validateFiles()
    if (fileError) {
      setError(fileError)
      return
    }

    setSubmitting(true)
    try {
      const { data } = await logicteckEmptyReturnApi.submit(buildFormData(submitMode))
      setResult(data)
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not submit empty return to LOGICTECK.'
      setResult((err as { response?: { data?: LogicteckEmptyReturnSubmitResponse } })?.response?.data ?? null)
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingLookups) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 12 }}>
        <CircularProgress sx={{ color: LIST_PRIMARY }} />
      </Box>
    )
  }

  return (
    <Box sx={{ ...listPageRootSx, maxWidth: 980, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 800, color: LIST_PRIMARY, mb: 0.5 }}>
        {LOGICTECK_EMPTY_RETURN.pageTitle}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {LOGICTECK_EMPTY_RETURN.pageSubtitle}
      </Typography>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          bgcolor: LOGICTECK_FORM_FIELD_BG,
          border: '1px solid',
          borderColor: LOGICTECK_FORM_BORDER,
          display: 'flex',
          gap: 1.5,
          alignItems: 'flex-start',
        }}
      >
        <AccountCircleOutlinedIcon sx={{ color: LIST_PRIMARY, mt: 0.25 }} />
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {LOGICTECK_EMPTY_RETURN.loggedInPrefix} {driverName || user?.username}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {LOGICTECK_EMPTY_RETURN.licensePrefix} {licenseNumber || '—'}
          </Typography>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {result?.success && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
          {result.message}
          {result.payloadPreview && (
            <Typography variant="caption" component="div" sx={{ mt: 1, display: 'block' }}>
              Container {result.payloadPreview.containerNumber} · {result.payloadPreview.shippingLine} ·{' '}
              {result.payloadPreview.returnDate} {result.payloadPreview.returnTime}
              {result.transmitted ? ` · sent to ${result.targetUrl}` : ''}
            </Typography>
          )}
        </Alert>
      )}

      <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <TextField
            label="Driver name"
            required
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
            sx={fieldSx}
          />
          <TextField
            label="License number"
            required
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            sx={fieldSx}
          />
        </Box>

        <Paper
          variant="outlined"
          sx={{ p: 2, borderRadius: 2, borderStyle: 'dashed', borderColor: LOGICTECK_FORM_BORDER }}
        >
          <FormControlLabel
            control={
              <Checkbox checked={plateDifferent} onChange={(e) => setPlateDifferent(e.target.checked)} />
            }
            label="Plate number is different or not available"
            sx={{ mb: 1.5 }}
          />
          {plateDifferent ? (
            <TextField
              label="Plate number"
              required
              fullWidth
              value={alternatePlate}
              onChange={(e) => setAlternatePlate(e.target.value.toUpperCase())}
              sx={fieldSx}
            />
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Plate prefix"
                required
                placeholder="ABC"
                value={platePrefix}
                onChange={(e) => setPlatePrefix(e.target.value.toUpperCase().slice(0, 3))}
                sx={fieldSx}
              />
              <TextField
                label="Plate suffix"
                required
                placeholder="1234"
                value={plateSuffix}
                onChange={(e) => setPlateSuffix(e.target.value.replace(/\D/g, '').slice(0, 4))}
                sx={fieldSx}
              />
            </Box>
          )}
        </Paper>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <FormControl required sx={fieldSx}>
            <InputLabel>Shipping line</InputLabel>
            <Select
              label="Shipping line"
              value={shippingLineCode}
              onChange={(e) => setShippingLineCode(e.target.value)}
            >
              {lookups?.shippingLines.map((line) => (
                <MenuItem key={line.id} value={line.code}>
                  {line.name} ({line.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="BL number"
            placeholder="E.G. SH12345678"
            value={blNumber}
            onChange={(e) => setBlNumber(e.target.value.toUpperCase())}
            sx={fieldSx}
          />
          <FormControl required sx={fieldSx}>
            <InputLabel>Container size</InputLabel>
            <Select label="Container size" value={containerSize} onChange={(e) => setContainerSize(e.target.value)}>
              {sizeOptions.map((size) => (
                <MenuItem key={size} value={size}>
                  {size}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl required sx={fieldSx}>
            <InputLabel>Container type</InputLabel>
            <Select label="Container type" value={containerType} onChange={(e) => setContainerType(e.target.value)}>
              {typeOptions.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <TextField
          label="Container number"
          required
          placeholder="E.G. MSCU1234567"
          value={containerNumber}
          onChange={(e) => setContainerNumber(e.target.value.toUpperCase())}
          sx={fieldSx}
        />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <TextField
            label="Return date"
            type="date"
            required
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={fieldSx}
          />
          <TextField
            label="Return time"
            type="time"
            required
            value={returnTime}
            onChange={(e) => setReturnTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={fieldSx}
          />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Pre-advise attachment (DO / EDO / CRO) *
            </Typography>
            <Box
              component="label"
              sx={uploadBoxSx(Boolean(preAdviseAttachment))}
            >
              <input
                hidden
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,image/*"
                onChange={(e) => setPreAdviseAttachment(e.target.files?.[0] ?? null)}
              />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {preAdviseAttachment ? preAdviseAttachment.name : 'Click to upload'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                PDF, PNG, JPG (MAX. 5MB)
              </Typography>
            </Box>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Driver&apos;s license photo *
            </Typography>
            <Box component="label" sx={uploadBoxSx(Boolean(driversLicensePhoto))}>
              <input
                hidden
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,image/*"
                onChange={(e) => setDriversLicensePhoto(e.target.files?.[0] ?? null)}
              />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {driversLicensePhoto ? driversLicensePhoto.name : 'Click to upload'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                PDF, PNG, JPG (MAX. 5MB)
              </Typography>
            </Box>
          </Box>
        </Box>

        <TextField
          label="ICS booking reference (optional)"
          placeholder="ICS-202600018"
          value={icsBookingReference}
          onChange={(e) => setIcsBookingReference(e.target.value.toUpperCase())}
          sx={fieldSx}
        />

        <TextField
          label="Damage description (optional)"
          multiline
          minRows={3}
          placeholder="Describe general damages..."
          value={damageDescription}
          onChange={(e) => setDamageDescription(e.target.value)}
          sx={fieldSx}
        />

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
            Upload photos of damage *
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Tap a photo card to upload from your gallery or camera.
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
              gap: 2,
            }}
          >
            {LOGICTECK_DAMAGE_VIEWS.map((view) => (
              <LogicteckPhotoUploadCard
                key={view.key}
                label={view.label}
                required={view.required}
                file={damagePhotos[view.key]}
                isDamaged={damageFlags[view.key]}
                onFileChange={(file) =>
                  setDamagePhotos((prev) => ({ ...prev, [view.key]: file }))
                }
                onDamagedChange={(damaged) =>
                  setDamageFlags((prev) => ({ ...prev, [view.key]: damaged }))
                }
              />
            ))}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'flex-end', pt: 1 }}>
          <Button variant="text" onClick={() => navigate(-1)} disabled={submitting}>
            {LOGICTECK_EMPTY_RETURN.cancel}
          </Button>
          <Button
            variant="outlined"
            disabled={submitting}
            onClick={() => handleSubmit('draft')}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {submitting ? 'Saving…' : LOGICTECK_EMPTY_RETURN.saveDraft}
          </Button>
          <Button
            variant="contained"
            disabled={submitting}
            onClick={() => handleSubmit('submit')}
            sx={{ fontWeight: 700, borderRadius: 2, bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
          >
            {submitting ? 'Submitting…' : LOGICTECK_EMPTY_RETURN.submitValidation}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
