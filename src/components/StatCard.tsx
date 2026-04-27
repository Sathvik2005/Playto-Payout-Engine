import { type ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string
  icon?: ReactNode
  accent?: 'default' | 'positive' | 'warning'
}

export function StatCard({ title, value, icon, accent = 'default' }: StatCardProps) {
  const accentClass =
    accent === 'positive'
      ? 'bg-cash-100 text-cash-600 dark:bg-emerald-500/15 dark:text-emerald-300'
      : accent === 'warning'
        ? 'bg-amber-100 text-warn-500 dark:bg-amber-500/15 dark:text-amber-300'
        : 'bg-paper-100 text-ink-700 dark:bg-slate-800 dark:text-slate-300'

  return (
    <article className="card p-5 transition-transform duration-200 hover:-translate-y-1">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-500 dark:text-slate-400">{title}</p>
        {icon ? <div className={`rounded-lg p-2 ${accentClass}`}>{icon}</div> : null}
      </div>
      <p className="font-display text-2xl font-bold text-ink-950 dark:text-slate-100">{value}</p>
    </article>
  )
}
