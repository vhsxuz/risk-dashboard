"""Core API routes."""
from fastapi import APIRouter, Depends, status

from app.config import Settings, get_settings
from app.schemas import HealthStatus, MessageIn, MessageOut
from app.api.risk import router as risk_router

router = APIRouter()
router.include_router(risk_router, prefix="/risk", tags=["risk"])


@router.get("/health", response_model=HealthStatus, summary="Service health status")
def health(settings: Settings = Depends(get_settings)) -> HealthStatus:
    """Expose app metadata for uptime checks."""

    return HealthStatus(app=settings.app_name, environment=settings.environment)


@router.post(
    "/echo",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
    summary="Simple payload echo to demo validation",
)
async def echo(payload: MessageIn) -> MessageOut:
    """Return the message back with a few computed helpers."""

    message = payload.message.strip()
    return MessageOut(message=message, length=len(message), uppercase=message.upper())
