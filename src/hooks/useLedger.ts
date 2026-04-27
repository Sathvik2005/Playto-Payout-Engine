import { useQuery } from '@tanstack/react-query'
import { fetchLedger } from '../services/api'
import { queryKeys } from '../services/queryKeys'
import { useUIStore } from '../store/uiStore'
import type { LedgerQueryParams } from '../types/api'

export function useLedger(params: LedgerQueryParams) {
  const selectedMerchantId = useUIStore((state) => state.selectedMerchantId)
  const authToken = useUIStore((state) => state.authToken)

  return useQuery({
    queryKey: queryKeys.ledger({
      merchant: selectedMerchantId ?? 'default',
      page: params.page,
      page_size: params.page_size,
      sort_by: params.sort_by ?? '-created_at',
      type: params.type ?? 'all',
      status: params.status ?? 'all',
    }),
    queryFn: () => fetchLedger(params),
    enabled: Boolean(authToken),
    placeholderData: (previousData) => previousData,
  })
}
