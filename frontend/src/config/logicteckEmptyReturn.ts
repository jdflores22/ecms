export const LOGICTECK_EMPTY_RETURN = {
  pageTitle: 'New Empty Return Booking',
  pageSubtitle: 'Fill in the details to book a return for an empty container.',
  navLabel: 'LOGICTECK return',
  integrationNote:
    'Sample form aligned to LOGICTECK empty return. Submitting transmits the payload to LOGICTECK via ICS API.',
  loggedInPrefix: 'Logged in as',
  licensePrefix: 'Your License Number is:',
  submitValidation: 'Submit for validation',
  saveDraft: 'Save as draft',
  cancel: 'Cancel',
  transmissionSuccess: 'Payload transmitted to LOGICTECK.',
  transmissionReady: 'Payload built — set Logicteck:EmptyReturnUrl to transmit live.',
} as const

export const LOGICTECK_DAMAGE_VIEWS = [
  { key: 'Back', label: 'Back', required: true },
  { key: 'Front', label: 'Front', required: true },
  { key: 'LeftSideOut', label: 'Left side out', required: true },
  { key: 'RightSideOut', label: 'Right side out', required: true },
  { key: 'LeftSideIn', label: 'Left side in', required: true },
  { key: 'RightSideIn', label: 'Right side in', required: true },
  { key: 'Flooring', label: 'Flooring', required: true },
  { key: 'Backdoor', label: 'Backdoor', required: true },
  { key: 'Other', label: 'Other', required: false },
] as const

export type LogicteckDamageViewKey = (typeof LOGICTECK_DAMAGE_VIEWS)[number]['key']

export const LOGICTECK_FORM_FIELD_BG = '#edf7ef'
export const LOGICTECK_FORM_BORDER = '#b9dfc0'
