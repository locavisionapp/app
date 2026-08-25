// A hung third-party API (Gemini, PlateRecognizer, RapidAPI) must not hang
// our function indefinitely — cap every outbound call and fail fast.
async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

module.exports = { fetchWithTimeout }
