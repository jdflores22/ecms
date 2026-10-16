import { qrApi } from '../services/api'
import { store } from '../store'

import { confirmedPreForecastCopy } from '../config/confirmedPreForecast'

/** Download the ICS confirmed pre-forecast PDF generated after payment approval. */
export async function downloadBookingConfirmationPdf(
  bookingId: number,
  bookingCode?: string,
): Promise<void> {
  const token = store.getState().auth.accessToken
  const res = await fetch(qrApi.confirmationPdfUrl(bookingId), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? confirmedPreForecastCopy.downloadUnavailable
        : confirmedPreForecastCopy.downloadFailed,
    )
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ICS-Confirmed-PreForecast-${bookingCode || bookingId}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

/** Resolve the QR booking for a schedule, then download its confirmation PDF. */
export async function downloadBookingConfirmationPdfBySchedule(scheduleId: number): Promise<void> {
  const { data } = await qrApi.getBySchedule(scheduleId)
  await downloadBookingConfirmationPdf(data.id, data.qrCode)
}
