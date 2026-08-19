import uuid
from fastapi.testclient import TestClient
from app.main import app


def test_register_and_login():
    client = TestClient(app)
    email = f"testuser-{uuid.uuid4().hex}@example.com"
    # register
    resp = client.post("/auth/register", json={"email": email, "password": "testpass"})
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("email") == email or data.get("email") is None

    # login
    resp2 = client.post("/auth/token", data={"username": email, "password": "testpass"})
    assert resp2.status_code == 200
    token = resp2.json().get("access_token")
    assert token
