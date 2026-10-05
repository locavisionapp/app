const PDFDocument = require('pdfkit')

const M = 45
const C = { text: '#0f172a', muted: '#64748b', line: '#e2e8f0', brand: '#1d4ed8', head: '#eff6ff' }

// fr-FR number formatting uses narrow/no-break spaces (1 234,56), which the
// built-in PDF fonts can't render: map them to plain spaces on every text call.
function sanitizeText(doc) {
  const text = doc.text.bind(doc)
  doc.text = (value, ...rest) => text(typeof value === 'string' ? value.replace(/[  ]/g, ' ') : value, ...rest)
  return doc
}

const eur = (n) => `${Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
const day = (ms) => (ms ? new Date(ms).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }) : '—')

/** Lines of a quote — quotes created before the pricing engine only had a yearly amount. */
function quoteLines(quote) {
  if (Array.isArray(quote.lines) && quote.lines.length) return quote.lines
  return [{ label: 'Licence annuelle LocaVision', qty: 1, unit: 'an', unitPrice: quote.amount || 0, total: quote.amount || 0 }]
}

/**
 * Quote (devis) or, once paid, paid invoice (facture acquittée) as a PDF,
 * with the mentions French B2B invoices require.
 */
async function buildQuotePdf({ quote, company, seller }) {
  const isInvoice = quote.status === 'paid' && quote.invoiceNumber
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true, info: { Title: `${isInvoice ? 'Facture' : 'Devis'} ${isInvoice ? quote.invoiceNumber : quote.number || ''}`, Author: seller.name } })
  sanitizeText(doc)
  const chunks = []
  doc.on('data', (c) => chunks.push(c))
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))))
  const W = doc.page.width - M * 2

  const lines = quoteLines(quote)
  const totalHT = quote.totalHT ?? quote.amount ?? 0
  const vatRate = quote.vatRate ?? (seller.vatExempt ? 0 : 0.2)
  const vat = quote.vat ?? Math.round(totalHT * vatRate * 100) / 100
  const totalTTC = quote.totalTTC ?? totalHT + vat

  // ---- seller (left) / document (right) ----
  doc.font('Helvetica-Bold').fontSize(16).fillColor(C.brand).text(seller.name || 'LocaVision', M, M)
  doc.font('Helvetica').fontSize(8.5).fillColor(C.muted)
  ;[seller.legalForm, seller.address, seller.siret && `SIRET ${seller.siret}`, seller.vatNumber && `TVA ${seller.vatNumber}`, seller.email, seller.phone]
    .filter(Boolean)
    .forEach((l) => doc.text(l, { width: W / 2 }))

  const rightX = M + W / 2
  doc.font('Helvetica-Bold').fontSize(20).fillColor(C.text).text(isInvoice ? 'FACTURE' : 'DEVIS', rightX, M, { width: W / 2, align: 'right' })
  doc.font('Helvetica').fontSize(9).fillColor(C.text)
  const meta = isInvoice
    ? [`N° ${quote.invoiceNumber}`, `Date : ${day(quote.invoicedAt || quote.paidAt)}`, quote.number ? `Devis d'origine : ${quote.number}` : null]
    : [`N° ${quote.number || '—'}`, `Date : ${day(quote.createdAt)}`, `Valable jusqu'au : ${day(quote.validUntil)}`]
  meta.filter(Boolean).forEach((l) => doc.text(l, rightX, doc.y, { width: W / 2, align: 'right' }))

  // ---- customer ----
  const y0 = Math.max(doc.y, 118) + 10
  doc.roundedRect(rightX, y0, W / 2, 78, 6).fillAndStroke('#f8fafc', C.line)
  doc.fillColor(C.muted).fontSize(8).text('Client', rightX + 10, y0 + 8)
  const customer = quote.customer || {}
  doc.fillColor(C.text).font('Helvetica-Bold').fontSize(10).text(customer.name || company.name || '', rightX + 10, y0 + 20, { width: W / 2 - 20 })
  doc.font('Helvetica').fontSize(8.5)
  ;[customer.address, customer.vatNumber && `TVA ${customer.vatNumber}`, customer.email || company.contactEmail].filter(Boolean).forEach((l) => doc.text(l, rightX + 10, doc.y, { width: W / 2 - 20 }))

  // ---- lines table ----
  let y = y0 + 92
  const cols = [
    { label: 'Désignation', w: W * 0.5, align: 'left' },
    { label: 'Qté', w: W * 0.1, align: 'right' },
    { label: 'Prix unitaire HT', w: W * 0.2, align: 'right' },
    { label: 'Total HT', w: W * 0.2, align: 'right' },
  ]
  const row = (cells, opts = {}) => {
    let x = M
    const heights = cells.map((cell, i) => doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size || 9).heightOfString(String(cell), { width: cols[i].w - 10 }))
    const h = Math.max(...heights) + 10
    if (y + h > doc.page.height - M - 120) {
      doc.addPage()
      y = M
    }
    if (opts.fill) doc.rect(M, y, W, h).fill(opts.fill)
    cells.forEach((cell, i) => {
      doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size || 9).fillColor(opts.color || C.text).text(String(cell), x + 5, y + 5, { width: cols[i].w - 10, align: cols[i].align })
      x += cols[i].w
    })
    y += h
    doc.moveTo(M, y).lineTo(M + W, y).strokeColor(C.line).stroke()
  }
  row(cols.map((c) => c.label), { bold: true, fill: C.head, size: 8.5 })
  for (const l of lines) {
    row([l.label, l.unit === 'inclus' ? '' : l.qty, l.unit === 'inclus' ? 'Inclus' : eur(l.unitPrice), l.unit === 'inclus' ? '' : eur(l.total ?? l.qty * l.unitPrice)])
  }
  for (const d of quote.discounts || []) row([d.label, '', '', eur(d.amount)], { color: '#16a34a' })

  // ---- totals ----
  y += 10
  const tx = M + W * 0.55
  const tw = W * 0.45
  const total = (label, value, bold) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9.5).fillColor(C.text)
    doc.text(label, tx, y, { width: tw * 0.6 })
    doc.text(value, tx + tw * 0.6, y, { width: tw * 0.4, align: 'right' })
    y += bold ? 18 : 15
  }
  total('Total HT', eur(totalHT))
  total(vatRate ? `TVA ${Math.round(vatRate * 1000) / 10} %` : 'TVA', vatRate ? eur(vat) : 'Non applicable')
  doc.moveTo(tx, y).lineTo(tx + tw, y).strokeColor(C.text).stroke()
  y += 5
  total(isInvoice ? 'Total TTC acquitté' : 'Total TTC', eur(totalTTC), true)
  if (!vatRate && seller.vatExempt) {
    doc.font('Helvetica').fontSize(8).fillColor(C.muted).text('TVA non applicable, art. 293 B du CGI.', tx, y, { width: tw, align: 'right' })
    y += 12
  }

  // ---- terms ----
  y += 18
  doc.x = M
  doc.y = y
  const terms = []
  if (isInvoice) {
    terms.push(`Facture acquittée le ${day(quote.paidAt)} par virement${quote.paymentReference ? ` (réf. ${quote.paymentReference})` : ''}.`)
    terms.push(`Licence valable du ${day(quote.paidAt)} au ${day(quote.paidAt + 365 * 24 * 3600 * 1000)}.`)
  } else {
    terms.push(`Licence annuelle, payable par virement à ${seller.paymentTermsDays || 30} jours à réception de la facture.${quote.input?.commitmentYears > 1 ? ` Engagement de ${quote.input.commitmentYears} ans, facturation annuelle, prix garantis pendant toute la durée de l'engagement.` : ''}`)
    terms.push("Inspections IA illimitées dans la limite d'un usage raisonnable indiqué ci-dessus ; nombre de véhicules suivis dans la limite de la tolérance de flotte.")
    if (seller.iban) terms.push(`IBAN : ${seller.iban}${seller.bic ? ` — BIC : ${seller.bic}` : ''}`)
  }
  terms.push("En cas de retard de paiement : pénalités au taux de 3 fois le taux d'intérêt légal et indemnité forfaitaire pour frais de recouvrement de 40 € (art. L441-10 du Code de commerce). Pas d'escompte pour paiement anticipé.")
  if (quote.notes) terms.push(`Notes : ${quote.notes}`)
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.text).text('Conditions', M, doc.y)
  doc.font('Helvetica').fontSize(8.5).fillColor(C.muted)
  terms.forEach((t) => doc.moveDown(0.3).text(t, { width: W }))

  if (!isInvoice) {
    doc.moveDown(0.8)
    if (doc.y + 64 > doc.page.height - M - 10) doc.addPage()
    const by = doc.y
    doc.roundedRect(M + W / 2, by, W / 2, 60, 6).strokeColor(C.line).stroke()
    doc.font('Helvetica').fontSize(8.5).fillColor(C.muted).text('Bon pour accord — date, nom, signature et cachet du client', M + W / 2 + 10, by + 8, { width: W / 2 - 20 })
  }

  // ---- footer ----
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i)
    doc.page.margins.bottom = 0
    doc.font('Helvetica').fontSize(7).fillColor(C.muted).text(
      [seller.name, seller.legalForm, seller.siret && `SIRET ${seller.siret}`, seller.vatNumber && `TVA ${seller.vatNumber}`].filter(Boolean).join(' · ') + ` · page ${i + 1}/${range.count}`,
      M,
      doc.page.height - M + 15,
      { width: W, align: 'center', lineBreak: false }
    )
  }
  doc.end()
  return done
}

/** Sends the quote/invoice PDF as an HTTP response. */
async function sendQuotePdf(res, { quote, company, seller }) {
  const pdf = await buildQuotePdf({ quote, company, seller })
  const name = quote.status === 'paid' && quote.invoiceNumber ? quote.invoiceNumber : quote.number || 'devis'
  res.set('Content-Type', 'application/pdf')
  res.set('Content-Disposition', `inline; filename="${name}.pdf"`)
  res.set('Cache-Control', 'private, no-store')
  res.send(pdf)
}

module.exports = { buildQuotePdf, sendQuotePdf }
