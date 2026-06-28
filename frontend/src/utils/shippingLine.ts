function looksLikeLegalName(value: string): boolean {
  if (value.length > 12) return true
  return /\b(CO\.|LTD|LIMITED|LINE|SHIPPING|INC\.|CORP\.|COMPANY)\b/i.test(value)
}

/** Prefer the short shipping line code (e.g. ASL) over a full legal name in either field. */
export function getShippingLineDisplayCode(code: string | null | undefined, name?: string | null): string {
  const normalizedCode = code?.trim() ?? ''
  const normalizedName = name?.trim() ?? ''

  if (!normalizedCode && !normalizedName) return '—'

  const codeLooksLegal = looksLikeLegalName(normalizedCode)
  const nameLooksLegal = looksLikeLegalName(normalizedName)

  if (codeLooksLegal && !nameLooksLegal) return normalizedName
  if (!codeLooksLegal && nameLooksLegal) return normalizedCode
  if (!codeLooksLegal && !nameLooksLegal) {
    return normalizedCode.length <= normalizedName.length ? normalizedCode : normalizedName
  }

  return normalizedCode.length <= normalizedName.length ? normalizedCode : normalizedName
}

export function getShippingLineFullName(code: string | null | undefined, name?: string | null): string {
  const normalizedCode = code?.trim() ?? ''
  const normalizedName = name?.trim() ?? ''
  if (normalizedName) return normalizedName
  return normalizedCode || '—'
}
