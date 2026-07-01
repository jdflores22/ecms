/** ISO 6346 check digit validation for container numbers (4 letters + 7 digits). */
export function normalizeContainerNo(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '')
}

export function isValidContainerNumber(value: string): boolean {
  const normalized = normalizeContainerNo(value)
  if (!/^[A-Z]{4}\d{7}$/.test(normalized)) return false

  const letters = normalized.slice(0, 4)
  const digits = normalized.slice(4)
  let sum = 0
  for (let i = 0; i < 10; i += 1) {
    const ch = (i < 4 ? letters[i] : digits[i - 4]) as string
    let n: number
    if (i < 4) {
      const code = ch.charCodeAt(0)
      if (code < 65 || code > 90) return false
      n = code - 55
      if (n > 9) n += 1
    } else {
      n = Number(ch)
      if (!Number.isFinite(n)) return false
    }
    sum += n * 2 ** i
  }
  const check = sum % 11
  const expected = check === 10 ? 0 : check
  return expected === Number(digits[6])
}

export function containerNumberError(value: string): string | null {
  const normalized = normalizeContainerNo(value)
  if (!normalized) return null
  if (normalized.length < 11) return 'Container number must be 11 characters (4 letters + 7 digits).'
  if (!isValidContainerNumber(normalized)) return 'Invalid container number check digit (ISO 6346).'
  return null
}
