import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined'
import GppBadOutlinedIcon from '@mui/icons-material/GppBadOutlined'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import IcsLogo from '../../components/brand/IcsLogo'
import { verifyCroEdoPublic, type CroEdoVerificationResult } from '../../services/publicApi'
import { ICS_BRAND } from '../../config/brandCopy'

const primary = '#0B3D91'
const icsFullName = `${ICS_BRAND.name} (${ICS_BRAND.shortName})`

export default function CroEdoVerifyPage() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<CroEdoVerificationResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token?.trim()) {
      setLoading(false)
      setResult({
        valid: false,
        status: 'not_found',
        message: 'No verification token was provided.',
      })
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')

    verifyCroEdoPublic(token)
      .then((data) => {
        if (!cancelled) setResult(data)
      })
      .catch(() => {
        if (!cancelled) {
          setError('Unable to reach the verification service. Please try again in a moment.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const valid = result?.valid === true

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#0a1628',
        background: 'linear-gradient(165deg, #0a1628 0%, #0B3D91 48%, #061428 100%)',
        py: { xs: 4, md: 6 },
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Stack spacing={2.5} sx={{ mb: 3, alignItems: 'center' }}>
          <Box
            component={Link}
            to="/"
            sx={{
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1.5,
              color: 'inherit',
            }}
          >
            <IcsLogo height={{ xs: 52, sm: 60 }} maxWidth={{ xs: 200, sm: 240 }} />
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant="h6"
                sx={{
                  color: '#fff',
                  fontWeight: 800,
                  lineHeight: 1.25,
                  fontSize: { xs: '1.05rem', sm: '1.2rem' },
                }}
              >
                {ICS_BRAND.name}
              </Typography>
            </Box>
          </Box>

          <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800, textAlign: 'center' }}>
            CRO / eDO verification
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', textAlign: 'center', maxWidth: 440 }}>
            This page confirms whether a Container Release Order / electronic Delivery Order was
            officially issued by {icsFullName}.
          </Typography>
        </Stack>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          }}
        >
          {loading ? (
            <Box sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={36} sx={{ color: primary }} />
              <Typography color="text.secondary">Verifying document…</Typography>
            </Box>
          ) : error ? (
            <Box sx={{ p: 3 }}>
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                {error}
              </Alert>
            </Box>
          ) : result ? (
            <Box sx={{ p: { xs: 2.5, sm: 3.5 } }}>
              <Stack spacing={2.5} sx={{ mb: 3, alignItems: 'center' }}>
                {valid ? (
                  <VerifiedUserOutlinedIcon sx={{ fontSize: 56, color: '#2e7d32' }} />
                ) : (
                  <GppBadOutlinedIcon sx={{ fontSize: 56, color: '#c62828' }} />
                )}
                <Chip
                  label={
                    valid
                      ? 'Verified genuine'
                      : result.status === 'cancelled'
                        ? 'Cancelled'
                        : 'Not verified'
                  }
                  color={valid ? 'success' : 'error'}
                  sx={{ fontWeight: 800, px: 1 }}
                />
                <Typography
                  variant="body1"
                  sx={{ textAlign: 'center', color: 'text.primary', fontWeight: 600, lineHeight: 1.5 }}
                >
                  {result.message}
                </Typography>
              </Stack>

              {valid && (
                <Box
                  sx={{
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'rgba(11, 61, 145, 0.03)',
                    p: 2,
                  }}
                >
                  <Typography variant="overline" sx={{ fontWeight: 700, color: primary, letterSpacing: 1 }}>
                    Document details
                  </Typography>
                  <Stack spacing={1.25} sx={{ mt: 1 }}>
                    {result.referenceNo && <DetailRow label="CRO reference" value={result.referenceNo} mono />}
                    {result.documentStatus && <DetailRow label="Status" value={result.documentStatus} />}
                    {result.shippingLineName && (
                      <DetailRow label="Shipping line" value={result.shippingLineName} />
                    )}
                    {result.consigneeNotifyParty && (
                      <DetailRow label="Consignee / notify" value={result.consigneeNotifyParty} />
                    )}
                    {result.blNumber && <DetailRow label="BL number" value={result.blNumber} mono />}
                    {result.vesselVoyageNumber && (
                      <DetailRow label="Vessel / voyage" value={result.vesselVoyageNumber} />
                    )}
                    {result.brokerName && <DetailRow label="Broker" value={result.brokerName} />}
                    {result.issuedAt && <DetailRow label="Issued at" value={result.issuedAt} />}
                  </Stack>

                  {result.lines && result.lines.length > 0 && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="overline" sx={{ fontWeight: 700, color: primary, letterSpacing: 1 }}>
                        Containers
                      </Typography>
                      <Stack spacing={1.5} sx={{ mt: 1 }}>
                        {result.lines.map((line) => (
                          <Box
                            key={`${line.lineNo}-${line.containerNumber}`}
                            sx={{
                              borderRadius: 1.5,
                              border: '1px solid',
                              borderColor: 'divider',
                              p: 1.5,
                              bgcolor: '#fff',
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: 'monospace', mb: 0.75 }}>
                              {line.containerNumber}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {line.size} {line.type} · Seal {line.seal || '—'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Hauler {line.haulerName || '—'} · Plate {line.plateNo || '—'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Free time until {line.demurrageValidUntil} · Return to {line.returnEmptyTo || '—'}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </>
                  )}
                </Box>
              )}

              {!valid && (
                <Alert severity="error" variant="outlined" sx={{ borderRadius: 2 }}>
                  Do not treat this document as an official {icsFullName} CRO/eDO. Contact the issuing shipping
                  line if you believe this is an error.
                </Alert>
              )}
            </Box>
          ) : null}
        </Paper>

        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            mt: 3,
            color: 'rgba(255,255,255,0.55)',
            maxWidth: 480,
            mx: 'auto',
          }}
        >
          Verification tokens are single-purpose and cannot be guessed. {ICS_BRAND.name} never asks you to enter
          passwords on this page.
        </Typography>
      </Container>
    </Box>
  )
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 700, textAlign: 'right', fontFamily: mono ? 'monospace' : 'inherit' }}
      >
        {value}
      </Typography>
    </Box>
  )
}
