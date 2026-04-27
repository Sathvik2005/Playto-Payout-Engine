from django.core.management.base import BaseCommand

from payouts.models import BankAccount, LedgerEntry, Merchant


class Command(BaseCommand):
    help = 'Seed merchants, bank accounts, and credit ledger history'

    def handle(self, *args, **options):
        merchants_seed = [
            {
                'name': 'Acme Studios',
                'email': 'acme@example.com',
                'bank_label': 'HDFC Primary',
                'masked': 'xxxxxx9012',
                'ifsc': 'HDFC0001234',
                'credits': [350000, 250000, 90000],
            },
            {
                'name': 'Northstar Labs',
                'email': 'northstar@example.com',
                'bank_label': 'ICICI Business',
                'masked': 'xxxxxx1145',
                'ifsc': 'ICIC0005566',
                'credits': [500000, 120000],
            },
            {
                'name': 'Riverrun Media',
                'email': 'riverrun@example.com',
                'bank_label': 'SBI Current',
                'masked': 'xxxxxx7734',
                'ifsc': 'SBIN0009988',
                'credits': [150000, 175000, 80000],
            },
        ]

        for merchant_data in merchants_seed:
            merchant, _ = Merchant.objects.get_or_create(
                email=merchant_data['email'],
                defaults={'name': merchant_data['name']},
            )

            BankAccount.objects.get_or_create(
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

        self.stdout.write(self.style.SUCCESS('Seed data is ready.'))
