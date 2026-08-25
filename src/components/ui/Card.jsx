import { cn } from '../../lib/cn'

export function Card({ className, as: As = 'div', ...props }) {
  return (
    <As
      className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm', className)}
      {...props}
    />
  )
}
