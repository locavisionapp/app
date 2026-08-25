import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function BackButton({ to, onClick, label = 'Retour', className }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={onClick || (() => (to ? navigate(to) : navigate(-1)))}
      className={className || 'mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-700'}
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  )
}
