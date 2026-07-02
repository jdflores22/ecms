export type ProofImageLayout = 'fullReceipt' | 'zoomedMetadata' | 'photoOfScreen'

export type ProofLayoutProfile = {
  layout: ProofImageLayout
  width: number
  height: number
  aspectRatio: number
  isZoomedMetadata: boolean
  isPhotoOfScreen: boolean
  isFullReceipt: boolean
  hasStatusBar: boolean
  hasGcashBlueValues: boolean
}

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

function sampleLayoutSignals(img: HTMLImageElement): {
  hasStatusBar: boolean
  hasGcashBlueValues: boolean
  topHasTotalLikeHeader: boolean
} {
  const sampleW = Math.min(360, img.naturalWidth)
  const sampleH = Math.min(360, img.naturalHeight)
  const canvas = document.createElement('canvas')
  canvas.width = sampleW
  canvas.height = sampleH
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    return { hasStatusBar: false, hasGcashBlueValues: false, topHasTotalLikeHeader: false }
  }

  ctx.drawImage(img, 0, 0, sampleW, sampleH)
  const { data } = ctx.getImageData(0, 0, sampleW, sampleH)

  let topDark = 0
  let topPixels = 0
  let topContrast = 0
  let blueValues = 0
  let lowerPixels = 0
  const topEnd = Math.floor(sampleH * 0.14)
  const lowerStart = Math.floor(sampleH * 0.28)

  for (let y = 0; y < sampleH; y++) {
    for (let x = 0; x < sampleW; x++) {
      const i = (y * sampleW + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const lum = 0.299 * r + 0.587 * g + 0.114 * b

      if (y < topEnd) {
        topPixels++
        if (lum < 72) topDark++
        if (lum < 150 && b > r + 8) topContrast++
      }

      if (y >= lowerStart) {
        lowerPixels++
        if (b > r + 22 && b > g + 8 && b > 78 && r < 135) blueValues++
      }
    }
  }

  const hasStatusBar = topPixels > 0 && topDark / topPixels > 0.055
  const hasGcashBlueValues = lowerPixels > 0 && blueValues / lowerPixels > 0.008
  const topHasTotalLikeHeader = topPixels > 0 && topContrast / topPixels > 0.02

  return { hasStatusBar, hasGcashBlueValues, topHasTotalLikeHeader }
}

export function classifyProofImageLayout(
  width: number,
  height: number,
  signals: ReturnType<typeof sampleLayoutSignals>,
): ProofLayoutProfile {
  const aspectRatio = width / Math.max(1, height)
  const area = width * height
  const isPhotoOfScreen = width > 900 && height > 700 && area > 750_000

  const isZoomedMetadata =
    !isPhotoOfScreen &&
    height < 920 &&
    width < 1600 &&
    signals.hasGcashBlueValues &&
    !signals.hasStatusBar &&
    (signals.topHasTotalLikeHeader || height < 720 || aspectRatio > 0.72)

  const layout: ProofImageLayout = isZoomedMetadata
    ? 'zoomedMetadata'
    : isPhotoOfScreen
      ? 'photoOfScreen'
      : 'fullReceipt'

  return {
    layout,
    width,
    height,
    aspectRatio,
    isZoomedMetadata,
    isPhotoOfScreen,
    isFullReceipt: layout === 'fullReceipt',
    hasStatusBar: signals.hasStatusBar,
    hasGcashBlueValues: signals.hasGcashBlueValues,
  }
}

export async function analyzeProofImageLayout(
  source: Blob | File | string,
): Promise<ProofLayoutProfile> {
  const img = await loadImage(source)
  return analyzeLayoutFromImage(img)
}

export function analyzeLayoutFromImage(img: HTMLImageElement): ProofLayoutProfile {
  const signals = sampleLayoutSignals(img)
  return classifyProofImageLayout(img.naturalWidth, img.naturalHeight, signals)
}
