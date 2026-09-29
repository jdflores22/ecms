import { Navigate, useNavigate } from 'react-router-dom'
import BookingQrScanner from '../../components/depot/BookingQrScanner'
import { useAppSelector } from '../../store/hooks'

export type GateScanNavigationState = {
  scannedQr?: string
}

export default function GateScanCameraPage() {
  const user = useAppSelector((s) => s.auth.user)
  const navigate = useNavigate()
  const allowed = user?.role === 'DepotPersonnel' || user?.role === 'Administrator'

  if (!allowed) return <Navigate to="/" replace />

  const goBack = () => navigate('/depot/gate-scan')

  const handleScan = (qrReference: string) => {
    navigate('/depot/gate-scan', { state: { scannedQr: qrReference } satisfies GateScanNavigationState })
  }

  return (
    <BookingQrScanner
      variant="fullscreen"
      autoStart
      onClose={goBack}
      onScan={handleScan}
    />
  )
}
