import { useState } from 'react'
import { Pagination } from '../components/Pagination'
import { PayoutRequestForm } from '../components/PayoutRequestForm'
import { SectionHeader } from '../components/SectionHeader'
import { StatusBadge } from '../components/StatusBadge'
import { Table } from '../components/Table'
import { usePayouts } from '../hooks/usePayouts'
import { formatDateTime } from '../utils/date'
import { formatPaiseToINR } from '../utils/money'
import type { PayoutStatus } from '../types/api'

export function PayoutsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | 'all'>('all')

  const { data, isLoading } = usePayouts({
    page,
    page_size: 10,
    status: statusFilter,
  })

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Payout Operations"
        subtitle="Create payouts safely and monitor real-time processing state"
      />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <PayoutRequestForm />

        <div className="animate-fade-up">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-ink-950 dark:text-slate-100">Payout History</h2>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as PayoutStatus | 'all')
                setPage(1)
              }}
              className="app-select w-auto rounded-lg px-2.5 py-2 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <Table
            columns={[
              {
                key: 'amount',
                title: 'Amount',
                render: (row) => formatPaiseToINR(row.amount_paise),
                align: 'right',
              },
              { key: 'status', title: 'Status', render: (row) => <StatusBadge status={row.status} /> },
              { key: 'attempts', title: 'Attempts', render: (row) => row.attempts },
              { key: 'created_at', title: 'Created At', render: (row) => formatDateTime(row.created_at) },
              { key: 'updated_at', title: 'Updated At', render: (row) => formatDateTime(row.updated_at) },
            ]}
            rows={data?.results ?? []}
            isLoading={isLoading}
            rowKey={(row) => row.id}
            emptyMessage="No payout records found."
          />

          <Pagination
            page={page}
            pageSize={10}
            totalCount={data?.count ?? 0}
            onPageChange={setPage}
          />
        </div>
      </div>
    </section>
  )
}
