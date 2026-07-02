import type { PaymentProofProvider } from '../config/paymentProofProviders'

type Rgb = { r: number; g: number; b: number }

function loadImage(source: Blob | File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load proof image.'))
    if (typeof source === 'string') {
      img.crossOrigin = 'anonymous'
      img.src = source
    } else {
      img.src = URL.createObjectURL(source)
      img.onload = () => {
        URL.revokeObjectURL(img.src)
        resolve(img)
      }
    }
  })
}

function isNeutral(rgb: Rgb): boolean {
  const { r, g, b } = rgb
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max - min < 18 && max > 210) return true
  if (max < 40) return true
  return false
}

function classifyPixel(rgb: Rgb): PaymentProofProvider | null {
  const { r, g, b } = rgb
  if (isNeutral(rgb)) return null

  if (b > r + 35 && b > g + 20 && b > 90) return 'gcash'
  if (r > 190 && g > 110 && b < 100 && r > g + 40) return 'unionbank'
  if (g > r + 25 && g > b + 25 && g > 80) return 'maya'
  return null
}

/** Brand-color hint from receipt screenshot when OCR text has no provider name. */
export async function detectPaymentProviderFromImage(
  source: Blob | File | string,
): Promise<PaymentProofProvider | null> {
  if (typeof source === 'string' && source.toLowerCase().endsWith('.pdf')) return null

  try {
    const img = await loadImage(source)
    const canvas = document.createElement('canvas')
    const width = Math.min(img.naturalWidth, 480)
    const height = Math.min(img.naturalHeight, 960)
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(img, 0, 0, width, height)
    const scores: Record<PaymentProofProvider, number> = {
      gcash: 0,
      maya: 0,
      unionbank: 0,
      bancnet: 0,
      grabpay: 0,
      unknown: 0,
    }

    const bands = [
      { y0: 0, y1: 0.22 },
      { y0: 0.78, y1: 1 },
    ]

    for (const band of bands) {
      const startY = Math.floor(height * band.y0)
      const endY = Math.floor(height * band.y1)
      const imageData = ctx.getImageData(0, startY, width, endY - startY)
      for (let i = 0; i < imageData.data.length; i += 16) {
        const rgb = {
          r: imageData.data[i],
          g: imageData.data[i + 1],
          b: imageData.data[i + 2],
        }
        const hit = classifyPixel(rgb)
        if (hit) scores[hit] += 1
      }
    }

    const ranked = (Object.entries(scores) as [PaymentProofProvider, number][])
      .filter(([key]) => key !== 'unknown')
      .sort((a, b) => b[1] - a[1])

    if (!ranked.length || ranked[0][1] < 12) return null
    return ranked[0][0]
  } catch {
    return null
  }
}
