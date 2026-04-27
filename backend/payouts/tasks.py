from celery import shared_task
from kombu.exceptions import OperationalError

from .services import list_retryable_payout_ids, process_single_payout


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_jitter=True, max_retries=3)
def process_payout_task(self, payout_id: int):
    process_single_payout(payout_id)


def enqueue_payout_processing(payout_id: int) -> None:
    try:
        process_payout_task.delay(payout_id)
    except (OperationalError, ConnectionError):
        process_single_payout(payout_id)


@shared_task
def process_pending_payouts_task():
    payout_ids = list_retryable_payout_ids()
    for payout_id in payout_ids:
        enqueue_payout_processing(payout_id)
