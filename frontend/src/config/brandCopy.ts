/** Shared ICS product messaging — pre-forecasted returns to CY or Port Terminal. */
export const ICS_BRAND = {
  name: 'Intelligent Container Solutions',
  shortName: 'ICS',
  logoSrc: '/ics-logo.png',
  logoAlt: 'ICS — Intelligent Container Solutions',
  tagline: 'Pre-forecast empty containers for return to CY or Port Terminal',
  description:
    'Coordinate pre-forecast, shipping-line evaluation, depot scheduling, trucker payments, and LOGICTECK booking QR — whether the container returns to a Container Yard (CY) or Port Terminal.',
  appBarCaption: 'Pre-forecast & returns to CY or Port Terminal',
  truckerSignup:
    'Register to submit pre-forecast, manage assigned returns, upload payments, and access booking QR codes.',
  truckerCard:
    'Submit pre-forecast for empty containers, track returns, upload payment proof, and download booking QR codes.',
} as const

export const ICS_LANDING = {
  eyebrow: 'Container return management platform',
  headline: 'Streamline empty container returns from pre-forecast to gate pass',
  headlineAccent: 'pre-forecast to gate pass',
  subheadline:
    'ICS connects truckers, shipping-line evaluators, and depot teams on one workflow — pre-forecast submission, CY allocation, scheduling, payments, and LOGICTECK QR booking.',
  primaryCta: 'Create trucker account',
  secondaryCta: 'Sign in',
  workflowTitle: 'How ICS works',
  workflowSubtitle: 'A single, auditable path from trucker submission to depot release.',
  featuresTitle: 'Built for every role in the return chain',
  featuresSubtitle:
    'Replace spreadsheets and phone calls with one portal for pre-forecast, evaluation, depot operations, and billing.',
  rolesTitle: 'Get started',
  rolesSubtitle:
    'Truckers can self-register. Evaluator, depot, and administrator accounts are provisioned by your organization.',
  footer: `© ${new Date().getFullYear()} Intelligent Container Solutions. All rights reserved.`,
} as const

export const ICS_LANDING_FEATURES = [
  {
    title: 'Pre-forecast & photos',
    description:
      'Truckers submit container details with required identity photos before shipping-line review begins.',
    icon: 'forecast' as const,
  },
  {
    title: 'Shipping-line evaluation',
    description:
      'Evaluators approve or request compliance corrections with full dossier visibility and audit history.',
    icon: 'evaluation' as const,
  },
  {
    title: 'CY allocation & inventory',
    description:
      'Track yard capacity, manual inventory, releases, and TEU limits across depots and shipping lines.',
    icon: 'yard' as const,
  },
  {
    title: 'Depot scheduling',
    description:
      'Assign return slots, confirm truckers, and coordinate gate activity with real-time status updates.',
    icon: 'schedule' as const,
  },
  {
    title: 'Payments & demurrage',
    description:
      'Upload payment proof with OCR assist, manage return fees, and handle demurrage billing in one place.',
    icon: 'payment' as const,
  },
  {
    title: 'LOGICTECK QR booking',
    description:
      'Generate and print booking QR codes, sync status with LOGICTECK, and keep truckers informed on mobile.',
    icon: 'qr' as const,
  },
] as const

export const ICS_LANDING_WORKFLOW = [
  { step: '01', title: 'Pre-forecast', detail: 'Trucker submits container data and photos.' },
  { step: '02', title: 'Evaluate', detail: 'Shipping line reviews and approves the request.' },
  { step: '03', title: 'Schedule & pay', detail: 'Depot assigns a slot; trucker confirms with payment.' },
  { step: '04', title: 'Return & QR', detail: 'Gate pass, LOGICTECK booking, and container release.' },
] as const
