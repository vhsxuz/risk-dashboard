import pytest
from httpx import AsyncClient

from app.schemas import RiskLevel

pytestmark = pytest.mark.asyncio

async def test_get_risk_endpoint(async_client: AsyncClient):
    """Test the /api/risk endpoint with a valid payload."""
    # Using some coordinates loosely in Indonesia
    payload = {"latitude": -6.200000, "longitude": 106.816666}

    response = await async_client.post("/api/v1/risk", json=payload)

    assert response.status_code == 200
    data = response.json()

    assert data["latitude"] == payload["latitude"]
    assert data["longitude"] == payload["longitude"]
    assert "risiko_banjir" in data
    assert "risiko_gempa" in data
    assert data["risiko_likuifikasi"] == RiskLevel.AMAN.value
