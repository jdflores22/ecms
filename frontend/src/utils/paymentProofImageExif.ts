import { buildPhilippinesIsoFromParts } from './paymentProofDateParts'

/** Scan JPEG header for EXIF DateTimeOriginal / DateTime (ASCII segment). */
export async function readImageExifDate(blob: Blob): Promise<string | null> {
  try {
    const buffer = await blob.slice(0, 384 * 1024).arrayBuffer()
    const haystack = new TextDecoder('latin1').decode(new Uint8Array(buffer))
    const matches = [
      ...haystack.matchAll(/(20[2-9]\d):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/g),
    ]
    if (!matches.length) return null

    const [, year, month, day, hour, minute, second] = matches[0]
    return buildPhilippinesIsoFromParts({
      year: Number(year),
      month: Number(month),
      day: Number(day),
      hour: Number(hour),
      minute: Number(minute),
      second: Number(second),
    })
  } catch {
    return null
  }
}
