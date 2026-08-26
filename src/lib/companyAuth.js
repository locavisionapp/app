// Mirrors functions/lib/slug.js#synthesizeEmail exactly: company logins are
// "identifiant entreprise + nom d'utilisateur + mot de passe", not a real
// email. Firebase Auth still needs an email-shaped identity, so both sides
// derive the same deterministic (non-secret) one — no backend round-trip
// needed before signing in.
const SYNTHETIC_EMAIL_DOMAIN = 'accounts.locavision.internal'

export function synthesizeEmail(slug, username) {
  const safeSlug = String(slug || '').toLowerCase().trim()
  const safeUser = String(username || '').toLowerCase().trim().replace(/[^a-z0-9._-]/g, '')
  return `${safeUser}+${safeSlug}@${SYNTHETIC_EMAIL_DOMAIN}`
}
