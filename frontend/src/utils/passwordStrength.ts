export type PasswordStrengthCheck = {
  id: string
  label: string
  met: boolean
}

export type PasswordStrength = {
  score: number
  label: 'Weak' | 'Fair' | 'Good' | 'Strong'
  checks: PasswordStrengthCheck[]
  isValid: boolean
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const checks: PasswordStrengthCheck[] = [
    { id: 'length', label: 'At least 8 characters', met: password.length >= 8 },
    { id: 'lower', label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { id: 'upper', label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { id: 'digit', label: 'One number', met: /\d/.test(password) },
    { id: 'special', label: 'One special character (!@#$…)', met: /[^A-Za-z0-9]/.test(password) },
  ]

  const metCount = checks.filter((c) => c.met).length
  let label: PasswordStrength['label'] = 'Weak'
  if (metCount >= 5) label = 'Strong'
  else if (metCount >= 4) label = 'Good'
  else if (metCount >= 3) label = 'Fair'

  return {
    score: metCount,
    label,
    checks,
    isValid: checks.every((c) => c.met),
  }
}

export function passwordStrengthMessage(password: string): string | null {
  const strength = evaluatePasswordStrength(password)
  if (strength.isValid) return null
  const first = strength.checks.find((c) => !c.met)
  return first ? `Password requirement: ${first.label.toLowerCase()}.` : null
}
