import { cn } from '../../lib/cn'

export function Stepper({ steps, currentIndex }) {
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((step, i) => (
        <div
          key={step.id}
          className={cn(
            'h-1.5 flex-1 rounded-full transition-colors',
            i < currentIndex ? 'bg-brand-600' : i === currentIndex ? 'bg-brand-300' : 'bg-slate-200'
          )}
        />
      ))}
    </div>
  )
}
