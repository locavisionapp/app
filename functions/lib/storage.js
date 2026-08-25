const { storage } = require('./db')
const { randomUUID } = require('crypto')

/** Envoie une image base64 dans Storage et renvoie son URL publique. */
async function uploadInspectionPhoto(companyId, vehicleId, inspectionId, stepId, imageBase64) {
  const bucket = storage.bucket()
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64
  const buffer = Buffer.from(base64Data, 'base64')
  const path = `companies/${companyId}/vehicles/${vehicleId}/inspections/${inspectionId}/${stepId || randomUUID()}.jpg`
  const file = bucket.file(path)
  await file.save(buffer, { metadata: { contentType: 'image/jpeg' }, public: true })
  return `https://storage.googleapis.com/${bucket.name}/${path}`
}

module.exports = { uploadInspectionPhoto }
