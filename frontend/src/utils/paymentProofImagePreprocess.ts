import {
  analyzeProofImageLayout,
  analyzeLayoutFromImage,
  type ProofLayoutProfile,
} from './paymentProofImageLayout'

export type OcrPreprocessVariant =
  | 'standard'
  | 'lightText'
  | 'binary'
  | 'enhanced'
  | 'dateBand'
  | 'dateLine'
  | 'statusBand'
  | 'metadataBand'
  | 'blueText'
  | 'zoomedFull'
  | 'zoomedDateRow'
  | 'zoomedDetails'

export type { ProofLayoutProfile }
export { analyzeProofImageLayout }

type CropRect = { x: number; y: number; w: number; h: number }

function loadImage(source: Blob | File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load proof image.'))
    if (typeof source === 'string') {
      img.crossOrigin = 'anonymous'
      img.src = source
    } else {
      const url = URL.createObjectURL(source)
      img.src = url
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve(img)
      }
    }
  })
}

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function cropRectForVariant(
  srcW: number,
  srcH: number,
  variant: OcrPreprocessVariant,
  layout: ProofLayoutProfile,
): CropRect {
  if (layout.isZoomedMetadata) {
    if (
      variant === 'zoomedFull' ||
      variant === 'standard' ||
      variant === 'enhanced' ||
      variant === 'lightText'
    ) {
      return { x: 0, y: 0, w: srcW, h: srcH }
    }
    if (variant === 'zoomedDateRow' || variant === 'dateLine' || variant === 'dateBand') {
      return {
        x: Math.floor(srcW * 0.02),
        y: Math.floor(srcH * 0.35),
        w: Math.floor(srcW * 0.96),
        h: Math.max(Math.floor(srcH * 0.16), 96),
      }
    }
    if (variant === 'zoomedDetails' || variant === 'metadataBand') {
      return {
        x: Math.floor(srcW * 0.02),
        y: Math.floor(srcH * 0.27),
        w: Math.floor(srcW * 0.96),
        h: Math.max(Math.floor(srcH * 0.7), 160),
      }
    }
    if (variant === 'statusBand') {
      return { x: 0, y: 0, w: srcW, h: Math.max(Math.floor(srcH * 0.12), 72) }
    }
  }

  if (variant === 'dateLine') {
    const isPhotoOfScreen = layout.isPhotoOfScreen
    return {
      x: Math.floor(srcW * 0.05),
      y: Math.floor(srcH * (isPhotoOfScreen ? 0.4 : 0.5)),
      w: Math.floor(srcW * 0.9),
      h: Math.max(Math.floor(srcH * 0.11), 104),
    }
  }

  if (variant === 'dateBand') {
    const isTightCrop = srcW < 900 && srcH < 500
    if (isTightCrop) {
      return {
        x: Math.floor(srcW * 0.2),
        y: Math.floor(srcH * 0.4),
        w: Math.floor(srcW * 0.78),
        h: Math.max(Math.floor(srcH * 0.12), 80),
      }
    }
    return {
      x: Math.floor(srcW * 0.04),
      y: Math.floor(srcH * 0.3),
      w: Math.floor(srcW * 0.92),
      h: Math.max(Math.floor(srcH * 0.28), 140),
    }
  }

  if (variant === 'statusBand') {
    return { x: 0, y: 0, w: srcW, h: Math.max(Math.floor(srcH * 0.12), 72) }
  }

  if (variant === 'metadataBand' || variant === 'blueText') {
    return {
      x: Math.floor(srcW * 0.22),
      y: Math.floor(srcH * 0.36),
      w: Math.floor(srcW * 0.74),
      h: Math.max(Math.floor(srcH * 0.34), 160),
    }
  }

  return {
    x: Math.floor(srcW * 0.04),
    y: Math.floor(srcH * 0.06),
    w: Math.floor(srcW * 0.92),
    h: Math.floor(srcH * 0.82),
  }
}

function scaleForVariant(cropW: number, variant: OcrPreprocessVariant, layout: ProofLayoutProfile): number {
  if (layout.isZoomedMetadata) {
    if (variant === 'zoomedDateRow' || variant === 'dateLine' || variant === 'dateBand') {
      return Math.min(6, Math.max(3.5, 2600 / cropW))
    }
    if (
      variant === 'zoomedFull' ||
      variant === 'zoomedDetails' ||
      variant === 'standard' ||
      variant === 'enhanced'
    ) {
      return Math.min(5.5, Math.max(3, 2400 / cropW))
    }
  }

  const base = Math.min(4, Math.max(2.5, 1400 / cropW))
  if (
    variant === 'dateBand' ||
    variant === 'dateLine' ||
    variant === 'statusBand' ||
    variant === 'metadataBand' ||
    variant === 'blueText'
  ) {
    return Math.min(5, base + 1.25)
  }
  return base
}

function boxBlurGray(gray: Float32Array, width: number, height: number): Float32Array {
  const out = new Float32Array(gray.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0
      let count = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          sum += gray[ny * width + nx]
          count++
        }
      }
      out[y * width + x] = sum / count
    }
  }
  return out
}

