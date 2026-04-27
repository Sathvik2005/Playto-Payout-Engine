import hashlib
import random
from datetime import timedelta
from uuid import UUID

from django.db import IntegrityError, transaction
from django.db.models import Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from .models import IdempotencyRecord, LedgerEntry, Merchant, Payout


class PayoutError(Exception):
    pass


class InsufficientBalanceError(PayoutError):
    pass


class IdempotencyConflictError(PayoutError):
    pass


def build_request_fingerprint(amount_paise: int, bank_account_id: int) -> str:
    payload = f'{amount_paise}:{bank_account_id}'
    return hashlib.sha256(payload.encode('utf-8')).hexdigest()


def get_balance_snapshot(merchant_id: int) -> dict[str, int]:
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

    available_balance = aggregates['total_credits'] - aggregates['total_debits']

    return {
        'available_balance_paise': available_balance,
        'held_balance_paise': aggregates['held_debits'],
        'total_credits_paise': aggregates['total_credits'],
        'total_debits_paise': aggregates['posted_debits'],
    }


def request_payout(*, merchant_id: int, bank_account_id: int, amount_paise: int, idempotency_key: UUID) -> tuple[dict, int]:
    fingerprint = build_request_fingerprint(amount_paise, bank_account_id)
    now = timezone.now()

    with transaction.atomic():
        Merchant.objects.select_for_update().get(id=merchant_id)

        existing_record = (
            IdempotencyRecord.objects.select_for_update()
            .filter(merchant_id=merchant_id, key=idempotency_key)
            .first()
        )

        if existing_record:
            if existing_record.expires_at <= now:
                existing_record.delete()
                existing_record = None
            elif existing_record.request_fingerprint != fingerprint:
                raise IdempotencyConflictError('Idempotency key reused with different payload')
            elif existing_record.status_code and existing_record.response_body:
                return existing_record.response_body, existing_record.status_code

        if not existing_record:
            try:
                existing_record = IdempotencyRecord.objects.create(
                    merchant_id=merchant_id,
                    key=idempotency_key,
                    request_fingerprint=fingerprint,
                    expires_at=now + timedelta(hours=24),
                )
            except IntegrityError:
                existing_record = (
                    IdempotencyRecord.objects.select_for_update()
                    .get(merchant_id=merchant_id, key=idempotency_key)
                )
                if existing_record.request_fingerprint != fingerprint:
                    raise IdempotencyConflictError('Idempotency key reused with different payload')
                if existing_record.status_code and existing_record.response_body:
                    return existing_record.response_body, existing_record.status_code

        balance_snapshot = get_balance_snapshot(merchant_id)
        if amount_paise <= 0:
            raise PayoutError('Payout amount must be greater than zero')

        if balance_snapshot['available_balance_paise'] < amount_paise:
            raise InsufficientBalanceError('Insufficient available balance')

        ledger_entry = LedgerEntry.objects.create(
            merchant_id=merchant_id,
            entry_type=LedgerEntry.EntryType.DEBIT,
            amount_paise=amount_paise,
            status=LedgerEntry.EntryStatus.HELD,
            reference_id=f'hold_{merchant_id}_{now.timestamp()}',
        )

        payout = Payout.objects.create(
            merchant_id=merchant_id,
            bank_account_id=bank_account_id,
            amount_paise=amount_paise,
            status=Payout.Status.PENDING,
            attempts=0,
            ledger_entry=ledger_entry,
        )

        response_payload = {
            'payout': {
                'id': str(payout.id),
                'merchant_id': str(payout.merchant_id),
                'amount_paise': payout.amount_paise,
                'status': payout.status,
                'attempts': payout.attempts,
                'bank_account_id': str(payout.bank_account_id),
                'created_at': payout.created_at.isoformat(),
                'updated_at': payout.updated_at.isoformat(),
            },
            'idempotency_key': str(idempotency_key),
        }

        existing_record.status_code = 201
        existing_record.response_body = response_payload
        existing_record.save(update_fields=['status_code', 'response_body', 'updated_at'])

        return response_payload, 201


def process_single_payout(payout_id: int) -> None:
    now = timezone.now()

    with transaction.atomic():
        payout = Payout.objects.select_for_update().select_related('ledger_entry').get(id=payout_id)

        if payout.status == Payout.Status.COMPLETED or payout.status == Payout.Status.FAILED:
            return

        if payout.status == Payout.Status.PENDING:
            payout.transition_to(Payout.Status.PROCESSING)
            payout.attempts += 1
            payout.next_retry_at = now + timedelta(seconds=30 * (2 ** max(0, payout.attempts - 1)))
            payout.save(update_fields=['status', 'attempts', 'next_retry_at', 'updated_at'])
        elif payout.status == Payout.Status.PROCESSING:
            payout.attempts += 1
            payout.next_retry_at = now + timedelta(seconds=30 * (2 ** max(0, payout.attempts - 1)))
            payout.save(update_fields=['attempts', 'next_retry_at', 'updated_at'])

        outcome = random.choices(
            population=['completed', 'failed', 'stuck'],
            weights=[70, 20, 10],
            k=1,
        )[0]

        if outcome == 'completed':
            payout.transition_to(Payout.Status.COMPLETED)
            payout.ledger_entry.status = LedgerEntry.EntryStatus.POSTED
            payout.ledger_entry.reference_id = f'payout_{payout.id}'
            payout.ledger_entry.save(update_fields=['status', 'reference_id'])
            payout.next_retry_at = None
            payout.save(update_fields=['status', 'next_retry_at', 'updated_at'])
            return

        if outcome == 'failed':
            payout.transition_to(Payout.Status.FAILED)
            payout.ledger_entry.status = LedgerEntry.EntryStatus.REVERSED
            payout.ledger_entry.reference_id = f'payout_failed_{payout.id}'
            payout.ledger_entry.save(update_fields=['status', 'reference_id'])
            payout.next_retry_at = None
            payout.save(update_fields=['status', 'next_retry_at', 'updated_at'])
            return

        if payout.attempts >= 3:
            payout.transition_to(Payout.Status.FAILED)
            payout.ledger_entry.status = LedgerEntry.EntryStatus.REVERSED
            payout.ledger_entry.reference_id = f'payout_timeout_{payout.id}'
            payout.ledger_entry.save(update_fields=['status', 'reference_id'])
            payout.next_retry_at = None
            payout.save(update_fields=['status', 'next_retry_at', 'updated_at'])


def list_retryable_payout_ids() -> list[int]:
    now = timezone.now()
    return list(
        Payout.objects.filter(
            Q(status=Payout.Status.PENDING)
            | Q(status=Payout.Status.PROCESSING, attempts__lt=3, next_retry_at__isnull=False, next_retry_at__lte=now)
        ).values_list('id', flat=True)
    )
