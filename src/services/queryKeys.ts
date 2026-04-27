export const queryKeys = {
  dashboard: (merchantId: string) => ['dashboard', merchantId] as const,
  bankAccounts: (merchantId: string) => ['bank-accounts', merchantId] as const,
  merchants: ['merchants'] as const,
  ledger: (params: Record<string, string | number>) => ['ledger', params] as const,
  payouts: (params: Record<string, string | number>) => ['payouts', params] as const,
}
