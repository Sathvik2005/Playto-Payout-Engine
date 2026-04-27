import { useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { AlertCircle, Send } from 'lucide-react'
import { useBankAccounts, useDashboard } from '../hooks/useDashboard'
import { isRequestTimeoutError, useCreatePayout } from '../hooks/usePayouts'
import { clearPayoutIdempotencyKey, getOrCreatePayoutIdempotencyKey } from '../utils/idempotency'
import { formatPaiseToINR, inrInputToPaise } from '../utils/money'

interface SubmissionDraft {
  amountPaise: number
  bankAccountId: string
  idempotencyKey: string
}

export function PayoutRequestForm() {
  const { data: dashboardData } = useDashboard()
  const { data: bankAccounts } = useBankAccounts()
  const createPayout = useCreatePayout()

  const [amountInr, setAmountInr] = useState('')
  const [bankAccountId, setBankAccountId] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [timedOutDraft, setTimedOutDraft] = useState<SubmissionDraft | null>(null)

  const merchantId = dashboardData?.merchant.id
  const availableBalance = dashboardData?.balances.available_balance_paise ?? 0
  const parsedAmountPaise = inrInputToPaise(amountInr)

  const validationError = useMemo(() => {
    if (!amountInr.trim()) {
      return ''
    }

    if (parsedAmountPaise <= 0) {
      return 'Payout amount must be greater than zero.'
    }

    if (parsedAmountPaise > availableBalance) {
      return 'Amount exceeds your available balance.'
    }

    return ''
  }, [amountInr, parsedAmountPaise, availableBalance])

  async function submitWithDraft(draft: SubmissionDraft) {
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await createPayout.mutateAsync({
        payload: {
          amount_paise: draft.amountPaise,
          bank_account_id: draft.bankAccountId,
        },
        idempotencyKey: draft.idempotencyKey,
      })

      clearPayoutIdempotencyKey(String(merchantId))
      setTimedOutDraft(null)
      setSuccessMessage(`Payout ${response.payout.id} submitted successfully.`)
      setAmountInr('')
      setBankAccountId('')
    } catch (error) {
      if (isRequestTimeoutError(error)) {
        setTimedOutDraft(draft)
        setErrorMessage('Request timed out. Retry will reuse the same idempotency key.')
        return
      }

      const axiosError = error as AxiosError<{ detail?: string }>
      setErrorMessage(axiosError.response?.data?.detail ?? 'Failed to submit payout request.')
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!merchantId || validationError || !bankAccountId || parsedAmountPaise <= 0) {
      return
    }

    const idempotencyKey = getOrCreatePayoutIdempotencyKey(String(merchantId), parsedAmountPaise, bankAccountId)

    await submitWithDraft({
      amountPaise: parsedAmountPaise,
      bankAccountId,
      idempotencyKey,
    })
  }

  const disableSubmit =
    createPayout.isPending || !merchantId || !bankAccountId || parsedAmountPaise <= 0 || !!validationError

  return (
    <section className="card animate-fade-up p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-ink-950 dark:text-slate-100">Request Payout</h2>
          <p className="mt-1 text-sm text-ink-500 dark:text-slate-400">Available: {formatPaiseToINR(availableBalance)}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-slate-300">
            Amount (INR)
          </label>
          <input
            id="amount"
            type="number"
            min="0"
            step="0.01"
            value={amountInr}
            onChange={(event) => setAmountInr(event.target.value)}
            className="app-input"
            placeholder="e.g. 1250.50"
          />
        </div>

        <div>
          <label htmlFor="bank_account" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-slate-300">
            Bank Account
          </label>
          <select
            id="bank_account"
            value={bankAccountId}
            onChange={(event) => setBankAccountId(event.target.value)}
            className="app-select"
          >
            <option value="">Select bank account</option>
            {(bankAccounts ?? []).map((account) => (
              <option key={account.id} value={account.id}>
                {account.label} ({account.masked_account_number})
              </option>
            ))}
          </select>
        </div>

        {validationError ? (
          <p className="text-sm font-medium text-danger-600 dark:text-red-300">{validationError}</p>
        ) : null}

        {errorMessage ? (
          <div className="rounded-lg border border-danger-100 bg-danger-100/50 px-3 py-2 text-sm text-danger-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-lg border border-cash-100 bg-cash-100/70 px-3 py-2 text-sm text-cash-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            {successMessage}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={disableSubmit}
            className="app-button-primary"
          >
            <Send size={15} />
            {createPayout.isPending ? 'Submitting...' : 'Request Payout'}
          </button>

          {timedOutDraft ? (
            <button
              type="button"
              onClick={() => submitWithDraft(timedOutDraft)}
              disabled={createPayout.isPending}
              className="app-button-secondary"
            >
              Retry Timed Out Request
            </button>
          ) : null}
        </div>
      </form>
    </section>
  )
}
