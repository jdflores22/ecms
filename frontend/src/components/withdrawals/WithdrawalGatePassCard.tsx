import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import QrCode2Icon from '@mui/icons-material/QrCode2'
import { Alert, Box, Button, Chip, Paper, Snackbar, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import { withdrawalApi, type WithdrawalGatePass } from '../../services/api'
import { formatScheduleDate } from '../../utils/datetime'
import { hexToRgba, ICS_PRIMARY, InfoTile, infoGridSx } from '../layout/DetailPagePrimitives'
import { InlineLoadingSkeleton } from '../layout/SkeletonPrimitives'

interface WithdrawalGatePassCardProps {
  withdrawalId: number
  status: string
}

export default function WithdrawalGatePassCard({ withdrawalId, status }: WithdrawalGatePassCardProps) {
  const [pass, setPass] = useState<WithdrawalGatePass | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  const eligible = ['Approved', 'Released', 'Completed'].includes(status)

  useEffect(() => {
    if (!eligible) {
      setPass(null)
      return
    }
    setLoading(true)
    setError('')
    withdrawalApi
      .gatePass(withdrawalId)
      .then(({ data }) => setPass(data))
      .catch(() => setError('Gate pass is not available yet.'))
      .finally(() => setLoading(false))
  }, [withdrawalId, eligible, status])

  const handleCopyPayload = async () => {
    if (!pass) return
    try {
      await navigator.clipboard.writeText(pass.qrPayload)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const handleDownloadQr = () => {
    if (!pass || !qrRef.current) return
    const svg = qrRef.current.querySelector('svg')
    if (!svg) return

    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svg)
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `gate-pass-${pass.referenceNo}.svg`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!eligible) return null

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <QrCode2Icon sx={{ color: ICS_PRIMARY }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Withdrawal gate pass
        </Typography>
        {pass && (
          <Chip
            size="small"
            label={`Valid until ${formatScheduleDate(pass.expiresOn)}`}
            sx={{ ml: 'auto', fontWeight: 600 }}
          />
        )}
      </Box>

      {loading ? (
        <InlineLoadingSkeleton rows={4} />
      ) : error ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      ) : pass ? (
        <>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              mb: 2,
              borderRadius: 2,
              bgcolor: hexToRgba(ICS_PRIMARY, 0.04),
              border: '1px solid',
              borderColor: hexToRgba(ICS_PRIMARY, 0.1),
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {pass.referenceNo} · ATW {pass.atwNumber}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {pass.containerSummary} · {pass.currentDepotName} → {pass.destination}
            </Typography>
          </Paper>

          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Paper
              ref={qrRef}
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: '#fff',
                display: 'inline-flex',
              }}
            >
              <QRCode
                value={pass.qrPayload}
                size={220}
                level="M"
                bgColor="#ffffff"
                fgColor="#0B3D91"
                title={`Withdrawal gate pass ${pass.gateCode}`}
              />
            </Paper>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
            Present this QR code at the container yard gate for release verification.
          </Typography>

          <Box
            sx={{
              ...infoGridSx,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              mb: 2,
            }}
          >
            <InfoTile label="Gate code" value={pass.gateCode} mono />
            <InfoTile label="ATW number" value={pass.atwNumber} mono />
            <InfoTile label="Container yard" value={pass.currentDepotName} />
            <InfoTile label="Destination" value={pass.destination} />
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={() => void handleCopyPayload()}
              sx={{ fontWeight: 600, borderRadius: 2 }}
            >
              Copy QR payload
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={handleDownloadQr}
              sx={{ fontWeight: 600, borderRadius: 2 }}
            >
              Download QR
            </Button>
          </Box>
        </>
      ) : null}

      <Snackbar
        open={copied}
        autoHideDuration={2500}
        onClose={() => setCopied(false)}
        message="Gate pass payload copied"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}
