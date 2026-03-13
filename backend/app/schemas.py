"""Pydantic models shared across API routes."""
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    """Risk level enum."""
    RENDAH = "Rendah"
    SEDANG = "Sedang"
    TINGGI = "Tinggi"
    SANGAT_TINGGI = "Sangat Tinggi"
    AMAN = "Aman"
    TIDAK_DIKETAHUI = "Tidak Diketahui"

class RiskRequest(BaseModel):
    """Risk request model."""
    latitude: float = Field(..., description="Latitude coordinate", ge=-90.0, le=90.0)
    longitude: float = Field(..., description="Longitude coordinate", ge=-180.0, le=180.0)

class RiskResponse(BaseModel):
    """Risk response model."""
    latitude: float
    longitude: float
    risiko_banjir: RiskLevel
    risiko_gempa: RiskLevel
    risiko_likuifikasi: RiskLevel
    risiko_kriminalitas: RiskLevel

class HealthStatus(BaseModel):
    """Health status model."""
    status: str = Field(default="ok")
    app: str
    environment: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class MessageIn(BaseModel):
    """Message input model."""
    message: str = Field(..., min_length=1, max_length=2000)


class MessageOut(BaseModel):
    """Message output model."""
    message: str
    length: int
    uppercase: str
