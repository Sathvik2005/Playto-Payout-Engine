# EXPLAINER.md

## 1) The Ledger

### Balance calculation query (exact)

```python
aggregates = LedgerEntry.objects.filter(merchant_id=merchant_id).aggregate(
    total_credits=Coalesce(
        Sum('amount_paise', filter=Q(entry_type=LedgerEntry.EntryType.CREDIT, status=LedgerEntry.EntryStatus.POSTED)),
        0,
    ),
    total_debits=Coalesce(
        Sum(
            'amount_paise',
            filter=Q(
                entry_type=LedgerEntry.EntryType.DEBIT,
                status__in=[LedgerEntry.EntryStatus.HELD, LedgerEntry.EntryStatus.POSTED],
            ),
        ),
        0,
    ),
    held_debits=Coalesce(
        Sum('amount_paise', filter=Q(entry_type=LedgerEntry.EntryType.DEBIT, status=LedgerEntry.EntryStatus.HELD)),
        0,
    ),
    posted_debits=Coalesce(
        Sum('amount_paise', filter=Q(entry_type=LedgerEntry.EntryType.DEBIT, status=LedgerEntry.EntryStatus.POSTED)),
        0,
    ),
)
```

### Why this model

- Everything is paise (`BigIntegerField`) so there is no float precision risk.
- Credits and debits are immutable ledger entries.
- Payout request creates a debit in `held` state (fund hold).
- On completion, held debit becomes `posted`.
- On failure, held debit becomes `reversed` (funds effectively return).
- Available balance is derived in DB as `credits - (held + posted debits)`.

## 2) The Lock

### Exact overdraw protection code

```python
with transaction.atomic():
    Merchant.objects.select_for_update().get(id=merchant_id)
    balance_snapshot = get_balance_snapshot(merchant_id)

    if balance_snapshot['available_balance_paise'] < amount_paise:
        raise InsufficientBalanceError('Insufficient available balance')

    ledger_entry = LedgerEntry.objects.create(
        merchant_id=merchant_id,
        entry_type=LedgerEntry.EntryType.DEBIT,
        amount_paise=amount_paise,
        status=LedgerEntry.EntryStatus.HELD,
        reference_id=f'hold_{merchant_id}_{now.timestamp()}',
    )
```

### Database primitive used

- `SELECT ... FOR UPDATE` on the merchant row serializes payout requests per merchant.
- Because check and hold happen in one transaction, a second concurrent request sees the first hold and cannot overdraw.

## 3) The Idempotency

### How the system knows it has seen a key

- `IdempotencyRecord` table has unique constraint on `(merchant, key)`.
- The API computes a request fingerprint (`sha256(amount_paise:bank_account_id)`) and stores it with the key.
- If same key + same fingerprint appears again, stored response body/status is returned exactly.
- If same key + different fingerprint appears, request is rejected (`409 conflict`).

### What if first request is in flight and second arrives

- Both requests run inside DB transactions.
- The record is fetched/created with locking (`select_for_update` + unique constraint fallback on `IntegrityError`).
- The second request blocks/reloads and then returns the first request's saved response instead of creating a duplicate payout.

### 24h expiry

- Idempotency record has `expires_at`.
- If expired when accessed, record is deleted and key can be reused as a new request.

## 4) The State Machine

### Where failed-to-completed is blocked

```python
ALLOWED_TRANSITIONS = {
    Status.PENDING: {Status.PROCESSING},
    Status.PROCESSING: {Status.COMPLETED, Status.FAILED},
    Status.COMPLETED: set(),
    Status.FAILED: set(),
}

def transition_to(self, target_status: str) -> None:
    if not self.can_transition_to(target_status):
        raise ValueError(f'Illegal payout transition: {self.status} -> {target_status}')
```

Because `failed` has no outgoing transitions, `failed -> completed` is rejected.

### Atomic refund on failure

- In one transaction, payout transitions to `failed` and linked ledger entry transitions from `held` to `reversed`.
- This ensures status and funds return cannot diverge.

## 5) The AI Audit

### Wrong AI suggestion (subtle bug)

The initial generated approach was:

```python
# WRONG: vulnerable check-then-write in Python without lock
available = get_balance_snapshot(merchant_id)['available_balance_paise']
if available >= amount_paise:
    Payout.objects.create(...)
```

Why it is wrong:
- Under concurrency, two requests can read same available balance before either writes hold entries.
- Both pass the check and overdraw.

### Replacement

```python
with transaction.atomic():
    Merchant.objects.select_for_update().get(id=merchant_id)
    balance_snapshot = get_balance_snapshot(merchant_id)
    if balance_snapshot['available_balance_paise'] < amount_paise:
        raise InsufficientBalanceError(...)
    LedgerEntry.objects.create(... status='held' ...)
    Payout.objects.create(...)
```

This fixed race by moving check+hold under a row lock and single transaction.
