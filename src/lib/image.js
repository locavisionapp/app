// Camera frames come out at the sensor's native resolution (often 1920px+
// on phones, up to 4K) and canvas.toDataURL at that size weighs 0.3-1MB+ per
// photo. Damage detection doesn't need more than ~1600px on the long side,
// so every capture is downscaled before it leaves the device: ~150-400KB per
// photo, faster uploads on 4G, and no request ever near the 4.5MB
// serverless body limit.
export const INSPECTION_PHOTO = { maxSide: 1600, quality: 0.8 }
export const PLATE_PHOTO = { maxSide: 1280, quality: 0.85 }

/** Draws `source` (video/image/canvas) downscaled to `maxSide` and returns a JPEG data URL. */
export function captureJpeg(source, canvas, { maxSide, quality }) {
  const srcW = source.videoWidth || source.naturalWidth || source.width
  const srcH = source.videoHeight || source.naturalHeight || source.height
  if (!srcW || !srcH) return null
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH))
  canvas.width = Math.round(srcW * scale)
  canvas.height = Math.round(srcH * scale)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}
