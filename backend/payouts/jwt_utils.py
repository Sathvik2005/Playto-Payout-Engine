from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings


def create_merchant_access_token(merchant_id: int) -> str:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=settings.JWT_ACCESS_TTL_SECONDS)

    payload = {
        'sub': str(merchant_id),
        'iat': int(now.timestamp()),
        'exp': int(expires_at.timestamp()),
        'type': 'access',
    }

    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm='HS256')


def decode_merchant_access_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=['HS256'])
