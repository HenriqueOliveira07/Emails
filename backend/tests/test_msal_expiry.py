from datetime import datetime, timezone
from unittest.mock import MagicMock, patch


def test_token_expiry_does_not_overflow():
    with patch("msal.ConfidentialClientApplication") as app_cls:
        app = MagicMock()
        app.acquire_token_for_client.return_value = {"access_token": "t", "expires_in": 3599}
        app_cls.return_value = app
        from app.services.email_reader import MSALAuthenticator
        auth = MSALAuthenticator()
        assert auth.get_token() == "t"
        assert (auth._token_expiry - datetime.now(timezone.utc)).total_seconds() > 3500
        auth.get_token()
        assert app.acquire_token_for_client.call_count == 1