function toGrayBuffer(data: Uint8ClampedArray): Float32Array {
  const gray = new Float32Array(data.length / 4)
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = luminance(data[i], data[i + 1], data[i + 2])
  }
  return gray
}

function applyStandardTone(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const gray = luminance(data[i], data[i + 1], data[i + 2])
    const boosted = gray < 140 ? Math.max(0, gray * 0.55) : Math.min(255, gray * 1.25)
    data[i] = data[i + 1] = data[i + 2] = boosted
  }
}

function applyEnhancedTone(data: Uint8ClampedArray, width: number, height: number): void {
  const gray = toGrayBuffer(data)
  let min = 255
  let max = 0
  for (const value of gray) {
    if (value < min) min = value
    if (value > max) max = value
  }
  const span = Math.max(1, max - min)
  const blurred = boxBlurGray(gray, width, height)

  for (let p = 0; p < gray.length; p++) {
    const stretched = ((gray[p] - min) / span) * 255
    const sharpened = Math.min(255, Math.max(0, stretched + (gray[p] - blurred[p]) * 1.4))
    const out =
      sharpened >= 235
        ? 255
        : sharpened <= 90
          ? 0
          : Math.round(255 - ((235 - sharpened) / 145) * 255)
    const i = p * 4
    data[i] = data[i + 1] = data[i + 2] = out
  }
}

/** Boost faint gray receipt date text without binarization (avoids Tesseract thin-line errors). */
function applyGrayDateTone(data: Uint8ClampedArray, width: number, height: number): void {
  const gray = toGrayBuffer(data)
  const blurred = boxBlurGray(gray, width, height)

  for (let p = 0; p < gray.length; p++) {
    const g = gray[p]
    const local = blurred[p]
    const contrast = local - g

    let out: number
    if (g >= 248) {
      out = 255
    } else if (g <= 105 || contrast > 18) {
      out = 0
    } else if (g >= 118 && g <= 238) {
      const strength = Math.min(1, (238 - g) / 120 + contrast / 40)
      out = Math.round(255 - strength * 255)
    } else {
      out = g < 175 ? Math.round(g * 0.45) : 255
    }

    const i = p * 4
    data[i] = data[i + 1] = data[i + 2] = out
  }
}

/** Darkens light-gray receipt labels without harsh binarization (avoids Tesseract thin-line errors). */
function applyLightTextTone(data: Uint8ClampedArray, width: number, height: number): void {
  const gray = toGrayBuffer(data)
  const blurred = boxBlurGray(gray, width, height)

  for (let p = 0; p < gray.length; p++) {
    const g = gray[p]
    const local = blurred[p]
    const contrast = local - g

    let out: number
    if (g >= 248) {
      out = 255
    } else if (g <= 88 || contrast > 14) {
      out = 0
    } else if (g >= 110 && g <= 235) {
      const strength = (235 - g) / 125
      out = Math.round(255 - strength * 255)
    } else {
      out = g < 170 ? Math.round(g * 0.35) : 255
    }

    const i = p * 4
    data[i] = data[i + 1] = data[i + 2] = out
  }
}

/** Keeps GCash blue values, dark text, and light-gray receipt labels on white. */
function applyBlueTextIsolation(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const sum = r + g + b

    const isBlueValue = b > r + 24 && b > g + 10 && b > 70 && r < 130
    const isDarkText = sum < 210 && r < 115 && g < 115 && b < 150
    const isLightGrayLabel = r > 125 && r < 215 && g > 120 && g < 215 && b > 115 && b < 220

    const on = isBlueValue || isDarkText || isLightGrayLabel
    data[i] = data[i + 1] = data[i + 2] = on ? 0 : 255
  }
}

function dilateTextStrokes(data: Uint8ClampedArray, width: number, height: number): void {
  const copy = new Uint8ClampedArray(data)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4
      if (copy[i] !== 0) continue
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ni = ((y + dy) * width + (x + dx)) * 4
          if (copy[ni] === 0) {
            data[i] = data[i + 1] = data[i + 2] = 0
            break
          }
        }
      }
    }
  }
}

function applyBinaryTone(data: Uint8ClampedArray): void {
  let sum = 0
  const pixels = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    sum += luminance(data[i], data[i + 1], data[i + 2])
  }
  const mean = sum / pixels
  const threshold = Math.min(185, Math.max(125, mean - 10))

  for (let i = 0; i < data.length; i += 4) {
    const gray = luminance(data[i], data[i + 1], data[i + 2])
    const bit = gray < threshold ? 0 : 255
    data[i] = data[i + 1] = data[i + 2] = bit
  }
}

