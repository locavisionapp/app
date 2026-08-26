const COMBINING_DIACRITICS = new RegExp('[̀-ͯ]', 'g')

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '') // strip accents (é -> e, etc.)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function synthesizeEmail(slug, username, domain) {
  const safeUser = String(username || '').toLowerCase().replace(/[^a-z0-9._-]/g, '')
  return `${safeUser}+${slug}@${domain}`
}

module.exports = { slugify, synthesizeEmail }
