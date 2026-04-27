from rest_framework import serializers

from .models import BankAccount, LedgerEntry, Merchant, Payout


class MerchantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Merchant
        fields = ['id', 'name', 'email']


class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = ['id', 'label', 'masked_account_number', 'ifsc']


class LedgerEntrySerializer(serializers.ModelSerializer):
    type = serializers.CharField(source='entry_type')

    class Meta:
        model = LedgerEntry
        fields = ['id', 'type', 'amount_paise', 'status', 'created_at', 'reference_id']


class PayoutSerializer(serializers.ModelSerializer):
    bank_account_id = serializers.PrimaryKeyRelatedField(source='bank_account', read_only=True)

    class Meta:
        model = Payout
        fields = [
            'id',
            'merchant_id',
            'amount_paise',
            'status',
            'attempts',
            'bank_account_id',
            'created_at',
            'updated_at',
        ]


class CreatePayoutSerializer(serializers.Serializer):
    amount_paise = serializers.IntegerField(min_value=1)
    bank_account_id = serializers.IntegerField(min_value=1)


class MerchantTokenRequestSerializer(serializers.Serializer):
    merchant_id = serializers.IntegerField(min_value=1)
