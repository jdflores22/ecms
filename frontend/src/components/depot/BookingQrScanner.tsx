import jsQR from 'jsqr'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined'
import { useCallback, useEffect, useRef, useState } from 'react'
import { DEPOT_GATE } from '../../config/depotGate'
import { normalizeBookingQrReference } from '../../utils/bookingQr'

type BookingQrScannerProps = {
  disabled?: boolean
  onScan: (qrReference: string) => void
}

export default function BookingQrScanner({ disabled, onScan }: BookingQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [starting, setStarting] = useState(false)

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraActive(false)
  }, [])

  const decodeFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < video.HAVE_CURRENT_DATA) {
      rafRef.current = requestAnimationFrame(decodeFrame)
      return
    }

    const width = video.videoWidth
    const height = video.videoHeight
    if (width === 0 || height === 0) {
      rafRef.current = requestAnimationFrame(decodeFrame)
      return
    }

    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      rafRef.current = requestAnimationFrame(decodeFrame)
      return
    }

    ctx.drawImage(video, 0, 0, width, height)
    const imageData = ctx.getImageData(0, 0, width, height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    })

    if (code?.data) {
      const reference = normalizeBookingQrReference(code.data)
      if (reference) {
        stopCamera()
        onScan(reference)
        return
      }
    }

    rafRef.current = requestAnimationFrame(decodeFrame)
  }, [onScan, stopCamera])

  const startCamera = useCallback(async () => {
    if (disabled || cameraActive) return
    setStarting(true)
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraActive(true)
      rafRef.current = requestAnimationFrame(decodeFrame)
    } catch (err) {
      const denied = err instanceof DOMException && err.name === 'NotAllowedError'
      setCameraError(denied ? DEPOT_GATE.cameraPermissionDenied : DEPOT_GATE.cameraUnavailable)
      stopCamera()
    } finally {
      setStarting(false)
    }
  }, [cameraActive, decodeFrame, disabled, stopCamera])

  useEffect(() => () => stopCamera(), [stopCamera])

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: { xs: 2, sm: 2.5 },
        bgcolor: 'rgba(11, 61, 145, 0.03)',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center' }}>
        <QrCodeScannerIcon color="primary" />
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          {DEPOT_GATE.scannerTitle}
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {DEPOT_GATE.scannerHint}
      </Typography>

      <Box
        sx={{
          position: 'relative',
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: '#0a1628',
          aspectRatio: '4 / 3',
          maxHeight: 320,
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: cameraActive ? 'block' : 'none',
          }}
        />
        <canvas ref={canvasRef} hidden />
        {!cameraActive && (
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', px: 2, textAlign: 'center' }}>
            Camera preview will appear here
          </Typography>
        )}
      </Box>

      {cameraError && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          {cameraError}
        </Alert>
      )}

      <Stack direction="row" spacing={1}>
        {cameraActive ? (
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<StopCircleOutlinedIcon />}
            onClick={stopCamera}
            disabled={disabled}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {DEPOT_GATE.stopCamera}
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={starting ? <CircularProgress size={16} color="inherit" /> : <QrCodeScannerIcon />}
            onClick={() => void startCamera()}
            disabled={disabled || starting}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {DEPOT_GATE.startCamera}
          </Button>
        )}
      </Stack>
    </Box>
  )
}
