"""Application configuration helpers managed via pydantic-settings."""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Base runtime configuration loaded from environment variables."""

    app_name: str = "ESRI FastAPI"
    environment: str = "local"
    debug: bool = False
    version: str = "0.1.0"
    gemini_api_key: str
    bnpb_banjir_url: str
    bnpb_gempa_url: str
    bnpb_likuifikasi_url: str
    crime_feature_url: str
    arcgis_portal_url: str = "https://bluepower.maps.arcgis.com"
    arcgis_username: str = ""
    arcgis_password: str = ""

    model_config = SettingsConfigDict(env_prefix="APP_", env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    """Cache configuration so dependency injection reuses the same Settings object."""

    return Settings()
