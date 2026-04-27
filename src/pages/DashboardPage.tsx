import { ArrowDownToLine, ArrowUpFromLine, Lock, Wallet } from 'lucide-react'
import { SectionHeader } from '../components/SectionHeader'
import { StatCard } from '../components/StatCard'
import { Table } from '../components/Table'
import { StatusBadge } from '../components/StatusBadge'
import { useDashboard } from '../hooks/useDashboard'
import { useLedger } from '../hooks/useLedger'
import { formatDateTime } from '../utils/date'
import { formatPaiseToINR } from '../utils/money'

export function DashboardPage() {
  const { data: dashboardData, isLoading: isDashboardLoading } = useDashboard()
  const { data: ledgerData, isLoading: isLedgerLoading } = useLedger({
    page: 1,
    page_size: 6,
    sort_by: '-created_at',
    status: 'all',
    type: 'all',
  })

  const balances = dashboardData?.balances
  const statCards = [
    {
      key: 'available',
      title: 'Available Balance',
      value: isDashboardLoading ? 'Loading...' : formatPaiseToINR(balances?.available_balance_paise ?? 0),
      icon: <Wallet size={16} />,
      accent: 'positive' as const,
    },
    {
      key: 'held',
      title: 'Held Balance',
      value: isDashboardLoading ? 'Loading...' : formatPaiseToINR(balances?.held_balance_paise ?? 0),
      icon: <Lock size={16} />,
      accent: 'warning' as const,
    },
    {
      key: 'credits',
      title: 'Total Credits',
      value: isDashboardLoading ? 'Loading...' : formatPaiseToINR(balances?.total_credits_paise ?? 0),
      icon: <ArrowDownToLine size={16} />,
      accent: 'default' as const,
    },
    {
      key: 'debits',
      title: 'Total Debits',
      value: isDashboardLoading ? 'Loading...' : formatPaiseToINR(balances?.total_debits_paise ?? 0),
      icon: <ArrowUpFromLine size={16} />,
      accent: 'default' as const,
    },
  ]

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Merchant Dashboard"
        subtitle="Live account state with available and held funds in paise-backed INR format"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, index) => (
          <div key={card.key} className="animate-fade-up" style={{ animationDelay: `${index * 80}ms` }}>
            <StatCard
              title={card.title}
              value={card.value}
              icon={card.icon}
              accent={card.accent}
            />
          </div>
        ))}
      </div>

      <div className="mt-6">
        <SectionHeader title="Recent Ledger Activity" subtitle="Immutable credits and debits" />
        <Table
          columns={[
            { key: 'type', title: 'Type', render: (row) => row.type },
            {
              key: 'amount',
              title: 'Amount',
              render: (row) => formatPaiseToINR(row.amount_paise),
              align: 'right',
            },
            {
              key: 'status',
              title: 'Status',
              render: (row) => <StatusBadge status={row.status} />,
            },
            {
              key: 'created_at',
              title: 'Created At',
              render: (row) => formatDateTime(row.created_at),
            },
            { key: 'reference', title: 'Reference ID', render: (row) => row.reference_id },
          ]}
          rows={ledgerData?.results ?? []}
          isLoading={isLedgerLoading}
          rowKey={(row) => row.id}
          emptyMessage="No ledger entries yet."
        />
      </div>
    </section>
  )
}
