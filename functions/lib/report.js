const crypto = require('crypto')
const PDFDocument = require('pdfkit')

// Serverless responses are capped at 4.5MB: photos are embedded as-is
// (JPEG, no re-encoding), defect photos first, then as many of the others
// as fit. Everything stays viewable in the app.
const IMAGE_BUDGET_BYTES = 3.6 * 1024 * 1024

const PURPOSE_LABELS = { checkout: 'État des lieux de départ', checkin: 'État des lieux de retour', control: 'Contrôle du véhicule' }
const CHANGE_LABELS = { new: 'Nouveau', worse: 'Aggravé', same: 'Déjà connu' }
const STATUS_LABELS = { green: 'Bon état', orange: 'À surveiller', red: 'Dégâts détectés' }
const COLORS = { text: '#0f172a', muted: '#64748b', line: '#e2e8f0', brand: '#1d4ed8', red: '#dc2626', green: '#16a34a', orange: '#d97706' }

const PAGE_MARGIN = 40

function fmtDate(ms) {
  if (!ms) return '—'
  return new Date(ms).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function dataUrlToBuffer(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.includes(',')) return null
  return Buffer.from(dataUrl.split(',')[1], 'base64')
}

/** Draws `buffer` fitted in (w, h) at (x, y), optional defect box (0-1000 coords) in red. Returns drawn height. */
function drawPhoto(doc, buffer, x, y, w, h, box) {
  let img
  try {
    img = doc.openImage(buffer)
  } catch {
    doc.rect(x, y, w, h).fillAndStroke('#f1f5f9', COLORS.line).fillColor(COLORS.muted).fontSize(8).text('Photo illisible', x, y + h / 2 - 4, { width: w, align: 'center' })
    return h
  }
  const scale = Math.min(w / img.width, h / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  const dx = x + (w - dw) / 2
  const dy = y
  doc.image(img, dx, dy, { width: dw, height: dh })
  if (box) {
    const [ymin, xmin, ymax, xmax] = box
    doc
      .lineWidth(2)
      .strokeColor(COLORS.red)
      .rect(dx + (xmin / 1000) * dw, dy + (ymin / 1000) * dh, Math.max(((xmax - xmin) / 1000) * dw, 4), Math.max(((ymax - ymin) / 1000) * dh, 4))
      .stroke()
      .lineWidth(1)
  }
  return dh
}

function ensureSpace(doc, needed) {
  if (doc.y + needed > doc.page.height - PAGE_MARGIN - 30) doc.addPage()
}

function sectionTitle(doc, title) {
  ensureSpace(doc, 40)
  doc.moveDown(0.8).fillColor(COLORS.brand).font('Helvetica-Bold').fontSize(12).text(title, PAGE_MARGIN)
  const y = doc.y + 2
  doc.moveTo(PAGE_MARGIN, y).lineTo(doc.page.width - PAGE_MARGIN, y).strokeColor(COLORS.line).stroke()
  doc.moveDown(0.5).font('Helvetica').fontSize(10).fillColor(COLORS.text)
}

function keyValues(doc, rows) {
  const colW = (doc.page.width - PAGE_MARGIN * 2) / 2
  for (let i = 0; i < rows.length; i += 2) {
    ensureSpace(doc, 30)
    const y = doc.y
    rows.slice(i, i + 2).forEach(([k, v], j) => {
      const x = PAGE_MARGIN + j * colW
      doc.fillColor(COLORS.muted).fontSize(8).text(k, x, y, { width: colW - 10 })
      doc.fillColor(COLORS.text).fontSize(10).text(v == null || v === '' ? '—' : String(v), x, y + 10, { width: colW - 10 })
    })
    doc.y = y + 28
  }
}

/**
 * Builds the inspection report (état des lieux) as a PDF buffer:
 * vehicle + inspection details, every defect with the photo it was spotted
 * on (box drawn), signatures, a photo annex, and SHA-256 fingerprints of
 * the embedded photos so the document can be matched to the stored originals.
 */
async function buildInspectionReport({ company, vehicle, inspection, inspectorName, photos }) {
  const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN, bufferPages: true, info: { Title: `État des lieux ${vehicle.licensePlate}`, Author: company.name || 'LocaVision' } })
  const chunks = []
  doc.on('data', (c) => chunks.push(c))
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))))

  const contentW = doc.page.width - PAGE_MARGIN * 2
  const damages = inspection.damages || []
  const accepted = new Set(inspection.review?.acceptedIds || [])
  const rejected = new Set(inspection.review?.rejectedIds || [])
  const reviewed = inspection.review?.status === 'validated'
  // Once validated, the document only lists confirmed defects; false
  // positives dismissed by the inspector are not defects.
  const candidates = inspection.mode === 'comparison' ? damages.filter((d) => d.change !== 'same') : damages
  const listed = reviewed ? candidates.filter((d) => !rejected.has(d.id)) : candidates
  const dismissedCount = candidates.length - listed.length
  const dismissedKnown = new Set((vehicle.knownDamages || []).filter((k) => k.status === 'dismissed').map((k) => k.id))
  const known = damages.filter((d) => d.change === 'same' && !dismissedKnown.has(d.knownId))

  // ---- header ----
  doc.font('Helvetica-Bold').fontSize(18).fillColor(COLORS.text).text(PURPOSE_LABELS[inspection.purpose] || 'Rapport d’inspection', PAGE_MARGIN, PAGE_MARGIN)
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text(`${company.name || ''} · généré le ${fmtDate(Date.now())}`)
  const statusColor = COLORS[{ green: 'green', orange: 'orange', red: 'red' }[inspection.status]] || COLORS.orange
  doc.moveDown(0.5).font('Helvetica-Bold').fontSize(12).fillColor(statusColor).text(
    inspection.mode === 'comparison'
      ? inspection.newDamageCount
        ? `${inspection.newDamageCount} changement(s) depuis l'inspection de référence`
        : "Aucun changement depuis l'inspection de référence"
      : STATUS_LABELS[inspection.status] || ''
  )
  if (inspection.summary) doc.font('Helvetica').fontSize(10).fillColor(COLORS.text).text(inspection.summary, { width: contentW })

  sectionTitle(doc, 'Véhicule')
  keyValues(doc, [
    ['Immatriculation', vehicle.licensePlate],
    ['Marque / modèle', `${vehicle.brand || ''} ${vehicle.model || ''}`.trim()],
    ['Année', vehicle.year],
    ['VIN', vehicle.vin],
    ['Kilométrage relevé', inspection.mileage != null ? `${inspection.mileage.toLocaleString('fr-FR')} km` : null],
    ['Agence', vehicle.city],
  ])

  sectionTitle(doc, 'Inspection')
  keyValues(doc, [
    ['Date et heure', fmtDate(inspection.createdAt)],
    ['Inspecteur', inspectorName],
    ['Type', inspection.mode === 'comparison' ? 'Comparaison avec la référence' : inspection.mode === 'baseline' ? 'Inspection de référence' : 'Inspection'],
    ['Score de santé', inspection.healthScore != null ? `${inspection.healthScore}/10` : null],
    ['Validation des défauts', inspection.review?.status === 'pending' ? 'En attente' : inspection.review?.validatedAt ? fmtDate(inspection.review.validatedAt) : null],
    ['Référence du document', inspection.id],
  ])

  // ---- defects ----
  let imageBytes = 0
  const embedded = new Set()
  sectionTitle(doc, inspection.mode === 'comparison' ? `Nouveaux défauts (${listed.length})` : `Défauts constatés (${listed.length})`)
  if (listed.length === 0) {
    doc.fillColor(COLORS.green).text(inspection.mode === 'comparison' ? 'Aucun nouveau défaut constaté.' : 'Aucun défaut constaté.')
  }
  for (const d of listed) {
    ensureSpace(doc, 130)
    const y = doc.y
    const photo = d.photoIndex != null ? photos[d.photoIndex] : null
    if (photo?.buffer && imageBytes + photo.buffer.length <= IMAGE_BUDGET_BYTES) {
      drawPhoto(doc, photo.buffer, PAGE_MARGIN, y, 160, 120, d.box)
      if (!embedded.has(d.photoIndex)) imageBytes += photo.buffer.length
      embedded.add(d.photoIndex)
    } else {
      doc.rect(PAGE_MARGIN, y, 160, 120).strokeColor(COLORS.line).stroke()
      doc.fillColor(COLORS.muted).fontSize(8).text(photo ? `Photo n°${d.photoIndex + 1} (voir l'application)` : 'Pas de photo', PAGE_MARGIN, y + 55, { width: 160, align: 'center' })
    }
    const tx = PAGE_MARGIN + 175
    const tw = contentW - 175
    const decision = !reviewed ? 'À valider' : accepted.has(d.id) ? 'Confirmé' : ''
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.text).text(d.location, tx, y, { width: tw })
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(
      [d.type, d.severity ? `gravité ${d.severity}/5` : null, d.change ? CHANGE_LABELS[d.change] : null, decision].filter(Boolean).join(' · '),
      { width: tw }
    )
    doc.moveDown(0.3).fontSize(10).fillColor(COLORS.text).text(d.description || '', { width: tw })
    if (d.photoIndex != null) doc.moveDown(0.3).fontSize(8).fillColor(COLORS.muted).text(`Photo n°${d.photoIndex + 1}`, { width: tw })
    doc.y = Math.max(doc.y, y + 125)
    doc.x = PAGE_MARGIN
  }
  if (dismissedCount) {
    doc.fontSize(8).fillColor(COLORS.muted).text(`${dismissedCount} élément(s) signalé(s) par l'analyse automatique et écarté(s) lors de la validation (reflets, salissures…).`, PAGE_MARGIN, doc.y, { width: contentW })
  }

  if (known.length) {
    sectionTitle(doc, `Défauts déjà connus, retrouvés (${known.length})`)
    for (const d of known) {
      ensureSpace(doc, 16)
      doc.fontSize(9).fillColor(COLORS.text).text(`• ${d.location} — ${d.description || d.type}`, PAGE_MARGIN, doc.y, { width: contentW })
    }
  }

  // ---- signatures ----
  ensureSpace(doc, 175) // keep the title with its boxes
  sectionTitle(doc, 'Signatures')
  const sigY = doc.y
  const sigW = (contentW - 20) / 2
  ;[
    ['Inspecteur', inspection.signatures?.inspector],
    ['Client', inspection.signatures?.customer],
  ].forEach(([label, sig], i) => {
    const x = PAGE_MARGIN + i * (sigW + 20)
    doc.rect(x, sigY, sigW, 110).strokeColor(COLORS.line).stroke()
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.muted).text(label, x + 8, sigY + 6)
    if (sig) {
      const buf = dataUrlToBuffer(sig.image)
      if (buf) {
        try {
          doc.image(buf, x + 8, sigY + 20, { fit: [sigW - 16, 60] })
        } catch {
          // unreadable signature image: name and date below still identify the signer
        }
      }
      doc.font('Helvetica').fontSize(9).fillColor(COLORS.text).text(`${sig.name} · ${fmtDate(sig.signedAt)}`, x + 8, sigY + 86, { width: sigW - 16 })
    } else {
      doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text('Non signé', x + 8, sigY + 50, { width: sigW - 16, align: 'center' })
    }
  })
  doc.y = sigY + 118
  doc.x = PAGE_MARGIN
  if (inspection.signatures?.customer) {
    doc.fontSize(8).fillColor(COLORS.muted).text(
      "En signant, le client reconnaît avoir pris connaissance du présent état des lieux et des défauts qui y sont décrits.",
      { width: contentW }
    )
  }

  // ---- photo annex ----
  doc.addPage()
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.brand).text(`Annexe — photos (${photos.length})`)
  doc.moveDown(0.5)
  const cols = 3
  const cellW = (contentW - (cols - 1) * 10) / cols
  const cellH = cellW * 0.75
  let col = 0
  let rowY = doc.y
  let skipped = 0
  photos.forEach((p, i) => {
    if (!p.buffer) return
    const already = embedded.has(i)
    if (!already && imageBytes + p.buffer.length > IMAGE_BUDGET_BYTES) {
      skipped += 1
      return
    }
    if (rowY + cellH + 14 > doc.page.height - PAGE_MARGIN - 30) {
      doc.addPage()
      rowY = PAGE_MARGIN
      col = 0
    }
    const x = PAGE_MARGIN + col * (cellW + 10)
    drawPhoto(doc, p.buffer, x, rowY, cellW, cellH)
    if (!already) imageBytes += p.buffer.length
    embedded.add(i)
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.muted).text(`Photo n°${i + 1}`, x, rowY + cellH + 2, { width: cellW })
    col += 1
    if (col === cols) {
      col = 0
      rowY += cellH + 16
    }
  })
  doc.y = col === 0 ? rowY : rowY + cellH + 16
  doc.x = PAGE_MARGIN
  if (skipped) {
    ensureSpace(doc, 20)
    doc.fontSize(8).fillColor(COLORS.muted).text(`${skipped} autre(s) photo(s) consultable(s) dans l'application LocaVision (non incluses pour limiter la taille du document).`, PAGE_MARGIN, doc.y, { width: contentW })
  }

  // ---- fingerprints ----
  ensureSpace(doc, 40)
  doc.moveDown(0.8).font('Helvetica-Bold').fontSize(9).fillColor(COLORS.text).text('Empreintes SHA-256 des photos originales', PAGE_MARGIN, doc.y)
  doc.font('Courier').fontSize(6.5).fillColor(COLORS.muted)
  photos.forEach((p, i) => {
    if (!p.buffer) return
    ensureSpace(doc, 10)
    doc.text(`n°${String(i + 1).padStart(2, '0')}  ${crypto.createHash('sha256').update(p.buffer).digest('hex')}`, PAGE_MARGIN, doc.y, { width: contentW })
  })

  // ---- footer on every page ----
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i)
    // Writing inside the bottom margin would otherwise make pdfkit add a page.
    doc.page.margins.bottom = 0
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.muted).text(
      `LocaVision · ${vehicle.licensePlate} · inspection ${inspection.id} · page ${i + 1}/${range.count}`,
      PAGE_MARGIN,
      doc.page.height - PAGE_MARGIN + 10,
      { width: contentW, align: 'center', lineBreak: false }
    )
  }

  doc.end()
  return done
}

module.exports = { buildInspectionReport, PURPOSE_LABELS }
