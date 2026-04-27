import type { PayoutStatus } from '../types/api'
import { cn } from '../utils/cn'

interface StatusBadgeProps {
  status: PayoutStatus | 'posted' | 'held' | 'reversed'
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const baseClass = 'status-badge'

  const toneClass =
    status === 'completed' || status === 'posted'
      ? 'bg-cash-100 text-cash-600 dark:bg-emerald-500/15 dark:text-emerald-300'
      : status === 'failed' || status === 'reversed'
        ? 'bg-danger-100 text-danger-600 dark:bg-red-500/15 dark:text-red-300'
        : status === 'processing' || status === 'held'
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'

  return <span className={cn(baseClass, toneClass)}>{status}</span>
}
