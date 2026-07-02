/** Browser-native OCR engines (run in admin UI). */
export const BROWSER_OCR_ENGINES = ['paddleocr-js', 'tesseract.js'] as const

/**
 * Server-side Python ensemble engines (scripts/ocr-ensemble).
 * Each engine is optional — install via pip; missing engines are skipped.
 */
export const SERVER_OCR_ENGINES = [
  'tesseract',
  'tesseract_line',
  'paddleocr',
  'easyocr',
  'doctr',
  'cnocr',
  'surya',
  'keras_ocr',
  'ocrmypdf',
  'kraken',
  'calamari',
  'mmocr',
] as const

export const PAYMENT_PROOF_OCR_STACK = [
  ...BROWSER_OCR_ENGINES,
  ...SERVER_OCR_ENGINES,
] as const

export type BrowserOcrEngine = (typeof BROWSER_OCR_ENGINES)[number]
export type ServerOcrEngine = (typeof SERVER_OCR_ENGINES)[number]
