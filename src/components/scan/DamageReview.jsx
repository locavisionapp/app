import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, X, Eye, EyeOff, CheckCheck, History, HelpCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'
import { StatusBadge } from '../ui/StatusBadge'
import { useToast } from '../ui/Toast'
import { api } from '../../lib/api'
import { cn } from '../../lib/cn'

const CHANGE_LABEL = { new: 'Nouveau', worse: 'Aggravé', same: 'Connu' }

function severityStatus(severity) {
  return severity >= 4 ? 'red' : severity >= 2 ? 'orange' : 'green'
}

/**
 * A photo with the defect's bounding box drawn on it (box = [ymin, xmin,
 * ymax, xmax] in 0-1000, as returned by the model). The container takes the
 * image's own aspect ratio so the box lines up exactly. Tap = full screen.
 */
export function DamagePhoto({ url, thumbUrl, box, className, label }) {
  const [ratio, setRatio] = useState(4 / 3)
  const [open, setOpen] = useState(false)
  if (!url) return <div className={cn('flex items-center justify-center rounded-lg bg-slate-100 text-[10px] text-slate-400', className)}>Pas de photo</div>

  const frame = (big) => (
    <div className="relative w-full" style={{ aspectRatio: ratio }}>
      <img
        src={big ? url : thumbUrl || url}
        alt={label || 'Photo du défaut'}
        loading="lazy"
        onLoad={(e) => e.currentTarget.naturalWidth && setRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
        className="absolute inset-0 h-full w-full rounded-lg object-fill"
      />
      {box && (
        <span
          className={cn('absolute rounded border-red-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]', big ? 'border-[3px]' : 'border-2')}
          style={{ top: `${box[0] / 10}%`, left: `${box[1] / 10}%`, height: `${Math.max((box[2] - box[0]) / 10, 2)}%`, width: `${Math.max((box[3] - box[1]) / 10, 2)}%` }}
        />
      )}
    </div>
  )

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn('block overflow-hidden rounded-lg', className)} aria-label="Agrandir la photo">
        {frame(false)}
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3" onClick={() => setOpen(false)}>
            <div className="w-full max-w-3xl">
              {frame(true)}
              {label && <p className="mt-2 text-center text-sm text-white">{label}</p>}
            </div>
            <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white" aria-label="Fermer">
              <X size={20} />
            </button>
          </div>,
          document.body
        )}
    </>
  )
}

