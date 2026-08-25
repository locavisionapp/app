const { storage } = require('./db')
const { randomUUID } = require('crypto')

const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10MB per photo

/** Uploads a base64 image to Storage and returns its public URL. */
async function uploadInspectionPhoto(companyId, vehicleId, inspectionId, stepId, imageBase64) {
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64
  const buffer = Buffer.from(base64Data, 'base64')
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    throw new Error(`Invalid photo size: ${buffer.length} bytes`)
  }

  const bucket = storage.bucket()
  const safeStepId = (stepId || randomUUID()).replace(/[^a-zA-Z0-9_-]/g, '_')
  const path = `companies/${companyId}/vehicles/${vehicleId}/inspections/${inspectionId}/${safeStepId}.jpg`
  const file = bucket.file(path)
  await file.save(buffer, { metadata: { contentType: 'image/jpeg' }, public: true })
  return `https://storage.googleapis.com/${bucket.name}/${path}`
}

module.exports = { uploadInspectionPhoto }
