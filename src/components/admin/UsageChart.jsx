import { useState } from 'react'

/**
 * Simple vertical bars: API call volume per day.
 * Single series (the total): no legend needed, just a hover tooltip.
 */
export function UsageChart({ data }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...data.map((d) => d.count))
  const width = 640
  const height = 220
  const padding = { top: 12, right: 8, bottom: 28, left: 8 }
  const plotW = width - padding.left - padding.right
  const plotH = height - padding.top - padding.bottom
  const barGap = 4
  const barW = data.length ? plotW / data.length - barGap : 0

  return (
    <div className="relative w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[480px]" role="img" aria-label="Appels API par jour">
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#e2e8f0" strokeWidth="1" />
        {data.map((d, i) => {
          const h = max ? (d.count / max) * (plotH - 8) : 0
          const x = padding.left + i * (barW + barGap)
          const y = height - padding.bottom - h
          const isHover = hover === i
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect
                x={x}
                y={y}
                width={Math.max(2, barW)}
                height={Math.max(1, h)}
                rx={3}
                className={isHover ? 'fill-brand-700' : 'fill-brand-500'}
              />
              {i % Math.ceil(data.length / 8 || 1) === 0 && (
                <text x={x + barW / 2} y={height - padding.bottom + 16} textAnchor="middle" className="fill-slate-400 text-[9px]">
                  {new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {hover != null && data[hover] && (
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg">
          <p className="font-semibold">{data[hover].count} appels</p>
          <p className="text-slate-300">{new Date(data[hover].date).toLocaleDateString('fr-FR')}</p>
        </div>
      )}
    </div>
  )
}
