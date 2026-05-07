from django.urls import path
from .consumers import NowPlayingConsumer

websocket_urlpatterns = [
    path("ws/now-playing/", NowPlayingConsumer.as_asgi()),
]
