import { useMutation, useQuery } from '@tanstack/react-query'
import { fetchBankAccounts, fetchDashboard, fetchMerchants, issueMerchantToken } from '../services/api'
import { queryKeys } from '../services/queryKeys'
import { useUIStore } from '../store/uiStore'

function getMerchantQueryValue(selectedMerchantId: string | null): string {
  return selectedMerchantId ?? 'default'
}

export function useDashboard() {
  const selectedMerchantId = useUIStore((state) => state.selectedMerchantId)
  const authToken = useUIStore((state) => state.authToken)

  return useQuery({
    queryKey: queryKeys.dashboard(getMerchantQueryValue(selectedMerchantId)),
    queryFn: fetchDashboard,
    enabled: Boolean(authToken),
    refetchInterval: 5_000,
  })
}

export function useBankAccounts() {
  const selectedMerchantId = useUIStore((state) => state.selectedMerchantId)
  const authToken = useUIStore((state) => state.authToken)

  return useQuery({
    queryKey: queryKeys.bankAccounts(getMerchantQueryValue(selectedMerchantId)),
    queryFn: fetchBankAccounts,
    enabled: Boolean(authToken),
    staleTime: 60_000,
  })
}

export function useMerchants() {
  return useQuery({
    queryKey: queryKeys.merchants,
    queryFn: fetchMerchants,
    staleTime: 60_000,
  })
}

export function useIssueMerchantToken() {
  return useMutation({
    mutationFn: (merchantId: string) => issueMerchantToken(merchantId),
  })
}
