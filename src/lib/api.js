import { auth } from './firebase'

// Empty base = calls go through the Vite "/v1" proxy (dev) or the same
// domain in prod (the Vercel/Firebase Hosting rewrite forwards /v1/** to
// the API function).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const DEFAULT_TIMEOUT_MS = 30000

class ApiError extends Error {
  constructor(message, status, payload) {
    super(message)
    this.status = status
    this.payload = payload
  }

  /** No response at all (offline, DNS, timeout): worth retrying later, nothing was rejected. */
  get isNetworkError() {
    return this.status === 0
  }

  /** Server-side hiccup or throttling: retryable as-is. 4xx are final for the same request. */
  get isRetryable() {
    return this.status === 0 || this.status === 408 || this.status === 429 || this.status >= 500
  }
}

async function authHeader() {
  const user = auth.currentUser
  if (!user) return {}
  const token = await user.getIdToken()
  return { Authorization: `Bearer ${token}` }
}

async function request(path, { method = 'GET', body, headers, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let res
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(await authHeader()),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch (e) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    throw new ApiError(
      offline
        ? 'Pas de connexion internet.'
        : e.name === 'AbortError'
          ? 'Le serveur met trop de temps à répondre. Réessayez.'
          : 'Impossible de joindre le serveur. Vérifiez votre connexion.',
      0
    )
  } finally {
    clearTimeout(timer)
  }

  const contentType = res.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await res.json().catch(() => null) : null

  if (!res.ok) {
    const fallback = res.status === 413 ? 'Envoi trop volumineux.' : `Erreur serveur (${res.status}). Réessayez.`
    throw new ApiError(data?.error || fallback, res.status, data)
  }
  return { data, headers: res.headers }
}

export async function apiFetch(path, options) {
  return (await request(path, options)).data
}

/** Paginated list endpoints: body is the page, X-Next-Cursor (if any) points at the next one. */
async function apiFetchPage(path, options) {
  const { data, headers } = await request(path, options)
  return { items: data || [], nextCursor: headers.get('X-Next-Cursor') }
}

