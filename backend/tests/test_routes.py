import pytest


@pytest.mark.asyncio
async def test_health_endpoint_reports_ok(async_client):
    response = await async_client.get("/api/v1/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert "app" in payload
    assert "environment" in payload


@pytest.mark.asyncio
async def test_echo_returns_transformed_payload(async_client):
    response = await async_client.post("/api/v1/echo", json={"message": "FastAPI"})

    assert response.status_code == 201
    data = response.json()
    assert data == {
        "message": "FastAPI",
        "length": 7,
        "uppercase": "FASTAPI",
    }
