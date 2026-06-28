export const LOGICTECK_DIRECT_BOOKING = {
  pageTitle: 'New Empty Return Booking',
  pageSubtitle:
    'LOGICTECK empty return form — ICS pre-fills and transfers data. The booking is created on the LOGICTECK side, not in ICS.',
  navLabel: 'Send to LOGICTECK',
  icsSourceNote:
    'ICS does not create the return booking. Review the pre-advice data below and submit to transfer it to LOGICTECK, where the booking is held.',
  loggedInPrefix: 'Logged in as',
  icsBookingReference: 'ICS QR reference',
  preAdviceReference: 'Pre-advice reference',
  shippingLine: 'Shipping line',
  containerNumber: 'Container number',
  containerSize: 'Container size',
  containerType: 'Container type',
  returnDate: 'Return date',
  returnTime: 'Return time',
  depot: 'Depot',
  driverName: 'Driver / trucker',
  loadBooking: 'Load transfer QR',
  searchPlaceholder: 'ICS-202600018',
  submitValidation: 'Send to LOGICTECK',
  cancel: 'Cancel',
  alreadyBooked: 'Already sent to LOGICTECK — booking is on their system.',
  retrieved: 'QR already retrieved at LOGICTECK gate.',
  bookSuccess: 'Pre-advice data transferred to LOGICTECK.',
  fromIcs: 'Data from ICS',
  fullDossierTitle: 'Full pre-advice data (ICS)',
  viewInIcs: 'Open full pre-advice in ICS',
} as const

export { LOGICTECK_FORM_BORDER, LOGICTECK_FORM_FIELD_BG } from './logicteckEmptyReturn'
