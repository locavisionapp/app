// Estimated cost per API call, used only to give the platform admin a rough
// margin estimate (usage dashboard) — not real billing data. Override via
// env var once real per-provider costs are known.
const API_COST_PER_CALL_EUR = Number(process.env.API_COST_PER_CALL_EUR) || 0.01

// Feature modules a company account can be granted/denied access to.
const MODULES = ['scan', 'fleet', 'agencies', 'api']

// Company logins are "slug + username + password", not a real email —
// Firebase Auth still requires an email-shaped identity internally, so we
// synthesize one from the company slug + username. It's never used to send
// mail (there's nowhere to route it) — only as an opaque Firebase Auth key.
const SYNTHETIC_EMAIL_DOMAIN = 'accounts.locavision.internal'

module.exports = { API_COST_PER_CALL_EUR, MODULES, SYNTHETIC_EMAIL_DOMAIN }