function DamageRow({ damage, photoUrl, thumbUrl, checked, onToggle, readonly, decision }) {
  return (
    <div className={cn('flex gap-3 rounded-xl border p-3', checked === false ? 'border-slate-200 bg-slate-50 opacity-70' : 'border-slate-200 bg-white')}>
      {!readonly && (
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          aria-label={`Confirmer : ${damage.location}`}
        />
      )}
      <DamagePhoto url={photoUrl} thumbUrl={thumbUrl} box={damage.box} className="w-28 shrink-0" label={`${damage.location} — ${damage.description}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="font-medium text-slate-900">{damage.location}</p>
          {damage.change && damage.change !== 'new' && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{CHANGE_LABEL[damage.change]}</span>
          )}
        </div>
        <p className="text-sm text-slate-500">{damage.description}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <StatusBadge status={severityStatus(damage.severity)} label={`${damage.type} · gravité ${damage.severity}/5`} className="px-2 py-0.5 text-xs" />
          {decision && (
            <span className={cn('flex items-center gap-1 text-xs font-medium', decision === 'accepted' ? 'text-status-good' : 'text-slate-400')}>
              {decision === 'accepted' ? <Check size={12} /> : <X size={12} />}
              {decision === 'accepted' ? 'Confirmé' : 'Écarté'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Review of an inspection's defects. New (or worsened) defects need a human
 * decision: all pre-checked, uncheck the false positives, then validate —
 * or validate everything at once. Confirmed ones join the vehicle's known
 * defects; the next inspection is compared against this one.
 */
export function DamageReview({ vehicleId, inspection, knownDamages = [], onUpdated }) {
  const toast = useToast()
  const damages = inspection.damages || []
  const photos = inspection.photos || []
  const thumbs = inspection.thumbs || []
  const toDecide = damages.filter((d) => d.change !== 'same')
  const matched = damages.filter((d) => d.change === 'same')
  const pending = inspection.review?.status === 'pending'
  const [checked, setChecked] = useState(() => Object.fromEntries(toDecide.map((d) => [d.id, true])))
  const [saving, setSaving] = useState(false)
  const [showMatched, setShowMatched] = useState(false)

  // Inspections from before the baseline/comparison flow: read-only list.
  if (!inspection.mode) {
    return damages.length ? (
      <div className="space-y-2">
        {damages.map((d, i) => (
          <DamageRow key={i} damage={d} readonly />
        ))}
      </div>
    ) : (
      <p className="text-sm text-slate-500">Aucun dégât relevé.</p>
    )
  }

  const selectedIds = toDecide.filter((d) => checked[d.id]).map((d) => d.id)
  const accepted = new Set(inspection.review?.acceptedIds || [])
  const knownById = new Map(knownDamages.map((k) => [k.id, k]))
  const missing = (inspection.missingKnownIds || []).map((id) => knownById.get(id)).filter(Boolean)

  async function validate(ids) {
    setSaving(true)
    try {
      const updated = await api.reviewInspection(vehicleId, inspection.id, ids)
      toast.success(ids.length ? `${ids.length} défaut(s) confirmé(s).` : 'Inspection validée : aucun défaut retenu.')
      onUpdated?.(updated)
    } catch (e) {
      toast.error(e)
    } finally {
      setSaving(false)
    }
  }

  function setAll(value) {
    setChecked(Object.fromEntries(toDecide.map((d) => [d.id, value])))
  }

  return (
    <div className="space-y-4">
      {inspection.mode === 'baseline' && (
        <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
          Premier scan de ce véhicule : il sert de <strong>référence</strong>. Les prochains scans seront comparés à celui-ci.
        </p>
      )}

      {toDecide.length === 0 ? (
        <p className="rounded-xl bg-status-goodBg px-4 py-3 text-sm font-medium text-status-good">
          {inspection.mode === 'comparison' ? 'Aucun nouveau défaut depuis le scan précédent.' : 'Aucun défaut détecté.'}
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-700">
              {inspection.mode === 'comparison' ? 'Nouveaux défauts' : 'Défauts détectés'} ({toDecide.length})
            </p>
            {pending && (
              <div className="flex gap-3 text-xs">
                <button type="button" onClick={() => setAll(true)} className="text-brand-700 hover:underline">Tout cocher</button>
                <button type="button" onClick={() => setAll(false)} className="text-slate-500 hover:underline">Tout décocher</button>
              </div>
            )}
          </div>
          {pending && (
            <p className="text-xs text-slate-500">Décochez ce qui n'est pas un vrai défaut (reflet, saleté…) : l'IA ne le signalera plus.</p>
          )}
          {toDecide.map((d) => (
            <DamageRow
              key={d.id}
              damage={d}
              photoUrl={d.photoIndex != null ? photos[d.photoIndex] : null}
              thumbUrl={d.photoIndex != null ? thumbs[d.photoIndex] : null}
              readonly={!pending}
              checked={pending ? !!checked[d.id] : undefined}
              onToggle={() => setChecked((c) => ({ ...c, [d.id]: !c[d.id] }))}
              decision={!pending && inspection.review?.validatedBy !== 'auto' ? (accepted.has(d.id) ? 'accepted' : 'rejected') : null}
            />
          ))}
          {pending && (
            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
              <Button variant="secondary" className="flex-1" disabled={saving} onClick={() => validate(selectedIds)}>
                {saving ? <Spinner size={16} /> : <Check size={16} />} Valider la sélection ({selectedIds.length})
              </Button>
              <Button className="flex-1" disabled={saving} onClick={() => validate(toDecide.map((d) => d.id))}>
                {saving ? <Spinner size={16} className="text-white" /> : <CheckCheck size={16} />} Tout valider
              </Button>
            </div>
          )}
        </div>
      )}

      {missing.length > 0 && (
        <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <HelpCircle size={15} /> Défauts connus non retrouvés ({missing.length})
          </p>
          <p className="text-xs text-slate-500">Zone visible mais défaut absent : réparé ? Marquez-le comme réparé depuis la fiche du véhicule.</p>
          <ul className="text-sm text-slate-600">
            {missing.map((k) => (
              <li key={k.id}>• {k.location} — {k.description}</li>
            ))}
          </ul>
        </div>
      )}

      {matched.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowMatched(!showMatched)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-700">
            {showMatched ? <EyeOff size={14} /> : <Eye size={14} />}
            <History size={14} /> Défauts déjà connus retrouvés ({matched.length})
          </button>
          {showMatched && (
            <div className="mt-2 space-y-2">
              {matched.map((d) => (
                <DamageRow key={d.id} damage={d} photoUrl={d.photoIndex != null ? photos[d.photoIndex] : null} thumbUrl={d.photoIndex != null ? thumbs[d.photoIndex] : null} readonly />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
