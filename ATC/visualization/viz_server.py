"""
WebSocket server for real-time visualization of ATC training.

Provides a lightweight server that streams simulation state to web clients
and serves a simple HTTP API for historical data.
"""
import asyncio
import json
from typing import Set, Dict, Any, List
from collections import deque
import websockets
from websockets.server import WebSocketServerProtocol


class VisualizationServer:
    """
    WebSocket server for streaming training data to visualization clients.

    Manages connections, message queuing, and broadcasting to multiple clients.
    """

    def __init__(self, host: str = "localhost", port: int = 8765):
        """
        Initialize visualization server.

        Args:
            host: Host address to bind to
            port: Port to listen on
        """
        self.host = host
        self.port = port
        self.clients: Set[WebSocketServerProtocol] = set()
        self.message_queue: deque = deque(maxlen=1000)
        self.episode_history: List[Dict] = []
        self.current_episode_data: List[Dict] = []
        self.is_running = False
        self._loop = None  # Store event loop reference

    async def start(self):
        """Start the WebSocket server."""
        self.is_running = True
        self._loop = asyncio.get_running_loop()  # Store loop reference
        async with websockets.serve(self._handle_client, self.host, self.port):
            print(f"Visualization server running on ws://{self.host}:{self.port}")
            await asyncio.Future()  # Run forever

    async def _handle_client(self, websocket: WebSocketServerProtocol, path: str):
        """
        Handle a new client connection.

        Args:
            websocket: WebSocket connection
            path: Request path
        """
        self.clients.add(websocket)
        print(f"Client connected. Total clients: {len(self.clients)}")

        try:
            # Send current state on connect
            if self.current_episode_data:
                await websocket.send(json.dumps({
                    "type": "init",
                    "episode_data": self.current_episode_data[-1] if self.current_episode_data else {}
                }))

            # Handle incoming messages from client
            async for message in websocket:
                await self._handle_message(websocket, message)

        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.clients.remove(websocket)
            print(f"Client disconnected. Total clients: {len(self.clients)}")

    async def _handle_message(self, websocket: WebSocketServerProtocol, message: str):
        """
        Handle messages from clients.

        Args:
            websocket: Client websocket
            message: JSON message string
        """
        try:
            data = json.loads(message)
            msg_type = data.get("type")

            if msg_type == "get_history":
                # Send episode history
                await websocket.send(json.dumps({
                    "type": "history",
                    "episodes": self.episode_history
                }))

            elif msg_type == "get_episode":
                # Send specific episode data
                episode_id = data.get("episode_id")
                if episode_id < len(self.episode_history):
                    await websocket.send(json.dumps({
                        "type": "episode_data",
                        "data": self.episode_history[episode_id]
                    }))

        except json.JSONDecodeError:
            print(f"Invalid JSON received: {message}")

    def queue_message(self, data: Dict[str, Any]):
        """
        Queue a message for broadcasting to all clients.
        Thread-safe method that can be called from any thread.

        Args:
            data: Message data dictionary
        """
        self.message_queue.append(data)

        # Store episode data
        if data["type"] == "step":
            self.current_episode_data.append(data)
        elif data["type"] == "episode_end":
            self.episode_history.append({
                "episode_id": len(self.episode_history),
                "steps": self.current_episode_data,
                "summary": data
            })
            self.current_episode_data = []

        # Broadcast using thread-safe call
        if self._loop and self._loop.is_running():
            asyncio.run_coroutine_threadsafe(self._broadcast(data), self._loop)

    async def _broadcast(self, data: Dict[str, Any]):
        """
        Broadcast message to all connected clients.

        Args:
            data: Message data dictionary
        """
        if not self.clients:
            return

        message = json.dumps(data)
        disconnected = set()

        for client in self.clients:
            try:
                await client.send(message)
            except websockets.exceptions.ConnectionClosed:
                disconnected.add(client)

        # Remove disconnected clients
        self.clients -= disconnected


async def run_server(host: str = "localhost", port: int = 8765):
    """
    Run visualization server (convenience function).

    Args:
        host: Host address
        port: Port number
    """
    server = VisualizationServer(host, port)
    await server.start()


if __name__ == "__main__":
    # Run server standalone for testing
    print("Starting ATC Visualization Server...")
    asyncio.run(run_server())
