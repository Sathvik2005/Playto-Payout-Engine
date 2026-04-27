import { v4 as uuidv4 } from 'uuid'

const PAYOUT_KEY_PREFIX = 'playto_payout_idempotency'

interface StoredPayoutKey {
  key: string
  merchantId: string
  amountPaise: number
  bankAccountId: string
  createdAt: number
}

export function getOrCreatePayoutIdempotencyKey(
  merchantId: string,
  amountPaise: number,
  bankAccountId: string,
): string {
  const storageKey = `${PAYOUT_KEY_PREFIX}_${merchantId}`
  const rawValue = localStorage.getItem(storageKey)

  if (rawValue) {
    try {
      const parsed = JSON.parse(rawValue) as StoredPayoutKey
      const isSameDraft =
        parsed.amountPaise === amountPaise && parsed.bankAccountId === bankAccountId
      const isFresh = Date.now() - parsed.createdAt <= 24 * 60 * 60 * 1000

      if (isSameDraft && isFresh) {
        return parsed.key
      }
    } catch {
      localStorage.removeItem(storageKey)
    }
  }

  const nextKey = uuidv4()
  const nextPayload: StoredPayoutKey = {
    key: nextKey,
    merchantId,
    amountPaise,
    bankAccountId,
    createdAt: Date.now(),
  }

  localStorage.setItem(storageKey, JSON.stringify(nextPayload))
  return nextKey
}

export function clearPayoutIdempotencyKey(merchantId: string): void {
  localStorage.removeItem(`${PAYOUT_KEY_PREFIX}_${merchantId}`)
}
