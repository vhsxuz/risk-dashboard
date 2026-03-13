"""Risk assessment API route."""
from fastapi import APIRouter, Request, status
from fastapi.responses import Response
import httpx

from app.schemas import RiskRequest, RiskResponse
from app.services.arcgis import get_disaster_risks

router = APIRouter()

@router.post(
    "",
    response_model=RiskResponse,
    status_code=status.HTTP_200_OK,
    summary="Get disaster risk for given coordinates",
)
async def get_risk(payload: RiskRequest) -> RiskResponse:
    """Assess the risk of flood, earthquake, liquefaction, and criminality for a point."""
    banjir_risk, gempa_risk, likuifikasi_risk, crime_risk = await get_disaster_risks(
        payload.latitude,
        payload.longitude
    )
    return RiskResponse(
        latitude=payload.latitude,
        longitude=payload.longitude,
        risiko_banjir=banjir_risk,
        risiko_gempa=gempa_risk,
        risiko_likuifikasi=likuifikasi_risk,
        risiko_kriminalitas=crime_risk,
    )


async def proxy_stream(url: str, params: dict):
    """Stream response from the external URL using httpx."""
    async with httpx.AsyncClient(follow_redirects=True) as client:
        async with client.stream("GET", url, params=params) as response:
            async for chunk in response.aiter_bytes():
                yield chunk


@router.api_route("/proxy/{path:path}", methods=["GET", "POST", "HEAD", "OPTIONS"], summary="Proxy BNPB ImageServer tile requests")
async def proxy_image_server(path: str, request: Request):
    """
    Proxy requests to gis.bnpb.go.id to bypass browser CORS on file:// protocols.
    """
    # If it's an OPTIONS request, just handle it instantly for CORS.
    if request.method == "OPTIONS":
        return Response(status_code=200)

    target_url = f"https://gis.bnpb.go.id/server/rest/services/{path}"

    # Extract query params
    params = dict(request.query_params)

    # Spoof a standard User-Agent so the BNPB firewall doesn't drop httpx to a 500 error.
    custom_headers = {
        "User-Agent": request.headers.get("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
    }

    async with httpx.AsyncClient(follow_redirects=True, headers=custom_headers) as client:
        # Dynamically forward the exact request method
        upstream_response = await client.request(request.method, target_url, params=params)

        # We must return the same content type as the upstream server (e.g., image/png)
        content_type = upstream_response.headers.get("Content-Type", "application/octet-stream")

        return Response(
            content=upstream_response.content,
            media_type=content_type,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
                "Access-Control-Allow-Headers": "*"
            }
        )


@router.api_route(
    "/proxy-crime/{path:path}",
    methods=["GET", "POST", "HEAD", "OPTIONS"],
    summary="Proxy ArcGIS Crime FeatureServer requests",
)
async def proxy_crime_server(path: str, request: Request):
    """
    Proxy requests to services7.arcgis.com to bypass CORS on file:// protocols.
    Automatically injects an ArcGIS token generated from portal credentials.
    """
    import asyncio
    from app.services.arcgis import _get_arcgis_token
    from app.config import get_settings

    if request.method == "OPTIONS":
        return Response(status_code=200)

    settings = get_settings()
    target_url = (
        f"https://services7.arcgis.com/tmqVLPK64el0IJoS/arcgis/rest/services/{path}"
    )

    params = dict(request.query_params)

    # _get_arcgis_token is synchronous (uses httpx sync client).
    # Run it in a thread-pool so it never blocks the async event loop.
    if settings.arcgis_username:
        try:
            loop = asyncio.get_running_loop()
            token = await loop.run_in_executor(
                None,
                _get_arcgis_token,
                settings.arcgis_portal_url,
                settings.arcgis_username,
                settings.arcgis_password,
            )
            if token:
                params["token"] = token
        except Exception as exc:
            print(f"Token generation failed: {exc}")

    custom_headers = {
        "User-Agent": request.headers.get(
            "user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        )
    }

    timeout = httpx.Timeout(30.0, connect=10.0)
    async with httpx.AsyncClient(
        follow_redirects=True, headers=custom_headers, timeout=timeout
    ) as client:
        upstream_response = await client.request(
            request.method, target_url, params=params
        )
        content_type = upstream_response.headers.get(
            "Content-Type", "application/octet-stream"
        )
        return Response(
            content=upstream_response.content,
            media_type=content_type,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
                "Access-Control-Allow-Headers": "*",
            },
        )
@router.api_route(
    "/proxy-geocode/{path:path}",
    methods=["GET", "POST", "HEAD", "OPTIONS"],
    summary="Proxy ArcGIS Geocoding requests",
)
async def proxy_geocode_server(path: str, request: Request):
    """
    Proxy requests to geocode.arcgis.com to bypass CORS and inject token.
    """
    import asyncio

    from app.config import get_settings
    from app.services.arcgis import _get_arcgis_token

    if request.method == "OPTIONS":
        return Response(status_code=200)

    settings = get_settings()
    # The geocoding service base URL
    target_url = (
        f"https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/{path}"
    )

    params = dict(request.query_params)

    # Inject token if configured
    if settings.arcgis_username:
        try:
            loop = asyncio.get_running_loop()
            token = await loop.run_in_executor(
                None,
                _get_arcgis_token,
                settings.arcgis_portal_url,
                settings.arcgis_username,
                settings.arcgis_password,
            )
            if token:
                params["token"] = token
        except Exception as exc:
            print(f"Geocode token generation failed: {exc}")

    # Inject default format if not specified
    if "f" not in params:
        params["f"] = "json"

    custom_headers = {
        "User-Agent": request.headers.get(
            "user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        )
    }

    timeout = httpx.Timeout(30.0, connect=10.0)
    async with httpx.AsyncClient(
        follow_redirects=True, headers=custom_headers, timeout=timeout
    ) as client:
        upstream_response = await client.request(
            request.method, target_url, params=params
        )
        content_type = upstream_response.headers.get(
            "Content-Type", "application/octet-stream"
        )
        return Response(
            content=upstream_response.content,
            media_type=content_type,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
                "Access-Control-Allow-Headers": "*",
            },
        )
