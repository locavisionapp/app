import { cn } from '../../lib/cn'

export function Field({ label, children, hint, className }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

const controlClass =
  'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-400'

export function Input({ className, ...props }) {
  return <input {...props} className={cn(controlClass, className)} />
}

export function Select({ className, ...props }) {
  return <select {...props} className={cn(controlClass, className)} />
}
