const { fetchWithTimeout } = require('./fetchWithTimeout')

// Transactional email through Resend (https://resend.com, free tier: 3,000
// emails/month). Optional: without RESEND_API_KEY the app simply hides the
// "send by email" action and users download/share the PDF themselves.
// EMAIL_FROM must use a domain verified in Resend, e.g.
// "LocaVision <rapports@locavision.com>".
const API_KEY = process.env.RESEND_API_KEY
const FROM = process.env.EMAIL_FROM

function emailEnabled() {
  return Boolean(API_KEY && FROM)
}

async function sendEmail({ to, subject, text, attachments = [] }) {
  if (!emailEnabled()) throw new Error('Email provider not configured')
  const res = await fetchWithTimeout(
    'https://api.resend.com/emails',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject, text, attachments }),
    },
    20000
  )
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend error ${res.status}: ${body.slice(0, 200)}`)
  }
}

module.exports = { emailEnabled, sendEmail }
