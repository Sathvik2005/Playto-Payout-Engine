interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-950 dark:text-slate-100">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  )
}
