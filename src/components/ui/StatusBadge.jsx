import { cn } from '../../lib/cn'

// green = nothing to report, orange = points to watch, red = serious damage
const STATUS = {
  green: { label: 'Bon état', dot: 'bg-status-good', text: 'text-status-good', bg: 'bg-status-goodBg' },
  orange: { label: 'À surveiller', dot: 'bg-status-warn', text: 'text-status-warn', bg: 'bg-status-warnBg' },
  red: { label: 'Dégâts détectés', dot: 'bg-status-bad', text: 'text-status-bad', bg: 'bg-status-badBg' },
}

export function StatusBadge({ status, label, className }) {
  const s = STATUS[status] || STATUS.orange
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium', s.bg, s.text, className)}>
      <span className={cn('h-2 w-2 rounded-full', s.dot)} />
      {label || s.label}
    </span>
  )
}

export function statusMeta(status) {
  return STATUS[status] || STATUS.orange
}
