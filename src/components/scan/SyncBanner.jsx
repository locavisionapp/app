import { useCallback, useEffect, useState } from 'react'
import { CloudOff, RefreshCw, AlertTriangle, Trash2, ChevronDown } from 'lucide-react'
import { listQueued, subscribe, processQueue, retry, discard, isSending } from '../../lib/inspectionQueue'
import { useOnline } from '../../lib/useOnline'
import { useToast } from '../ui/Toast'
import { Spinner } from '../ui/Spinner'

/**
 * Always-visible status of inspections waiting on the device: offline
 * indicator, pending count, and failed inspections that need a decision
 * (retry or discard). Silent when there's nothing to report.
 */
export function SyncBanner() {
  const toast = useToast()
  const online = useOnline()
  const [queued, setQueued] = useState([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => {
    listQueued().then(setQueued)
  }, [])

  useEffect(() => {
    refresh()
    return subscribe((event) => {
      refresh()
      if (event.type === 'delivered' && event.record?.vehicleLabel) {
        toast.success(`Inspection envoyée : ${event.record.vehicleLabel}`)
      }
      if (event.type === 'sending' || event.type === 'delivered' || event.type === 'deferred' || event.type === 'failed') {
        setBusy(isSending(event.id))
      }
    })
  }, [refresh, toast])

  if (online && queued.length === 0) return null

  const failed = queued.filter((r) => r.status === 'failed')
  const pending = queued.length - failed.length

  async function retryOne(id) {
    try {
      await retry(id)
    } catch (e) {
      toast.error(e)
    }
  }

  async function discardOne(record) {
    if (!window.confirm(`Supprimer définitivement l'inspection de ${record.vehicleLabel || 'ce véhicule'} ? Ses photos seront perdues.`)) return
    await discard(record.id)
  }

  return (
    <div className={failed.length ? 'bg-status-badBg text-status-bad' : 'bg-status-warnBg text-status-warn'}>
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-2 text-sm">
        {failed.length ? <AlertTriangle size={16} className="shrink-0" /> : !online ? <CloudOff size={16} className="shrink-0" /> : busy ? <Spinner size={16} className="text-status-warn" /> : <RefreshCw size={16} className="shrink-0" />}
        <span className="flex-1">
          {!online && 'Hors ligne. '}
          {pending > 0 && `${pending} inspection(s) en attente d'envoi${online ? '' : ' — envoi automatique au retour du réseau'}.`}
          {failed.length > 0 && ` ${failed.length} inspection(s) refusée(s), action requise.`}
        </span>
        {queued.length > 0 && (
          <button onClick={() => setOpen(!open)} className="flex items-center gap-1 font-medium underline-offset-2 hover:underline">
            Détails <ChevronDown size={14} className={open ? 'rotate-180' : ''} />
          </button>
        )}
      </div>
      {open && queued.length > 0 && (
        <div className="mx-auto max-w-2xl space-y-2 px-4 pb-3">
          {queued.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.vehicleLabel || 'Véhicule'}</p>
                <p className="truncate text-xs text-slate-500">
                  {new Date(r.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {r.error ? ` · ${r.error}` : ''}
                </p>
              </div>
              {online && (
                <button onClick={() => retryOne(r.id)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-700" title="Réessayer maintenant">
                  <RefreshCw size={16} />
                </button>
              )}
              <button onClick={() => discardOne(r)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-status-bad" title="Supprimer">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {online && pending > 0 && (
            <button onClick={() => processQueue()} className="text-xs font-medium underline">
              Tout renvoyer maintenant
            </button>
          )}
        </div>
      )}
    </div>
  )
}
