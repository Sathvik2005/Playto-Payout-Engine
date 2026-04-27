from uuid import UUID

from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import BankAccount, LedgerEntry, Merchant, Payout
from .serializers import (
	BankAccountSerializer,
	CreatePayoutSerializer,
	LedgerEntrySerializer,
	MerchantSerializer,
	MerchantTokenRequestSerializer,
	PayoutSerializer,
)
from .jwt_utils import create_merchant_access_token
from .services import (
	IdempotencyConflictError,
	InsufficientBalanceError,
	PayoutError,
	get_balance_snapshot,
	request_payout,
)
from .tasks import enqueue_payout_processing


class MerchantListView(generics.ListAPIView):
	serializer_class = MerchantSerializer
	permission_classes = [AllowAny]

	def get_queryset(self):
		return Merchant.objects.order_by('id')


class MerchantTokenView(APIView):
	permission_classes = [AllowAny]

	def post(self, request):
		serializer = MerchantTokenRequestSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		try:
			merchant = Merchant.objects.get(id=serializer.validated_data['merchant_id'])
		except Merchant.DoesNotExist:
			return Response({'detail': 'Merchant not found'}, status=status.HTTP_404_NOT_FOUND)

		token = create_merchant_access_token(merchant.id)
		return Response({'access_token': token, 'merchant': MerchantSerializer(merchant).data})


class MerchantDashboardView(APIView):
	def get(self, request):
		merchant = request.user

		payload = {
			'merchant': MerchantSerializer(merchant).data,
			'balances': get_balance_snapshot(merchant.id),
			'last_updated_at': timezone.now().isoformat(),
		}
		return Response(payload)


class BankAccountListView(generics.ListAPIView):
	serializer_class = BankAccountSerializer

	def get_queryset(self):
		merchant = self.request.user
		return BankAccount.objects.filter(merchant=merchant, is_active=True).order_by('-id')


class LedgerListView(generics.ListAPIView):
	serializer_class = LedgerEntrySerializer

	def get_queryset(self):
		merchant = self.request.user
		queryset = LedgerEntry.objects.filter(merchant=merchant).order_by('-created_at')

		filter_type = self.request.query_params.get('type')
		if filter_type in [LedgerEntry.EntryType.CREDIT, LedgerEntry.EntryType.DEBIT]:
			queryset = queryset.filter(entry_type=filter_type)

		filter_status = self.request.query_params.get('status')
		if filter_status in [
			LedgerEntry.EntryStatus.POSTED,
			LedgerEntry.EntryStatus.HELD,
			LedgerEntry.EntryStatus.REVERSED,
		]:
			queryset = queryset.filter(status=filter_status)

		sort_by = self.request.query_params.get('sort_by', '-created_at')
		if sort_by in ['created_at', '-created_at']:
			queryset = queryset.order_by(sort_by)

		return queryset


class PayoutListCreateView(APIView):
	def get(self, request):
		merchant = request.user
		queryset = Payout.objects.filter(merchant=merchant)

		payout_status = request.query_params.get('status')
		if payout_status in [
			Payout.Status.PENDING,
			Payout.Status.PROCESSING,
			Payout.Status.COMPLETED,
			Payout.Status.FAILED,
		]:
			queryset = queryset.filter(status=payout_status)

		page = int(request.query_params.get('page', 1))
		page_size = int(request.query_params.get('page_size', 10))
		start = (page - 1) * page_size
		end = start + page_size

		total_count = queryset.count()
		results = queryset.order_by('-created_at')[start:end]

		return Response(
			{
				'count': total_count,
				'next': None,
				'previous': None,
				'results': PayoutSerializer(results, many=True).data,
			}
		)

	def post(self, request):
		serializer = CreatePayoutSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		idempotency_key = request.headers.get('Idempotency-Key')
		if not idempotency_key:
			return Response({'detail': 'Idempotency-Key header is required'}, status=status.HTTP_400_BAD_REQUEST)

		try:
			parsed_key = UUID(idempotency_key)
		except ValueError:
			return Response({'detail': 'Idempotency-Key must be a valid UUID'}, status=status.HTTP_400_BAD_REQUEST)

		merchant = request.user

		bank_account_id = serializer.validated_data['bank_account_id']
		if not BankAccount.objects.filter(id=bank_account_id, merchant=merchant, is_active=True).exists():
			return Response({'detail': 'Invalid bank account for merchant'}, status=status.HTTP_400_BAD_REQUEST)

		try:
			payload, status_code = request_payout(
				merchant_id=merchant.id,
				bank_account_id=bank_account_id,
				amount_paise=serializer.validated_data['amount_paise'],
				idempotency_key=parsed_key,
			)
		except InsufficientBalanceError as exc:
			return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
		except IdempotencyConflictError as exc:
			return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)
		except PayoutError as exc:
			return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

		if status_code == status.HTTP_201_CREATED:
			enqueue_payout_processing(int(payload['payout']['id']))

		return Response(payload, status=status_code)
