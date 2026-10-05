/**
 * Live formatting of a plate typed by hand: the user types letters and
 * digits only, dashes are inserted automatically for the current French
 * format (AB-123-CD). Anything that doesn't follow that format (old
 * "1234 AB 75" plates, foreign plates) is left as typed, upper-cased.
 * Mirrors functions/lib/plate.js#normalizePlate, which has the final say.
 */
export function formatPlateInput(value) {
  let compact = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  // A complete AB-123-CD plate is 7 characters: ignore extra keystrokes.
  if (/^[A-Z]{2}\d{3}[A-Z]{2}./.test(compact)) compact = compact.slice(0, 7)
  if (/^[A-Z]{0,2}$/.test(compact) || /^[A-Z]{2}\d{1,3}$/.test(compact) || /^[A-Z]{2}\d{3}[A-Z]{1,2}$/.test(compact)) {
    return [compact.slice(0, 2), compact.slice(2, 5), compact.slice(5, 7)].filter(Boolean).join('-')
  }
  return String(value || '').toUpperCase().replace(/\s+/g, ' ').slice(0, 20)
}

/** True once a plate looks complete enough to look up (full SIV plate, or 4+ characters for other formats). */
export function isPlateComplete(value) {
  const compact = String(value || '').replace(/[^A-Za-z0-9]/g, '')
  return /^[A-Z]{2}\d{3}[A-Z]{2}$/i.test(compact) || (!/^[A-Z]{2}\d{0,3}[A-Z]{0,1}$/i.test(compact) && compact.length >= 4)
}
