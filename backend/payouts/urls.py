from django.urls import path

from .views import (
    BankAccountListView,
    LedgerListView,
    MerchantDashboardView,
    MerchantListView,
    MerchantTokenView,
    PayoutListCreateView,
)

urlpatterns = [
    path('merchants', MerchantListView.as_view(), name='merchant-list'),
    path('auth/token', MerchantTokenView.as_view(), name='merchant-token'),
    path('merchant/dashboard', MerchantDashboardView.as_view(), name='merchant-dashboard'),
    path('bank-accounts', BankAccountListView.as_view(), name='bank-accounts-list'),
    path('ledger', LedgerListView.as_view(), name='ledger-list'),
    path('payouts', PayoutListCreateView.as_view(), name='payout-list-create'),
]
