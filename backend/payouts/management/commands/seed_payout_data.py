from django.core.management.base import BaseCommand

from payouts.models import BankAccount, LedgerEntry, Merchant, Payout


class Command(BaseCommand):
    help = 'Seed merchants, bank accounts, credits, and realistic payout history'

    def handle(self, *args, **options):
        merchants_seed = [
            {
                'name': 'Acme Studios',
                'email': 'acme@example.com',
                'bank_label': 'HDFC Primary',
                'masked': 'xxxxxx9012',
                'ifsc': 'HDFC0001234',
                'credits': [350000, 250000, 90000],
                'payouts': [
                    {'amount': 120000, 'ledger_status': 'posted', 'payout_status': 'completed', 'attempts': 1},
                    {'amount': 45000, 'ledger_status': 'reversed', 'payout_status': 'failed', 'attempts': 2},
                    {'amount': 25000, 'ledger_status': 'held', 'payout_status': 'processing', 'attempts': 1},
                ],
            },
            {
                'name': 'Northstar Labs',
                'email': 'northstar@example.com',
                'bank_label': 'ICICI Business',
                'masked': 'xxxxxx1145',
                'ifsc': 'ICIC0005566',
                'credits': [500000, 120000],
                'payouts': [
                    {'amount': 80000, 'ledger_status': 'posted', 'payout_status': 'completed', 'attempts': 1},
                    {'amount': 60000, 'ledger_status': 'held', 'payout_status': 'pending', 'attempts': 0},
                ],
            },
            {
                'name': 'Riverrun Media',
                'email': 'riverrun@example.com',
                'bank_label': 'SBI Current',
                'masked': 'xxxxxx7734',
                'ifsc': 'SBIN0009988',
                'credits': [150000, 175000, 80000],
                'payouts': [
                    {'amount': 50000, 'ledger_status': 'posted', 'payout_status': 'completed', 'attempts': 1},
                    {'amount': 30000, 'ledger_status': 'reversed', 'payout_status': 'failed', 'attempts': 3},
                ],
            },
        ]

        for merchant_data in merchants_seed:
            merchant, _ = Merchant.objects.get_or_create(
                email=merchant_data['email'],
                defaults={'name': merchant_data['name']},
            )

            bank_account, _ = BankAccount.objects.get_or_create(
                merchant=merchant,
                label=merchant_data['bank_label'],
                defaults={
                    'masked_account_number': merchant_data['masked'],
                    'ifsc': merchant_data['ifsc'],
                    'is_active': True,
                },
            )

            for index, amount in enumerate(merchant_data['credits']):
                LedgerEntry.objects.get_or_create(
                    merchant=merchant,
                    reference_id=f'seed_credit_{merchant.id}_{index}',
                    defaults={
                        'entry_type': LedgerEntry.EntryType.CREDIT,
                        'amount_paise': amount,
                        'status': LedgerEntry.EntryStatus.POSTED,
                    },
                )

            for index, payout_seed in enumerate(merchant_data['payouts']):
                ledger_entry, _ = LedgerEntry.objects.get_or_create(
                    merchant=merchant,
                    reference_id=f'seed_payout_{merchant.id}_{index}',
                    defaults={
                        'entry_type': LedgerEntry.EntryType.DEBIT,
                        'amount_paise': payout_seed['amount'],
                        'status': payout_seed['ledger_status'],
                    },
                )

                Payout.objects.get_or_create(
                    merchant=merchant,
                    ledger_entry=ledger_entry,
                    defaults={
                        'bank_account': bank_account,
                        'amount_paise': payout_seed['amount'],
                        'status': payout_seed['payout_status'],
                        'attempts': payout_seed['attempts'],
                    },
                )

        self.stdout.write(self.style.SUCCESS('Seed data is ready with realistic payout history.'))