function applyVariantTone(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  variant: OcrPreprocessVariant,
): void {
  if (variant === 'standard') {
    applyStandardTone(data)
    return
  }
  if (variant === 'enhanced') {
    applyEnhancedTone(data, width, height)
    return
  }
  if (variant === 'dateBand' || variant === 'dateLine') {
    applyGrayDateTone(data, width, height)
    return
  }
  if (variant === 'zoomedFull' || variant === 'zoomedDateRow' || variant === 'zoomedDetails') {
    applyGrayDateTone(data, width, height)
    return
  }
  if (variant === 'lightText') {
    applyLightTextTone(data, width, height)
    return
  }
  if (variant === 'statusBand') {
    applyEnhancedTone(data, width, height)
    return
  }
  if (variant === 'metadataBand') {
    applyLightTextTone(data, width, height)
    return
  }
  if (variant === 'blueText') {
    applyBlueTextIsolation(data)
    dilateTextStrokes(data, width, height)
    return
  }
  if (variant === 'binary') {
    applyLightTextTone(data, width, height)
    applyBinaryTone(data)
  }
}

const MIN_OCR_WIDTH = 200
const MIN_OCR_HEIGHT = 64
const OCR_BORDER_PX = 28

function padCanvasBorder(source: HTMLCanvasElement, borderPx = OCR_BORDER_PX): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = source.width + borderPx * 2
  canvas.height = source.height + borderPx * 2
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return source

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(source, borderPx, borderPx)
  return canvas
}

function finalizeOcrCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const padded = padCanvasBorder(source)
  if (padded.width >= MIN_OCR_WIDTH && padded.height >= MIN_OCR_HEIGHT) {
    return padded
  }

  const scale = Math.max(MIN_OCR_WIDTH / padded.width, MIN_OCR_HEIGHT / padded.height, 1)
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(padded.width * scale)
  canvas.height = Math.ceil(padded.height * scale)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return padded

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(padded, 0, 0, canvas.width, canvas.height)
  return canvas
}

function renderVariant(
  img: HTMLImageElement,
  variant: OcrPreprocessVariant,
  layout: ProofLayoutProfile,
  cropOverride?: CropRect,
): HTMLCanvasElement | null {
  const srcW = img.naturalWidth
  const srcH = img.naturalHeight
  const crop = cropOverride ?? cropRectForVariant(srcW, srcH, variant, layout)
  const cropW = Math.max(1, Math.min(crop.w, srcW - crop.x))
  const cropH = Math.max(1, Math.min(crop.h, srcH - crop.y))
  if (cropW < 80 || cropH < 48) return null

  const scale = scaleForVariant(cropW, variant, layout)

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(MIN_OCR_WIDTH, Math.floor(cropW * scale))
  canvas.height = Math.max(MIN_OCR_HEIGHT, Math.floor(cropH * scale))
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  ctx.imageSmoothingEnabled = variant !== 'binary'
  ctx.drawImage(img, crop.x, crop.y, cropW, cropH, 0, 0, canvas.width, canvas.height)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  applyVariantTone(imageData.data, canvas.width, canvas.height, variant)
  ctx.putImageData(imageData, 0, 0)
  return finalizeOcrCanvas(canvas)
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not preprocess proof image.'))),
      'image/png',
    )
  })
}

function variantsForLayout(layout: ProofLayoutProfile): OcrPreprocessVariant[] {
  if (layout.isZoomedMetadata) {
    return ['zoomedFull', 'zoomedDateRow', 'zoomedDetails', 'enhanced', 'standard']
  }
  return ['standard', 'enhanced', 'statusBand', 'metadataBand', 'dateLine', 'dateBand']
}

/** Crop and boost contrast so OCR reads phone receipt screenshots (including photos of screens). */
export async function preprocessPaymentProofForOcr(
  source: Blob | File | string,
  variant: OcrPreprocessVariant = 'standard',
): Promise<Blob> {
  const img = await loadImage(source)
  const layout = analyzeLayoutFromImage(img)
  const canvas = renderVariant(img, variant, layout)
  if (!canvas) {
    return source instanceof Blob ? source : await fetch(source).then((r) => r.blob())
  }
  return canvasToBlob(canvas)
}

export async function preprocessPaymentProofVariants(
  source: Blob | File | string,
): Promise<Array<{ variant: OcrPreprocessVariant; blob: Blob; layout: ProofLayoutProfile }>> {
  const img = await loadImage(source)
  const layout = analyzeLayoutFromImage(img)
  const variants = variantsForLayout(layout)
  const results: Array<{ variant: OcrPreprocessVariant; blob: Blob; layout: ProofLayoutProfile }> = []

  for (const variant of variants) {
    const canvas = renderVariant(img, variant, layout)
    if (!canvas) continue
    const blob = await canvasToBlob(canvas)
    if (await isOcrReadyBlob(blob)) {
      results.push({ variant, blob, layout })
    }
  }

  return results
}

export async function isOcrReadyBlob(blob: Blob): Promise<boolean> {
  try {
    const bitmap = await createImageBitmap(blob)
    const ready = bitmap.width >= MIN_OCR_WIDTH && bitmap.height >= MIN_OCR_HEIGHT
    bitmap.close()
    return ready
  } catch {
    return false
  }
}
