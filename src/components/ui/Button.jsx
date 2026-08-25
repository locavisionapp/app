import { cn } from '../../lib/cn'

const variants = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-slate-300',
  secondary: 'bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

const sizes = {
  md: 'h-11 px-4 text-sm',
  lg: 'h-14 px-6 text-base',
  sm: 'h-9 px-3 text-sm',
}

export function Button({ variant = 'primary', size = 'md', className, as: As = 'button', ...props }) {
  return (
    <As
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
}
