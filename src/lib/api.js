import { auth } from './firebase'

// Base vide = les appels passent par le proxy Vite "/v1" (dev) ou par le même
// domaine en prod (Firebase Hosting réécrit /v1/** vers les Cloud Functions).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

class ApiError extends Error {
  constructor(message, status, payload) {
    super(message)
    this.status = status
    this.payload = payload
  }
}

async function authHeader() {
  const user = auth.currentUser
  if (!user) return {}
  const token = await user.getIdToken()
  return { Authorization: `Bearer ${token}` }
}

export async function apiFetch(path, { method = 'GET', body, headers } = {}) {
  const isFormLike = body instanceof FormData
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(isFormLike ? {} : { 'Content-Type': 'application/json' }),
      ...(await authHeader()),
      ...headers,
    },
    body: body ? (isFormLike ? body : JSON.stringify(body)) : undefined,
  })

  const contentType = res.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await res.json().catch(() => null) : null

  if (!res.ok) {
    throw new ApiError(data?.error || `Erreur API (${res.status})`, res.status, data)
  }
  return data
}

export const api = {
  me: () => apiFetch('/v1/me'),

  scanPlate: (imageBase64) => apiFetch('/v1/scan-plate', { method: 'POST', body: { image: imageBase64 } }),

  listVehicles: () => apiFetch('/v1/vehicles'),
  createVehicle: (vehicle) => apiFetch('/v1/vehicles', { method: 'POST', body: vehicle }),
  getVehicle: (id) => apiFetch(`/v1/vehicles/${id}`),
  updateVehiclePricing: (id, pricing) => apiFetch(`/v1/vehicles/${id}/pricing`, { method: 'PUT', body: pricing }),

  listInspections: (vehicleId) => apiFetch(`/v1/vehicles/${vehicleId}/inspections`),
  validateCaptureStep: (vehicleId, payload) => apiFetch(`/v1/vehicles/${vehicleId}/inspections/validate-step`, { method: 'POST', body: payload }),
  submitInspection: (vehicleId, payload) => apiFetch(`/v1/vehicles/${vehicleId}/inspections`, { method: 'POST', body: payload }),

  // Admin plateforme
  listCompanies: () => apiFetch('/v1/companies'),
  createCompany: (company) => apiFetch('/v1/companies', { method: 'POST', body: company }),
  getUsage: (range = '30d') => apiFetch(`/v1/usage?range=${range}`),
}

export { ApiError }
