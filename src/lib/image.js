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
