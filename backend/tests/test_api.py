import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data

def test_sources():
    response = client.get("/api/sources")
    assert response.status_code == 200
    data = response.json()
    assert "sources" in data
    assert len(data["sources"]) >= 2

def test_user_registration_and_login():
    test_email = f"test_{pytest.__version__}@airaware.org"
    reg_res = client.post("/api/auth/register", json={
        "name": "Hackathon Test User",
        "email": test_email,
        "password": "Password123!"
    })
    # If already created in prior run or newly created
    assert reg_res.status_code in [201, 409]

    login_res = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "Password123!"
    })
    if reg_res.status_code == 201:
        assert login_res.status_code == 200
        data = login_res.json()
        assert "access_token" in data
        assert data["user"]["email"] == test_email

def test_demo_user_login():
    response = client.post("/api/auth/login", json={
        "email": "demo@airaware.org",
        "password": "AirAware2026!"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["access_token"] is not None
    assert data["user"]["preferred_city"] == "Gurugram"
