const crypto = require('crypto')
const { db } = require('./db')
const { fetchWithTimeout } = require('./fetchWithTimeout')

/**
 * Real-time sync for connected CRMs: POSTs an event to the company's
 * configured webhook URL, HMAC-signed so the receiver can verify it really
 * came from LocaVision. Fire-and-forget — a slow or broken receiver must
 * never affect the request that triggered the event.
 */
async function dispatchWebhook(companyId, event, data) {
  try {
    const companyDoc = await db.collection('companies').doc(companyId).get()
    const { webhookUrl, webhookSecret } = companyDoc.data() || {}
    if (!webhookUrl) return

    const payload = JSON.stringify({ event, companyId, data, sentAt: Date.now() })
    const signature = crypto.createHmac('sha256', webhookSecret || '').update(payload).digest('hex')

    await fetchWithTimeout(
      webhookUrl,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-LocaVision-Signature': signature }, body: payload },
      8000
    )
  } catch (e) {
    console.warn(`[webhooks] delivery failed for company ${companyId}, event ${event}:`, e.message)
  }
}

module.exports = { dispatchWebhook }
