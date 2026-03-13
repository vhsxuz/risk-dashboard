import asyncio
import httpx

async def test():
    target_url = "https://gis.bnpb.go.id/server/rest/services/inarisk/INDEKS_BAHAYA_BANJIR/ImageServer"
    params = {"f": "json"}
    async with httpx.AsyncClient(follow_redirects=True) as client:
        try:
            resp = await client.request("GET", target_url, params=params)
            print("Status:", resp.status_code)
            print("Headers:", resp.headers)
            print("Content type:", type(resp.content))
        except Exception as e:
            print("Exception:", e)

asyncio.run(test())
