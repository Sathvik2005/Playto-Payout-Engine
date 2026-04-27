interface PaginationProps {
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (nextPage: number) => void
}

export function Pagination({ page, pageSize, totalCount, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-ink-500 dark:text-slate-400">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="app-button-secondary rounded-lg px-3 py-1.5 text-sm"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="app-button-secondary rounded-lg px-3 py-1.5 text-sm"
        >
          Next
        </button>
      </div>
    </div>
  )
}
