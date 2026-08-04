import jsQR from 'jsqr'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'

const VERIFY_PATH_RE = /\/verify\/cro-edo\/([^/?#]+)/i

let pdfWorkerConfigured = false

function ensurePdfWorker() {
  if (pdfWorkerConfigured) return
  // Vite-friendly worker URL bundled with pdfjs-dist.
  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()
  pdfWorkerConfigured = true
}

/** Extract the opaque verify token from a pasted URL or raw token. */
export function extractCroEdoTokenFromText(raw: string): string | null {
  const text = raw.trim()
  if (!text) return null

  const fromUrl = text.match(VERIFY_PATH_RE)
  if (fromUrl?.[1]) {
    try {
      return decodeURIComponent(fromUrl[1]).trim()
    } catch {
      return fromUrl[1].trim()
    }
  }

  // Opaque Base64URL token from CertificateVerificationTokens (43–48 chars).
  if (/^[A-Za-z0-9_-]{40,64}$/.test(text)) return text
  return null
}

function decodeQrFromImageData(imageData: ImageData): string | null {
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  })
  return code?.data?.trim() || null
}

async function loadImageElement(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Could not load image.'))
      img.src = url
    })
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function canvasImageDataFromImage(img: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas')
  const maxEdge = 1600
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight))
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas is not available in this browser.')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

async function decodeQrFromImageFile(file: File): Promise<string | null> {
  const img = await loadImageElement(file)
  return decodeQrFromImageData(canvasImageDataFromImage(img))
}

async function decodeQrFromPdfFile(file: File): Promise<string | null> {
  ensurePdfWorker()
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await getDocument({ data }).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 2.5 })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas is not available in this browser.')

  await page.render({ canvasContext: ctx, viewport, canvas }).promise
  return decodeQrFromImageData(ctx.getImageData(0, 0, canvas.width, canvas.height))
}

/** Decode a CRO/eDO verification token from an uploaded image or PDF. */
export async function extractCroEdoTokenFromFile(file: File): Promise<string | null> {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()

  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    const payload = await decodeQrFromPdfFile(file)
    return payload ? extractCroEdoTokenFromText(payload) : null
  }

  if (
    type.startsWith('image/') ||
    /\.(png|jpe?g|webp)$/i.test(name)
  ) {
    const payload = await decodeQrFromImageFile(file)
    return payload ? extractCroEdoTokenFromText(payload) : null
  }

  throw new Error('Upload a CRO/eDO image (JPG, PNG, WEBP) or PDF.')
}
