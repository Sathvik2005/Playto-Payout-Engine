from django.db import models
from django.utils import timezone


class Merchant(models.Model):
	name = models.CharField(max_length=120)
	email = models.EmailField(unique=True)
	created_at = models.DateTimeField(auto_now_add=True)

	@property
	def is_authenticated(self) -> bool:
		return True

	def __str__(self) -> str:
		return f'{self.name} <{self.email}>'


class BankAccount(models.Model):
	merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='bank_accounts')
	label = models.CharField(max_length=120)
	masked_account_number = models.CharField(max_length=32)
	ifsc = models.CharField(max_length=16)
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)


class LedgerEntry(models.Model):
	class EntryType(models.TextChoices):
		CREDIT = 'credit', 'Credit'
		DEBIT = 'debit', 'Debit'

	class EntryStatus(models.TextChoices):
		POSTED = 'posted', 'Posted'
		HELD = 'held', 'Held'
		REVERSED = 'reversed', 'Reversed'

	merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='ledger_entries')
	entry_type = models.CharField(max_length=16, choices=EntryType.choices)
	amount_paise = models.BigIntegerField()
	status = models.CharField(max_length=16, choices=EntryStatus.choices, default=EntryStatus.POSTED)
	reference_id = models.CharField(max_length=64, db_index=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		indexes = [
			models.Index(fields=['merchant', '-created_at']),
			models.Index(fields=['merchant', 'entry_type', 'status']),
		]


class Payout(models.Model):
	class Status(models.TextChoices):
		PENDING = 'pending', 'Pending'
		PROCESSING = 'processing', 'Processing'
		COMPLETED = 'completed', 'Completed'
		FAILED = 'failed', 'Failed'

	merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='payouts')
	bank_account = models.ForeignKey(BankAccount, on_delete=models.PROTECT, related_name='payouts')
	amount_paise = models.BigIntegerField()
	status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
	attempts = models.PositiveIntegerField(default=0)
	next_retry_at = models.DateTimeField(null=True, blank=True)
	ledger_entry = models.OneToOneField(LedgerEntry, on_delete=models.PROTECT, related_name='payout')
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	ALLOWED_TRANSITIONS = {
		Status.PENDING: {Status.PROCESSING},
		Status.PROCESSING: {Status.COMPLETED, Status.FAILED},
		Status.COMPLETED: set(),
		Status.FAILED: set(),
	}

	def can_transition_to(self, target_status: str) -> bool:
		return target_status in self.ALLOWED_TRANSITIONS[self.status]

	def transition_to(self, target_status: str) -> None:
		if not self.can_transition_to(target_status):
			raise ValueError(f'Illegal payout transition: {self.status} -> {target_status}')

		self.status = target_status
		self.updated_at = timezone.now()


class IdempotencyRecord(models.Model):
	merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='idempotency_records')
	key = models.UUIDField()
	request_fingerprint = models.CharField(max_length=255)
	status_code = models.PositiveSmallIntegerField(null=True, blank=True)
	response_body = models.JSONField(null=True, blank=True)
	expires_at = models.DateTimeField(db_index=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		constraints = [
			models.UniqueConstraint(fields=['merchant', 'key'], name='unique_idempotency_per_merchant')
		]
