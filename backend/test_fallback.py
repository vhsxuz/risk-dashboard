import asyncio
from app.services.arcgis import check_risk_from_arcgis_sync
from app.config import get_settings

def main():
    s = get_settings()
    # Test Banjir
    try:
        r = check_risk_from_arcgis_sync(s.bnpb_banjir_url, -6.3, 106.8)
        print("Banjir Result:", r)
    except Exception as e:
        print("Banjir exception:", e)
        
    # Test Gempa
    try:
        r = check_risk_from_arcgis_sync(s.bnpb_gempa_url, -6.3, 106.8)
        print("Gempa Result:", r)
    except Exception as e:
        print("Gempa exception:", e)

main()
