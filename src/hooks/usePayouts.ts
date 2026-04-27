import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPayout, fetchPayouts, isRequestTimeoutError } from '../services/api'
import { queryKeys } from '../services/queryKeys'
import { useUIStore } from '../store/uiStore'
import type {
  CreatePayoutPayload,
  CreatePayoutResponse,
  DashboardResponse,
  PaginatedResponse,
  Payout,
  PayoutQueryParams,
} from '../types/api'

interface PayoutMutationInput {
  payload: CreatePayoutPayload
  idempotencyKey: string
}

export function usePayouts(params: PayoutQueryParams) {
  const selectedMerchantId = useUIStore((state) => state.selectedMerchantId)
  const authToken = useUIStore((state) => state.authToken)

  return useQuery({
    queryKey: queryKeys.payouts({
      merchant: selectedMerchantId ?? 'default',
      page: params.page,
      page_size: params.page_size,
      status: params.status ?? 'all',
    }),
    queryFn: () => fetchPayouts(params),
    enabled: Boolean(authToken),
    refetchInterval: 5_000,
    placeholderData: (previousData) => previousData,
  })
}

export function useCreatePayout() {
  const queryClient = useQueryClient()
  const selectedMerchantId = useUIStore((state) => state.selectedMerchantId)

  const dashboardKey = queryKeys.dashboard(selectedMerchantId ?? 'default')

  return useMutation({
    mutationFn: ({ payload, idempotencyKey }: PayoutMutationInput) =>
      createPayout(payload, {
        idempotencyKey,
      }),
    onMutate: async ({ payload, idempotencyKey }) => {
      await queryClient.cancelQueries({ queryKey: ['payouts'] })
      await queryClient.cancelQueries({ queryKey: dashboardKey })

      const previousDashboard = queryClient.getQueryData<DashboardResponse>(dashboardKey)

      const previousPayouts = queryClient.getQueriesData<PaginatedResponse<Payout>>({
        queryKey: ['payouts'],
      })

      queryClient.setQueryData<DashboardResponse>(dashboardKey, (current) => {
        if (!current) {
          return current
        }

        return {
          ...current,
          balances: {
            ...current.balances,
            available_balance_paise: Math.max(0, current.balances.available_balance_paise - payload.amount_paise),
            held_balance_paise: current.balances.held_balance_paise + payload.amount_paise,
          },
        }
      })

      queryClient.setQueriesData<PaginatedResponse<Payout>>({ queryKey: ['payouts'] }, (current) => {
        if (!current) {
          return current
        }

        const optimisticPayout: Payout = {
          id: `optimistic-${idempotencyKey}`,
          merchant_id: 'current',
          amount_paise: payload.amount_paise,
          status: 'pending',
          attempts: 0,
          bank_account_id: payload.bank_account_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        return {
          ...current,
          count: current.count + 1,
          results: [optimisticPayout, ...current.results].slice(0, current.results.length),
        }
      })

      return { previousDashboard, previousPayouts }
    },
    onError: (_error, _variables, context) => {
      if (!context) {
        return
      }

      queryClient.setQueryData(dashboardKey, context.previousDashboard)
      context.previousPayouts.forEach(([key, value]) => {
        queryClient.setQueryData(key, value)
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKey })
      queryClient.invalidateQueries({ queryKey: ['payouts'] })
      queryClient.invalidateQueries({ queryKey: ['ledger'] })
    },
  })
}

export { isRequestTimeoutError }
export type { CreatePayoutResponse }
