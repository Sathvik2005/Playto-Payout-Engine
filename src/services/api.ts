import axios, { type AxiosError } from 'axios'
import type {
  BankAccount,
  CreatePayoutPayload,
  CreatePayoutOptions,
  CreatePayoutResponse,
  DashboardResponse,
  LedgerEntry,
  LedgerQueryParams,
  MerchantInfo,
  MerchantTokenResponse,
  PaginatedResponse,
  Payout,
  PayoutQueryParams,
} from '../types/api'
import { cleanQueryParams } from '../utils/query'
import { useUIStore } from '../store/uiStore'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

httpClient.interceptors.request.use((config) => {
  const token = useUIStore.getState().authToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export function isRequestTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const axiosError = error as AxiosError
  return axiosError.code === 'ECONNABORTED'
}

export async function fetchDashboard() {
  const { data } = await httpClient.get<DashboardResponse>('/api/v1/merchant/dashboard')
  return data
}

export async function fetchBankAccounts() {
  const { data } = await httpClient.get<{ results: BankAccount[] } | BankAccount[]>('/api/v1/bank-accounts')
  return Array.isArray(data) ? data : data.results
}

export async function fetchMerchants() {
  const { data } = await httpClient.get<{ results: MerchantInfo[] } | MerchantInfo[]>('/api/v1/merchants')
  return Array.isArray(data) ? data : data.results
}

export async function fetchLedger(params: LedgerQueryParams) {
  const { data } = await httpClient.get<PaginatedResponse<LedgerEntry>>('/api/v1/ledger', {
    params: cleanQueryParams({
      page: params.page,
      page_size: params.page_size,
      sort_by: params.sort_by,
      type: params.type,
      status: params.status,
    }),
  })

  return data
}

export async function fetchPayouts(params: PayoutQueryParams) {
  const { data } = await httpClient.get<PaginatedResponse<Payout>>('/api/v1/payouts', {
    params: cleanQueryParams({
      page: params.page,
      page_size: params.page_size,
      status: params.status,
    }),
  })

  return data
}

export async function createPayout(payload: CreatePayoutPayload, options: CreatePayoutOptions) {
  const { data } = await httpClient.post<CreatePayoutResponse>('/api/v1/payouts', payload, {
    headers: {
      'Idempotency-Key': options.idempotencyKey,
    },
  })

  return data
}

export async function issueMerchantToken(merchantId: string) {
  const { data } = await httpClient.post<MerchantTokenResponse>('/api/v1/auth/token', {
    merchant_id: Number(merchantId),
  })

  return data
}
