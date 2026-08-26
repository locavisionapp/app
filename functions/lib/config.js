// Estimated cost per API call, used only to give the platform admin a rough
// margin estimate (usage dashboard) — not real billing data. Override via
// env var once real per-provider costs are known.
const API_COST_PER_CALL_EUR = Number(process.env.API_COST_PER_CALL_EUR) || 0.01

module.exports = { API_COST_PER_CALL_EUR }
