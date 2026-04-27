import { cn } from '../utils/cn'

interface Column<T> {
  key: string
  title: string
  render: (row: T) => React.ReactNode
  align?: 'left' | 'right'
}

interface TableProps<T> {
  columns: Column<T>[]
  rows: T[]
  isLoading?: boolean
  rowKey: (row: T) => string
  emptyMessage: string
}

export function Table<T>({ columns, rows, isLoading, rowKey, emptyMessage }: TableProps<T>) {
  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="border-b border-ink-200 bg-paper-50/70 dark:border-slate-800 dark:bg-slate-900/70">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-slate-400',
                  column.align === 'right' && 'text-right',
                )}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <tr key={`loading-${index}`} className="border-b border-ink-100 last:border-none dark:border-slate-800/80">
                  {columns.map((column) => (
                    <td key={column.key} className="table-cell">
                      <div className="skeleton h-4 w-20" />
                    </td>
                  ))}
                </tr>
              ))
            : null}

          {!isLoading && rows.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-center text-sm text-ink-500 dark:text-slate-400" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : null}

          {!isLoading
            ? rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="border-b border-ink-100 last:border-none transition-colors hover:bg-paper-50/40 dark:border-slate-800/80 dark:hover:bg-slate-900/60"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn('table-cell', column.align === 'right' && 'text-right')}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            : null}
        </tbody>
      </table>
    </div>
  )
}
