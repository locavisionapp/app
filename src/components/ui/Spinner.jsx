import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'

export function Spinner({ className, size = 20 }) {
  return <Loader2 className={cn('animate-spin text-brand-600', className)} size={size} />
}

export function FullscreenSpinner({ label = 'Chargement...' }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-slate-500">
      <Spinner size={32} />
      <p>{label}</p>
    </div>
  )
}
