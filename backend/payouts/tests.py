import threading
from uuid import uuid4
from unittest.mock import patch

from django.db import connection
from django.test import TransactionTestCase, override_settings
from rest_framework.test import APIClient

from .jwt_utils import create_merchant_access_token
from .models import BankAccount, LedgerEntry, Merchant, Payout
from .services import get_balance_snapshot, process_single_payout, request_payout


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class PayoutEngineTests(TransactionTestCase):
	reset_sequences = True

	def setUp(self):
		self.merchant = Merchant.objects.create(name='Test Merchant', email='merchant@example.com')
		self.bank_account = BankAccount.objects.create(
			merchant=self.merchant,
			label='Primary',
			masked_account_number='xxxxxx4242',
			ifsc='HDFC0001234',
		)
		LedgerEntry.objects.create(
			merchant=self.merchant,
			entry_type=LedgerEntry.EntryType.CREDIT,
			amount_paise=10_000,
			status=LedgerEntry.EntryStatus.POSTED,
			reference_id='seed_credit',
		)

	def _post_payout(self, amount_paise: int, idem_key: str):
		client = APIClient()
		token = create_merchant_access_token(self.merchant.id)
		return client.post(
			'/api/v1/payouts',
			data={'amount_paise': amount_paise, 'bank_account_id': self.bank_account.id},
			format='json',
			HTTP_IDEMPOTENCY_KEY=idem_key,
			HTTP_AUTHORIZATION=f'Bearer {token}',
		)

	def test_idempotency_returns_same_response_without_duplicate_payout(self):
		idempotency_key = str(uuid4())

		response_one = self._post_payout(amount_paise=4_000, idem_key=idempotency_key)
		response_two = self._post_payout(amount_paise=4_000, idem_key=idempotency_key)

		self.assertEqual(response_one.status_code, response_two.status_code)
		self.assertEqual(response_one.json(), response_two.json())
		self.assertEqual(Payout.objects.count(), 1)

	def test_concurrent_overdraw_allows_only_one_request(self):
		if connection.vendor == 'sqlite':
			self.skipTest('Row-level locking semantics are not reliable under sqlite.')

		barrier = threading.Barrier(2)
		responses: list[tuple[int, dict]] = []

		def runner(idem_key: str):
			barrier.wait()
			response = self._post_payout(amount_paise=6_000, idem_key=idem_key)
			responses.append((response.status_code, response.json()))

		t1 = threading.Thread(target=runner, args=(str(uuid4()),))
		t2 = threading.Thread(target=runner, args=(str(uuid4()),))

		t1.start()
		t2.start()
		t1.join()
		t2.join()

		status_codes = sorted(status for status, _payload in responses)
		self.assertEqual(status_codes, [201, 400])
		self.assertEqual(Payout.objects.count(), 1)

		balance = get_balance_snapshot(self.merchant.id)
		self.assertEqual(balance['available_balance_paise'], 4_000)

	def test_stuck_payout_fails_after_max_retries_and_reverses_hold(self):
		payload, status_code = request_payout(
			merchant_id=self.merchant.id,
			bank_account_id=self.bank_account.id,
			amount_paise=3_000,
			idempotency_key=uuid4(),
		)
		self.assertEqual(status_code, 201)

		payout_id = int(payload['payout']['id'])

		with patch('payouts.services.random.choices', return_value=['stuck']):
			process_single_payout(payout_id)
			process_single_payout(payout_id)
			process_single_payout(payout_id)

		payout = Payout.objects.get(id=payout_id)
		self.assertEqual(payout.status, Payout.Status.FAILED)
		self.assertEqual(payout.attempts, 3)
		self.assertEqual(payout.ledger_entry.status, LedgerEntry.EntryStatus.REVERSED)

		balance = get_balance_snapshot(self.merchant.id)
		self.assertEqual(balance['available_balance_paise'], 10_000)
