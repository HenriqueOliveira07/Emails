from fastapi.testclient import TestClient

from app.main import app


def test_health_is_public():
    with TestClient(app) as c:
        assert c.get("/api/health").status_code == 200


def test_protected_routes_require_key():
    with TestClient(app) as c:
        for path in ("/api/dashboard/stats", "/api/emails", "/api/notifications", "/api/settings"):
            assert c.get(path).status_code == 401, path
            assert c.get(path, headers={"X-API-Key": "errada"}).status_code == 401, path
            assert c.get(path, headers={"X-API-Key": "chave-de-teste"}).status_code == 200, path
