from rest_framework import authentication
from rest_framework import exceptions

from .jwt_utils import decode_merchant_access_token
from .models import Merchant


class MerchantJWTAuthentication(authentication.BaseAuthentication):
    keyword = 'Bearer'

    def authenticate(self, request):
        auth_header = authentication.get_authorization_header(request).decode('utf-8')
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0] != self.keyword:
            raise exceptions.AuthenticationFailed('Invalid authorization header format')

        token = parts[1]

        try:
            payload = decode_merchant_access_token(token)
        except Exception as exc:
            raise exceptions.AuthenticationFailed('Invalid or expired token') from exc

        if payload.get('type') != 'access':
            raise exceptions.AuthenticationFailed('Invalid token type')

        merchant_id = payload.get('sub')
        if not merchant_id:
            raise exceptions.AuthenticationFailed('Token subject missing')

        try:
            merchant = Merchant.objects.get(id=int(merchant_id))
        except (Merchant.DoesNotExist, ValueError) as exc:
            raise exceptions.AuthenticationFailed('Merchant not found') from exc

        return merchant, token
