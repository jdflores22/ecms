/** ISO 6346 check digit validation for container numbers (4 letters + 7 digits). */

/** Letter values per ISO 6346 (multiples of 11 omitted from the 10–38 range). */
const ISO6346_LETTER_VALUE: readonly number[] = [
  10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 34, 35, 36, 37, 38,
]

export function normalizeContainerNo(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '')
}

function iso6346CharValue(ch: string): number | null {
  if (ch >= '0' && ch <= '9') return Number(ch)
  const code = ch.charCodeAt(0)
  if (code < 65 || code > 90) return null
  return ISO6346_LETTER_VALUE[code - 65]
}

export function isValidContainerNumber(value: string): boolean {
  const normalized = normalizeContainerNo(value)
  if (!/^[A-Z]{4}\d{7}$/.test(normalized)) return false

  let sum = 0
  for (let i = 0; i < 10; i += 1) {
    const ch = normalized[i]
    const n = iso6346CharValue(ch)
    if (n === null) return false
    sum += n * 2 ** i
  }
  const check = sum % 11
  const expected = check === 10 ? 0 : check
  return expected === Number(normalized[10])
}

export function containerNumberError(value: string): string | null {
  const normalized = normalizeContainerNo(value)
  if (!normalized) return null
  if (normalized.length !== 11) {
    return 'Container number must be exactly 11 characters (4 letters + 7 digits, ISO 6346).'
  }
  if (!/^[A-Z]{4}\d{7}$/.test(normalized)) {
    return 'Use 4 letters then 7 digits (e.g. MSCU1234567).'
  }
  if (!isValidContainerNumber(normalized)) return 'Invalid container number check digit (ISO 6346).'
  return null
}

/** Strip to ISO container charset and cap length while typing. */
export function formatContainerNumberInput(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 11)
}
