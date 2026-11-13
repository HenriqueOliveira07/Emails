"""Regressão: cálculo de expiração do token MSAL não pode estourar o campo 'second'."""
from datetime import datetime, timezone
from unittest.mock import patch


def test_token_expiry_uses_timedelta():
    with patch("msal.ConfidentialClientApplication") as app_cls:
        app_cls.return_value.acquire_token_for_client.return_value = {
            "access_token": "tok", "expires_in": 3599,
        }
        from app.services.email_reader import MSALAuthenticator

        auth = MSALAuthenticator()
        assert auth.get_token() == "tok"
        remaining = (auth._token_expiry - datetime.now(timezone.utc)).total_seconds()
        assert 3500 < remaining <= 3599
        # Segunda chamada usa cache
        assert auth.get_token() == "tok"
        assert app_cls.return_value.acquire_token_for_client.call_count == 1
