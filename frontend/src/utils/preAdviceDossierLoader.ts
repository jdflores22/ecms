import {
  preAdviceApi,
  qrApi,
  scheduleApi,
  type PreAdvice,
  type PreAdviceDocument,
  type QrBooking,
  type Schedule,
} from '../services/api'
import { store } from '../store'

export type PreAdviceDossierBundle = {
  qrBooking: QrBooking
  preAdvice: PreAdvice
  schedule: Schedule | null
  documents: PreAdviceDocument[]
  qrImageUrl: string | null
}

async function loadQrImage(bookingId: number): Promise<string | null> {
  const token = store.getState().auth.accessToken
  if (!token) return null
  const res = await fetch(qrApi.downloadUrl(bookingId), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

/** Load full ICS pre-forecast dossier for a booking QR (requires ICS login). */
export async function loadPreAdviceDossierByQr(qrCode: string): Promise<PreAdviceDossierBundle | null> {
  const token = store.getState().auth.accessToken
  if (!token || !qrCode.trim()) return null

  try {
    const { data: qrBooking } = await qrApi.getByCode(qrCode.trim())
    const scheduleRes = await scheduleApi.get(qrBooking.scheduleId).catch(() => null)
    const schedule = scheduleRes?.data ?? null

    const preAdviceRes = schedule?.preAdviceId
      ? await preAdviceApi.get(schedule.preAdviceId).catch(() => null)
      : null
    if (!preAdviceRes?.data) return null

    const [documentsRes, qrImageUrl] = await Promise.all([
      preAdviceApi.documents(preAdviceRes.data.id).catch(() => ({ data: [] as PreAdviceDocument[] })),
      loadQrImage(qrBooking.id),
    ])

    return {
      qrBooking,
      preAdvice: preAdviceRes.data,
      schedule,
      documents: documentsRes.data,
      qrImageUrl,
    }
  } catch {
    return null
  }
}
