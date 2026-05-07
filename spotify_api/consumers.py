"""WebSocket consumer — streams currently-playing updates."""
import asyncio
import json
import aiohttp
from channels.generic.websocket import AsyncWebsocketConsumer


class NowPlayingConsumer(AsyncWebsocketConsumer):
    POLL_INTERVAL = 5  # seconds between Spotify API polls

    async def connect(self):
        await self.accept()
        self.token = None
        self._task = None

    async def receive(self, text_data):
        # First message must be {"token": "..."}
        if self.token is not None:
            return
        try:
            data = json.loads(text_data)
            self.token = data.get("token")
        except Exception:
            pass
        if not self.token:
            await self.close(code=4001)
            return
        self._task = asyncio.create_task(self._poll_loop())

    async def disconnect(self, code):
        if self._task:
            self._task.cancel()

    async def _poll_loop(self):
        while True:
            try:
                data = await self._fetch_now_playing()
                await self.send(text_data=json.dumps(data))
            except Exception as exc:
                await self.send(text_data=json.dumps({"error": str(exc)}))
            await asyncio.sleep(self.POLL_INTERVAL)

    async def _fetch_now_playing(self) -> dict:
        url = "https://api.spotify.com/v1/me/player/currently-playing"
        headers = {"Authorization": f"Bearer {self.token}"}
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as resp:
                if resp.status == 204:
                    return {"is_playing": False}
                resp.raise_for_status()
                return await resp.json()
