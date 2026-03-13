"""FastAPI application entrypoint."""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api import api_router
from app.config import get_settings

STATIC_DIR = Path(__file__).resolve().parent / "static"


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix="/api")

    @app.get("/", tags=["core"], summary="Root welcome message")
    async def root() -> dict[str, str]:
        settings_local = get_settings()
        return {
            "message": "FastAPI starter is running",
            "environment": settings_local.environment,
        }

    @app.get(
        "/map",
        tags=["visualization"],
        summary="Interactive disaster risk map",
    )
    async def map_page() -> FileResponse:
        """Serve the ArcGIS JS SDK data visualization page."""
        return FileResponse(
            STATIC_DIR / "index.html",
            media_type="text/html",
        )

    app.mount(
        "/static",
        StaticFiles(directory=str(STATIC_DIR)),
        name="static",
    )

    return app


app = create_app()
