import { useRef, useState } from 'react'
import { FileDown, Share2, Mail, PenLine, CheckCircle2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { Field, Input, Select } from '../ui/Field'
import { Spinner } from '../ui/Spinner'
import { useToast } from '../ui/Toast'
import { SignaturePad } from './SignaturePad'
import { useAuth } from '../../lib/AuthContext'
import { api, saveBlob } from '../../lib/api'

const PURPOSES = [
  { id: 'checkout', label: 'Départ (remise du véhicule au client)' },
  { id: 'checkin', label: 'Retour (restitution par le client)' },
  { id: 'control', label: 'Contrôle interne' },
]

function fmt(ms) {
  return new Date(ms).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function reportFilename(vehicle, inspection) {
  return `etat-des-lieux_${vehicle?.licensePlate || 'vehicule'}_${new Date(inspection.createdAt).toISOString().slice(0, 10)}.pdf`
}

/**
 * État des lieux of a validated inspection: inspector + customer
 * signatures (contradictory report), then the PDF — download, share
 * (phone share sheet) or email it to the customer.
 */
export function InspectionReport({ vehicleId, vehicle, inspection, onUpdated }) {
  const toast = useToast()
  const { profile } = useAuth()
  const inspectorPad = useRef(null)
  const customerPad = useRef(null)
  const signatures = inspection.signatures || {}
  const [form, setForm] = useState({ purpose: inspection.purpose || 'checkout', inspectorName: profile?.username || '', customerName: '', customerEmail: '' })
  const [signing, setSigning] = useState(false)
  const [busy, setBusy] = useState(null) // 'download' | 'share' | 'email'
  const [showSign, setShowSign] = useState(false)
  const [emailTo, setEmailTo] = useState(signatures.customer?.email || '')
  const emailEnabled = Boolean(profile?.features?.email)

  if (inspection.review?.status === 'pending') return null

  const needInspector = !signatures.inspector
  const needCustomer = !signatures.customer

  async function sign() {
    const tasks = []
    if (needInspector) {
      const image = inspectorPad.current?.toDataURL()
      if (image || form.inspectorName.trim()) {
        if (!image || form.inspectorName.trim().length < 2) return toast.error("Nom et signature de l'inspecteur requis.")
        tasks.push({ role: 'inspector', name: form.inspectorName.trim(), image, purpose: form.purpose })
      }
    }
    if (needCustomer) {
      const image = customerPad.current?.toDataURL()
      if (image || form.customerName.trim()) {
        if (!image || form.customerName.trim().length < 2) return toast.error('Nom et signature du client requis.')
        tasks.push({ role: 'customer', name: form.customerName.trim(), email: form.customerEmail.trim() || undefined, image, purpose: form.purpose })
      }
    }
    if (!tasks.length) return toast.error('Aucune signature à enregistrer.')
    setSigning(true)
    try {
      let updated = inspection
      for (const t of tasks) updated = await api.signInspection(vehicleId, inspection.id, t)
      if (form.customerEmail.trim()) setEmailTo(form.customerEmail.trim())
      toast.success('Signature(s) enregistrée(s).')
      setShowSign(false)
      onUpdated?.(updated)
    } catch (e) {
      toast.error(e)
    } finally {
      setSigning(false)
    }
  }

  async function download() {
    setBusy('download')
    try {
      saveBlob(await api.getReportPdf(vehicleId, inspection.id), reportFilename(vehicle, inspection))
    } catch (e) {
      toast.error(e)
    } finally {
      setBusy(null)
    }
  }

  async function share() {
    setBusy('share')
    try {
      const blob = await api.getReportPdf(vehicleId, inspection.id)
      const file = new File([blob], reportFilename(vehicle, inspection), { type: 'application/pdf' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `État des lieux ${vehicle?.licensePlate || ''}` })
      } else {
        saveBlob(blob, file.name)
      }
    } catch (e) {
      if (e?.name !== 'AbortError') toast.error(e)
    } finally {
      setBusy(null)
    }
  }

  async function sendEmail() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTo.trim())) return toast.error('Email invalide.')
    setBusy('email')
    try {
      await api.sendReport(vehicleId, inspection.id, emailTo.trim())
      toast.success(`Rapport envoyé à ${emailTo.trim()}.`)
    } catch (e) {
      toast.error(e)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-700">État des lieux</p>

      <div className="space-y-1 text-sm">
        {[
          ['Inspecteur', signatures.inspector],
          ['Client', signatures.customer],
        ].map(([label, sig]) => (
          <p key={label} className={sig ? 'flex items-center gap-1.5 text-status-good' : 'text-slate-400'}>
            {sig ? <CheckCircle2 size={14} /> : null}
            {label} : {sig ? `${sig.name}, signé le ${fmt(sig.signedAt)}` : 'non signé'}
          </p>
        ))}
      </div>

      {(needInspector || needCustomer) && !showSign && (
        <Button className="w-full" onClick={() => setShowSign(true)}>
          <PenLine size={16} /> Faire signer
        </Button>
      )}

      {showSign && (
        <div className="space-y-4 border-t border-slate-100 pt-3">
          {!inspection.purpose && (
            <Field label="Type d'état des lieux">
              <Select value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}>
                {PURPOSES.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </Select>
            </Field>
          )}
          {needInspector && (
            <div className="space-y-2">
              <Field label="Nom de l'inspecteur">
                <Input value={form.inspectorName} maxLength={120} onChange={(e) => setForm({ ...form, inspectorName: e.target.value })} />
              </Field>
              <SignaturePad ref={inspectorPad} label="Signature de l'inspecteur" />
            </div>
          )}
          {needCustomer && (
            <div className="space-y-2">
              <Field label="Nom du client">
                <Input value={form.customerName} maxLength={120} autoComplete="off" onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
              </Field>
              <Field label="Email du client (optionnel, pour lui envoyer le rapport)">
                <Input type="email" inputMode="email" autoComplete="off" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} />
              </Field>
              <SignaturePad ref={customerPad} label="Signature du client" />
              <p className="text-xs text-slate-500">
                En signant, le client reconnaît avoir pris connaissance de l'état du véhicule et des défauts décrits. Une signature ne peut plus être modifiée ensuite.
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowSign(false)} disabled={signing}>
              Annuler
            </Button>
            <Button className="flex-1" onClick={sign} disabled={signing}>
              {signing ? <Spinner size={16} className="text-white" /> : 'Enregistrer'}
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="sm" onClick={download} disabled={!!busy}>
          {busy === 'download' ? <Spinner size={14} /> : <FileDown size={14} />} PDF
        </Button>
        <Button variant="secondary" size="sm" onClick={share} disabled={!!busy}>
          {busy === 'share' ? <Spinner size={14} /> : <Share2 size={14} />} Partager
        </Button>
      </div>
      {emailEnabled && (
        <div className="flex items-end gap-2">
          <Field label="Envoyer le PDF par email" className="flex-1">
            <Input type="email" inputMode="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="client@exemple.fr" />
          </Field>
          <Button size="sm" className="h-11" onClick={sendEmail} disabled={!!busy} aria-label="Envoyer par email">
            {busy === 'email' ? <Spinner size={14} className="text-white" /> : <Mail size={16} />}
          </Button>
        </div>
      )}
    </div>
  )
}
