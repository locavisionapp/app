// Camera frames come out at the sensor's native resolution (often 1920px+
// on phones, up to 4K) and canvas.toDataURL at that size weighs 0.3-1MB+ per
// photo. Damage detection doesn't need more than ~1600px on the long side,
// so every capture is downscaled before it leaves the device: ~150-400KB per
// photo, faster uploads on 4G, and no request ever near the 4.5MB
// serverless body limit.
export const INSPECTION_PHOTO = { maxSide: 1600, quality: 0.8 }
export const PLATE_PHOTO = { maxSide: 1280, quality: 0.85 }

// The server stores each photo in a single record capped at 900KB; stay
// safely under it. Very detailed scenes (gravel, foliage) can exceed it at
// the default quality, so those get re-encoded smaller.
const MAX_PHOTO_BYTES = 800 * 1024
const FALLBACKS = [
  { scale: 1, quality: 0.65 },
  { scale: 0.8, quality: 0.6 },
  { scale: 0.6, quality: 0.55 },
]

function dataUrlBytes(dataUrl) {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  return Math.floor((base64.length * 3) / 4)
}

function encode(source, canvas, srcW, srcH, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH))
  canvas.width = Math.round(srcW * scale)
  canvas.height = Math.round(srcH * scale)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

/** Draws `source` (video/image/canvas) downscaled to `maxSide` and returns a JPEG data URL under MAX_PHOTO_BYTES. */
export function captureJpeg(source, canvas, { maxSide, quality }) {
  const srcW = source.videoWidth || source.naturalWidth || source.width
  const srcH = source.videoHeight || source.naturalHeight || source.height
  if (!srcW || !srcH) return null
  let dataUrl = encode(source, canvas, srcW, srcH, maxSide, quality)
  for (const f of FALLBACKS) {
    if (dataUrlBytes(dataUrl) <= MAX_PHOTO_BYTES) break
    dataUrl = encode(source, canvas, srcW, srcH, Math.round(maxSide * f.scale), f.quality)
  }
  return dataUrl
}

// Quick walk-around frames: slightly lighter than guided shots, since there
// are 25-45 of them and they overlap.
export const TOUR_PHOTO = { maxSide: 1280, quality: 0.78 }

const PROBE_W = 160
const THUMB_W = 32

/**
 * Cheap per-frame probe for the walk-around: a sharpness score (variance of
 * the Laplacian on a 160px grayscale copy — low = motion blur / out of
 * focus) and a 32px grayscale thumbnail to tell whether the camera actually
 * moved since the last kept frame. Runs in a few ms on a phone.
 */
export function probeFrame(source, canvas) {
  const srcW = source.videoWidth || source.width
  const srcH = source.videoHeight || source.height
  if (!srcW || !srcH) return null
  const w = PROBE_W
  const h = Math.max(1, Math.round((srcH / srcW) * PROBE_W))
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(source, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)
  const gray = new Float32Array(w * h)
  for (let i = 0; i < w * h; i += 1) gray[i] = data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114

  let sum = 0
  let sumSq = 0
  let n = 0
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = y * w + x
      const lap = gray[i - w] + gray[i + w] + gray[i - 1] + gray[i + 1] - 4 * gray[i]
      sum += lap
      sumSq += lap * lap
      n += 1
    }
  }
  const mean = sum / n
  const sharpness = sumSq / n - mean * mean

  const th = Math.max(1, Math.round((h / w) * THUMB_W))
  const thumb = new Float32Array(THUMB_W * th)
  for (let ty = 0; ty < th; ty += 1) {
    for (let tx = 0; tx < THUMB_W; tx += 1) {
      thumb[ty * THUMB_W + tx] = gray[Math.floor((ty * h) / th) * w + Math.floor((tx * w) / THUMB_W)]
    }
  }
  return { sharpness, thumb }
}

/** Mean absolute difference (0-255) between two probe thumbnails. */
export function thumbDistance(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity
  let d = 0
  for (let i = 0; i < a.length; i += 1) d += Math.abs(a[i] - b[i])
  return d / a.length
}

// Thumbnails (768px, the largest size that still fits in a single image
// tile for the AI model): used for framing checks, as comparison references
// and in galleries — a fraction of the cost and bandwidth of full photos.
export const THUMB = { maxSide: 768, quality: 0.7 }

/** Builds a thumbnail JPEG data URL from a full-size JPEG data URL. */
export async function makeThumb(dataUrl, { maxSide, quality } = THUMB) {
  const img = new Image()
  img.src = dataUrl
  await img.decode()
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}
