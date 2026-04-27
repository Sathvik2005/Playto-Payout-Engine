import { useState } from 'react'
import { Pagination } from '../components/Pagination'
import { SectionHeader } from '../components/SectionHeader'
import { StatusBadge } from '../components/StatusBadge'
import { Table } from '../components/Table'
import { useLedger } from '../hooks/useLedger'
import { formatDateTime } from '../utils/date'
import { formatPaiseToINR } from '../utils/money'
import type { LedgerEntry } from '../types/api'

type LedgerStatusFilter = LedgerEntry['status'] | 'all'
type LedgerTypeFilter = LedgerEntry['type'] | 'all'

export function LedgerPage() {
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<LedgerTypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<LedgerStatusFilter>('all')
  const [sortBy, setSortBy] = useState<'created_at' | '-created_at'>('-created_at')

  const { data, isLoading } = useLedger({
    page,
    page_size: 10,
    sort_by: sortBy,
    status: statusFilter,
    type: typeFilter,
  })

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Transaction Ledger"
        subtitle="Server-paginated immutable credits and debits"
      />

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-3 animate-fade-up">
        <label className="text-sm text-ink-700 dark:text-slate-300">
          <span className="mb-1 block font-medium">Type</span>
          <select
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value as LedgerTypeFilter)
              setPage(1)
            }}
            className="app-select"
          >
            <option value="all">All</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
          </select>
        </label>

        <label className="text-sm text-ink-700 dark:text-slate-300">
          <span className="mb-1 block font-medium">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as LedgerStatusFilter)
              setPage(1)
            }}
            className="app-select"
          >
            <option value="all">All</option>
            <option value="posted">Posted</option>
            <option value="held">Held</option>
            <option value="reversed">Reversed</option>
          </select>
        </label>

        <label className="text-sm text-ink-700 dark:text-slate-300">
          <span className="mb-1 block font-medium">Sort</span>
          <select
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value as 'created_at' | '-created_at')
              setPage(1)
            }}
            className="app-select"
          >
            <option value="-created_at">Newest first</option>
            <option value="created_at">Oldest first</option>
          </select>
        </label>
      </div>

      <Table
        columns={[
          { key: 'type', title: 'Type', render: (row) => row.type },
          {
            key: 'amount',
            title: 'Amount',
            render: (row) => formatPaiseToINR(row.amount_paise),
            align: 'right',
          },
          { key: 'status', title: 'Status', render: (row) => <StatusBadge status={row.status} /> },
          { key: 'created_at', title: 'Created At', render: (row) => formatDateTime(row.created_at) },
          { key: 'reference_id', title: 'Reference ID', render: (row) => row.reference_id },
        ]}
        rows={data?.results ?? []}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        emptyMessage="No ledger transactions found for this filter."
      />

      <Pagination
        page={page}
        pageSize={10}
        totalCount={data?.count ?? 0}
        onPageChange={setPage}
      />
    </section>
  )
}