function toQueryString(params) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''))
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const api = {
  me: () => apiFetch('/v1/me', { timeoutMs: 15000 }),

  // The plate pipeline chains OCR -> registry lookup -> AI fallback.
  scanPlate: (imageBase64) => apiFetch('/v1/scan-plate', { method: 'POST', body: { image: imageBase64 }, timeoutMs: 65000 }),

  // Typed plate -> registry lookup (or the existing fleet vehicle).
  lookupPlate: (licensePlate) => apiFetch('/v1/lookup-plate', { method: 'POST', body: { licensePlate }, timeoutMs: 45000 }),

  listVehicles:(filters = {}) => apiFetchPage(`/v1/vehicles${toQueryString(filters)}`),
  createVehicle: (vehicle) => apiFetch('/v1/vehicles', { method: 'POST', body: vehicle, timeoutMs: 45000 }),
  getVehicle: (id) => apiFetch(`/v1/vehicles/${id}`),
  deleteVehicle: (id) => apiFetch(`/v1/vehicles/${id}`, { method: 'DELETE' }),
  updateVehiclePricing: (id, pricing) => apiFetch(`/v1/vehicles/${id}/pricing`, { method: 'PUT', body: pricing }),
  updateVehicleAgency: (id, agencyId) => apiFetch(`/v1/vehicles/${id}/agency`, { method: 'PUT', body: { agencyId } }),
  updateVehicleMileage: (id, mileage) => apiFetch(`/v1/vehicles/${id}/mileage`, { method: 'PUT', body: { mileage } }),

  listInspections: (vehicleId, params = {}) => apiFetchPage(`/v1/vehicles/${vehicleId}/inspections${toQueryString(params)}`),
  getInspection: (vehicleId, inspectionId) => apiFetch(`/v1/vehicles/${vehicleId}/inspections/${inspectionId}`),
  // One photo per request (stays far below the serverless body limit);
  // `validate` runs the AI framing check on the same upload.
  uploadInspectionPhoto: (vehicleId, inspectionId, payload) =>
    apiFetch(`/v1/vehicles/${vehicleId}/inspections/${inspectionId}/photos`, { method: 'POST', body: payload, timeoutMs: 45000 }),
  // Human validation of the new defects: acceptedIds = confirmed real ones.
  reviewInspection: (vehicleId, inspectionId, acceptedIds) =>
    apiFetch(`/v1/vehicles/${vehicleId}/inspections/${inspectionId}/review`, { method: 'POST', body: { acceptedIds } }),
  updateDamageStatus: (vehicleId, damageId, status) =>
    apiFetch(`/v1/vehicles/${vehicleId}/damages/${damageId}`, { method: 'PUT', body: { status } }),
  // Runs the AI analysis on already-uploaded photos. Idempotent on inspectionId.
  submitInspection: (vehicleId, payload) =>
    apiFetch(`/v1/vehicles/${vehicleId}/inspections`, { method: 'POST', body: payload, timeoutMs: 130000 }),

  // Company agencies (branches/locations)
  listAgencies: () => apiFetch('/v1/agencies'),
  createAgency: (agency) => apiFetch('/v1/agencies', { method: 'POST', body: agency }),
  updateAgency: (id, agency) => apiFetch(`/v1/agencies/${id}`, { method: 'PUT', body: agency }),
  deleteAgency: (id) => apiFetch(`/v1/agencies/${id}`, { method: 'DELETE' }),

  // Company employees (usernames/passwords managed by the company itself)
  listEmployees: () => apiFetch('/v1/employees'),
  createEmployee: (employee) => apiFetch('/v1/employees', { method: 'POST', body: employee }),
  updateEmployee: (uid, updates) => apiFetch(`/v1/employees/${uid}`, { method: 'PUT', body: updates }),
  resetEmployeePassword: (uid) => apiFetch(`/v1/employees/${uid}/reset-password`, { method: 'POST' }),
  deleteEmployee: (uid) => apiFetch(`/v1/employees/${uid}`, { method: 'DELETE' }),

  // Self-service company account (API key, usage, license, webhook, quotes)
  getMyCompany: () => apiFetch('/v1/company'),
  regenerateMyApiKey: () => apiFetch('/v1/company/regenerate-key', { method: 'POST' }),
  updateMyWebhook: (webhookUrl) => apiFetch('/v1/company/webhook', { method: 'PUT', body: { webhookUrl } }),
  getMyQuotes: () => apiFetch('/v1/company/quotes'),

  // Platform admin
  listCompanies: () => apiFetch('/v1/companies'),
  createCompany: (company) => apiFetch('/v1/companies', { method: 'POST', body: company }),
  updateCompanyStatus: (id, status) => apiFetch(`/v1/companies/${id}/status`, { method: 'PUT', body: { status } }),
  updateCompanyModules: (id, enabledModules) => apiFetch(`/v1/companies/${id}/modules`, { method: 'PUT', body: { enabledModules } }),
  regenerateCompanyApiKey: (id) => apiFetch(`/v1/companies/${id}/regenerate-key`, { method: 'POST' }),
  deleteCompany: (id) => apiFetch(`/v1/companies/${id}`, { method: 'DELETE', timeoutMs: 60000 }),
  listCompanyQuotes: (id) => apiFetch(`/v1/companies/${id}/quotes`),
  createCompanyQuote: (id, quote) => apiFetch(`/v1/companies/${id}/quotes`, { method: 'POST', body: quote }),
  markQuotePaid: (id, quoteId, payment) => apiFetch(`/v1/companies/${id}/quotes/${quoteId}/mark-paid`, { method: 'PUT', body: payment }),
  getUsage: (range = '30d') => apiFetch(`/v1/usage?range=${range}`),
}

export { ApiError }
