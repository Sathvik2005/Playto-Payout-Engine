export type LedgerEntryType = 'credit' | 'debit'

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface MerchantInfo {
  id: string
  name: string
  email: string
}

export interface DashboardBalances {
  available_balance_paise: number
  held_balance_paise: number
  total_credits_paise: number
  total_debits_paise: number
}

export interface DashboardResponse {
  merchant: MerchantInfo
  balances: DashboardBalances
  last_updated_at: string
}

export interface LedgerEntry {
  id: string
  type: LedgerEntryType
  amount_paise: number
  status: 'posted' | 'held' | 'reversed'
  created_at: string
  reference_id: string
}

export interface Payout {
  id: string
  merchant_id: string
  amount_paise: number
  status: PayoutStatus
  attempts: number
  bank_account_id: string
  created_at: string
  updated_at: string
}

export interface BankAccount {
  id: string
  label: string
  masked_account_number: string
  ifsc: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface PaginationParams {
  page: number
  page_size: number
}

export interface LedgerQueryParams extends PaginationParams {
  sort_by?: 'created_at' | '-created_at'
  type?: LedgerEntryType | 'all'
  status?: LedgerEntry['status'] | 'all'
}

export interface PayoutQueryParams extends PaginationParams {
  status?: PayoutStatus | 'all'
}

export interface CreatePayoutPayload {
  amount_paise: number
  bank_account_id: string
}

export interface CreatePayoutOptions {
  idempotencyKey: string
}

export interface MerchantTokenResponse {
  access_token: string
  merchant: MerchantInfo
}

export interface CreatePayoutResponse {
  payout: Payout
  idempotency_key: string
}
