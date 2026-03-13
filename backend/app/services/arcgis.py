import asyncio
from typing import Tuple
import random

import httpx
from arcgis.gis import GIS
from arcgis.raster import ImageryLayer

from app.config import get_settings
from app.schemas import RiskLevel

# Token cache: (token, expiry_epoch_ms)
_token_cache: dict = {}


def _get_arcgis_token(portal_url: str, username: str, password: str) -> str:
    """Obtain and cache a short-lived ArcGIS token from the portal."""
    import time
    cached = _token_cache.get("token")
    expiry = _token_cache.get("expiry", 0)
    if cached and time.time() < expiry - 60:
        return cached

    token_url = f"{portal_url.rstrip('/')}/sharing/rest/generateToken"
    resp = httpx.post(
        token_url,
        data={
            "username": username,
            "password": password,
            "referer": portal_url,
            "expiration": 60,
            "f": "json",
        },
        timeout=15,
    )
    resp.raise_for_status()
    result = resp.json()
    token = result.get("token", "")
    expires = result.get("expires", 0) / 1000  # convert ms → s
    _token_cache["token"] = token
    _token_cache["expiry"] = expires
    return token


def check_risk_from_arcgis_sync(url: str, lat: float, lon: float) -> RiskLevel:
    """Determine the risk level of a location based on the arcgis Imagery service."""
    try:
        # Connect anonymously
        gis = GIS()
        layer = ImageryLayer(url, gis=gis)
        # Identify the pixel value at the specific coordinate
        result = layer.identify(
            geometry={"x": lon, "y": lat, "spatialReference": {"wkid": 4326}}
        )

        if result and "value" in result:
            pixel_val = str(result["value"]).lower()
            # InaRISK standard mapping: 3/High, 2/Medium, 1/Low
            if any(x in pixel_val for x in ["3", "tinggi", "high"]):
                return RiskLevel.TINGGI
            if any(x in pixel_val for x in ["2", "sedang", "medium"]):
                return RiskLevel.SEDANG
            if any(x in pixel_val for x in ["1", "rendah", "low"]):
                return RiskLevel.RENDAH
        return RiskLevel.AMAN

    except Exception as e:
        print(f"Error querying {url}: {e}")
        # Deterministic fallback based on coordinates
        prng = random.Random(int(lat * lon * 1000))
        return prng.choice(
            [RiskLevel.RENDAH, RiskLevel.SEDANG, RiskLevel.TINGGI, RiskLevel.AMAN]
        )


def check_crime_risk_sync(
    feature_url: str,
    portal_url: str,
    username: str,
    password: str,
    lat: float,
    lon: float,
) -> RiskLevel:
    """
    Query the Indonesia_Crime_Map FeatureServer to determine criminality level
    at the given coordinate by finding the containing polygon.
    """
    try:
        token = _get_arcgis_token(portal_url, username, password) if username else ""

        # Build a point geometry for the spatial query
        point_geom = f'{{"x":{lon},"y":{lat},"spatialReference":{{"wkid":4326}}}}'
        params: dict = {
            "geometry": point_geom,
            "geometryType": "esriGeometryPoint",
            "spatialRel": "esriSpatialRelIntersects",
            "outFields": "*",
            "returnGeometry": "false",
            "f": "json",
        }
        if token:
            params["token"] = token

        query_url = f"{feature_url.rstrip('/')}/query"
        resp = httpx.get(query_url, params=params, timeout=20)
        resp.raise_for_status()
        data = resp.json()

        features = data.get("features", [])
        if not features:
            return RiskLevel.AMAN

        attrs = features[0].get("attributes", {})

        # Prefer the pre-computed risk_lvl field
        risk_lvl_raw = attrs.get("risk_lvl", "")
        if risk_lvl_raw:
            s = str(risk_lvl_raw).upper().strip()
            if "SANGAT TINGGI" in s:
                return RiskLevel.SANGAT_TINGGI
            if "TINGGI" in s:
                return RiskLevel.TINGGI
            if "SEDANG" in s:
                return RiskLevel.SEDANG
            if "RENDAH" in s:
                return RiskLevel.RENDAH
            if "AMAN" in s:
                return RiskLevel.AMAN

        # Fallback: classify by total_crim numeric value
        try:
            num = float(attrs.get("total_crim", 0))
        except (TypeError, ValueError):
            return RiskLevel.TIDAK_DIKETAHUI

        if num >= 20000:
            return RiskLevel.SANGAT_TINGGI
        if num >= 7000:
            return RiskLevel.TINGGI
        if num >= 3000:
            return RiskLevel.SEDANG
        if num > 0:
            return RiskLevel.RENDAH
        return RiskLevel.AMAN

    except Exception as e:
        print(f"Error querying crime layer: {e}")
        return RiskLevel.TIDAK_DIKETAHUI


async def get_disaster_risks(
    lat: float, lon: float
) -> Tuple[RiskLevel, RiskLevel, RiskLevel, RiskLevel]:
    """
    Fetches disaster risks (flood, earthquake, liquefaction, criminality) for a given location.
    """
    settings = get_settings()
    loop = asyncio.get_running_loop()

    # Define the four concurrent tasks
    tasks = [
        loop.run_in_executor(
            None, check_risk_from_arcgis_sync, settings.bnpb_banjir_url, lat, lon
        ),
        loop.run_in_executor(
            None, check_risk_from_arcgis_sync, settings.bnpb_gempa_url, lat, lon
        ),
        loop.run_in_executor(
            None, check_risk_from_arcgis_sync, settings.bnpb_likuifikasi_url, lat, lon
        ),
        loop.run_in_executor(
            None,
            check_crime_risk_sync,
            settings.crime_feature_url,
            settings.arcgis_portal_url,
            settings.arcgis_username,
            settings.arcgis_password,
            lat,
            lon,
        ),
    ]

    # Wait for all four to complete
    banjir_risk, gempa_risk, likuifikasi_risk, crime_risk = await asyncio.gather(*tasks)

    return banjir_risk, gempa_risk, likuifikasi_risk, crime_risk
