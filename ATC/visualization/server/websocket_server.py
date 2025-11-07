"""WebSocket server implementation for real-time communication."""

import asyncio
import json
import logging
import time
import uuid
from typing import Any, Dict, List, Optional, Set
import websockets
from websockets.server import WebSocketServerProtocol
from websockets.exceptions import ConnectionClosed, WebSocketException

from .message_router import MessageRouter, Message, MessageType

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections and client authentication."""
    
    def __init__(self):
        """Initialize the connection manager."""
        self._connections: Dict[str, WebSocketServerProtocol] = {}
        self._client_metadata: Dict[str, Dict[str, Any]] = {}
        self._subscriptions: Dict[str, Set[str]] = {}  # client_id -> set of event types
        
        logger.info("ConnectionManager initialized")
    
    def add_connection(self, websocket: WebSocketServerProtocol, 
                      client_id: Optional[str] = None) -> str:
        """
        Add a new WebSocket connection.
        
        Args:
            websocket: WebSocket connection
            client_id: Optional client ID, will generate if not provided
            
        Returns:
            Client ID for the connection
        """
        if client_id is None:
            client_id = str(uuid.uuid4())
        
        self._connections[client_id] = websocket
        self._client_metadata[client_id] = {
            "connected_at": time.time(),
            "remote_address": websocket.remote_address,
            "last_heartbeat": time.time()
        }
        self._subscriptions[client_id] = set()
        
        logger.info(f"Added connection for client {client_id} from {websocket.remote_address}")
        return client_id
    
    def remove_connection(self, client_id: str) -> bool:
        """
        Remove a WebSocket connection.
        
        Args:
            client_id: Client ID to remove
            
        Returns:
            True if connection was found and removed
        """
        if client_id in self._connections:
            del self._connections[client_id]
            del self._client_metadata[client_id]
            del self._subscriptions[client_id]
            logger.info(f"Removed connection for client {client_id}")
            return True
        
        logger.warning(f"Attempted to remove non-existent client {client_id}")
        return False
    
    def get_connection(self, client_id: str) -> Optional[WebSocketServerProtocol]:
        """
        Get WebSocket connection for a client.
        
        Args:
            client_id: Client ID
            
        Returns:
            WebSocket connection or None if not found
        """
        return self._connections.get(client_id)
    
    def get_all_connections(self) -> Dict[str, WebSocketServerProtocol]:
        """Get all active connections."""
        return self._connections.copy()
    
    def get_client_count(self) -> int:
        """Get number of active connections."""
        return len(self._connections)
    
    def add_subscription(self, client_id: str, event_type: str) -> bool:
        """
        Add event subscription for a client.
        
        Args:
            client_id: Client ID
            event_type: Event type to subscribe to
            
        Returns:
            True if subscription was added
        """
        if client_id in self._subscriptions:
            self._subscriptions[client_id].add(event_type)
            logger.debug(f"Client {client_id} subscribed to {event_type}")
            return True
        return False
    
    def remove_subscription(self, client_id: str, event_type: str) -> bool:
        """
        Remove event subscription for a client.
        
        Args:
            client_id: Client ID
            event_type: Event type to unsubscribe from
            
        Returns:
            True if subscription was removed
        """
        if client_id in self._subscriptions:
            self._subscriptions[client_id].discard(event_type)
            logger.debug(f"Client {client_id} unsubscribed from {event_type}")
            return True
        return False
    
    def get_subscriptions(self, client_id: str) -> Set[str]:
        """
        Get event subscriptions for a client.
        
        Args:
            client_id: Client ID
            
        Returns:
            Set of subscribed event types
        """
        return self._subscriptions.get(client_id, set()).copy()
    
    def get_subscribers(self, event_type: str) -> List[str]:
        """
        Get clients subscribed to an event type.
        
        Args:
            event_type: Event type
            
        Returns:
            List of client IDs subscribed to the event type
        """
        return [client_id for client_id, subscriptions in self._subscriptions.items()
                if event_type in subscriptions]
    
    def update_heartbeat(self, client_id: str) -> None:
        """
        Update last heartbeat time for a client.
        
        Args:
            client_id: Client ID
        """
        if client_id in self._client_metadata:
            self._client_metadata[client_id]["last_heartbeat"] = time.time()
    
    def get_stale_connections(self, timeout_seconds: float = 60.0) -> List[str]:
        """
        Get connections that haven't sent a heartbeat recently.
        
        Args:
            timeout_seconds: Timeout in seconds
            
        Returns:
            List of stale client IDs
        """
        current_time = time.time()
        stale_clients = []
        
        for client_id, metadata in self._client_metadata.items():
            if current_time - metadata["last_heartbeat"] > timeout_seconds:
                stale_clients.append(client_id)
        
        return stale_clients


class WebSocketServer:
    """WebSocket server for real-time communication with web dashboard."""
    
    def __init__(self, host: str = "localhost", port: int = 8080):
        """
        Initialize the WebSocket server.
        
        Args:
            host: Host address to bind to
            port: Port to listen on
        """
        self.host = host
        self.port = port
        self.connection_manager = ConnectionManager()
        self.message_router = MessageRouter()
        self._server = None
        self._running = False
        self._heartbeat_task = None
        
        # Register default message handlers
        self._register_default_handlers()
        
        logger.info(f"WebSocketServer initialized on {host}:{port}")
    
    async def start(self) -> None:
        """Start the WebSocket server."""
        if self._running:
            logger.warning("Server is already running")
            return
        
        try:
            self._server = await websockets.serve(
                self._handle_connection,
                self.host,
                self.port,
                ping_interval=30,
                ping_timeout=10
            )
            self._running = True
            
            # Start heartbeat task
            self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())
            
            logger.info(f"WebSocket server started on {self.host}:{self.port}")
            
        except Exception as e:
            logger.error(f"Failed to start WebSocket server: {e}")
            raise
    
    async def stop(self) -> None:
        """Stop the WebSocket server."""
        if not self._running:
            return
        
        logger.info("Stopping WebSocket server")
        self._running = False
        
        # Cancel heartbeat task
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
            try:
                await self._heartbeat_task
            except asyncio.CancelledError:
                pass
        
        # Close all connections
        connections = self.connection_manager.get_all_connections()
        if connections:
            await asyncio.gather(
                *[conn.close() for conn in connections.values()],
                return_exceptions=True
            )
        
        # Stop server
        if self._server:
            self._server.close()
            await self._server.wait_closed()
        
        logger.info("WebSocket server stopped")
    
    async def broadcast(self, message: Message, event_type: Optional[str] = None) -> int:
        """
        Broadcast a message to all connected clients or subscribers.
        
        Args:
            message: Message to broadcast
            event_type: If provided, only send to clients subscribed to this event type
            
        Returns:
            Number of clients the message was sent to
        """
        if event_type:
            client_ids = self.connection_manager.get_subscribers(event_type)
        else:
            client_ids = list(self.connection_manager.get_all_connections().keys())
        
        sent_count = 0
        for client_id in client_ids:
            if await self.send_to_client(client_id, message):
                sent_count += 1
        
        return sent_count
    
    async def send_to_client(self, client_id: str, message: Message) -> bool:
        """
        Send a message to a specific client.
        
        Args:
            client_id: Client ID
            message: Message to send
            
        Returns:
            True if message was sent successfully
        """
        connection = self.connection_manager.get_connection(client_id)
        if not connection:
            logger.warning(f"No connection found for client {client_id}")
            return False
        
        try:
            await connection.send(message.to_json())
            logger.debug(f"Sent {message.type} message to client {client_id}")
            return True
            
        except ConnectionClosed:
            logger.info(f"Connection closed for client {client_id}")
            self.connection_manager.remove_connection(client_id)
            return False
            
        except WebSocketException as e:
            logger.error(f"WebSocket error sending to client {client_id}: {e}")
            self.connection_manager.remove_connection(client_id)
            return False
            
        except Exception as e:
            logger.error(f"Unexpected error sending to client {client_id}: {e}")
            return False
    
    def register_message_handler(self, message_type: MessageType,
                                handler: callable) -> None:
        """
        Register a custom message handler.
        
        Args:
            message_type: Type of message to handle
            handler: Handler function
        """
        self.message_router.register_handler(message_type, handler)
    
    async def _handle_connection(self, websocket: WebSocketServerProtocol, path: str) -> None:
        """Handle a new WebSocket connection."""
        client_id = self.connection_manager.add_connection(websocket)
        
        try:
            # Send welcome message
            welcome_message = Message(
                type=MessageType.TRAINING_STATUS,
                data={"status": "connected", "client_id": client_id},
                client_id=client_id
            )
            await websocket.send(welcome_message.to_json())
            
            # Handle messages
            async for raw_message in websocket:
                try:
                    message = Message.from_json(raw_message)
                    message.client_id = client_id
                    message.timestamp = time.time()
                    
                    # Update heartbeat
                    self.connection_manager.update_heartbeat(client_id)
                    
                    # Route message
                    self.message_router.route_message(message, client_id)
                    
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON from client {client_id}: {e}")
                    error_msg = self.message_router.create_error_message(
                        "Invalid JSON format", client_id
                    )
                    await websocket.send(error_msg.to_json())
                    
                except Exception as e:
                    logger.error(f"Error processing message from client {client_id}: {e}")
                    error_msg = self.message_router.create_error_message(
                        "Message processing error", client_id
                    )
                    await websocket.send(error_msg.to_json())
        
        except ConnectionClosed:
            logger.info(f"Client {client_id} disconnected")
        except Exception as e:
            logger.error(f"Error handling connection for client {client_id}: {e}")
        finally:
            self.connection_manager.remove_connection(client_id)
    
    def _register_default_handlers(self) -> None:
        """Register default message handlers."""
        
        def handle_subscribe(message: Message, client_id: str) -> None:
            """Handle subscription requests."""
            event_type = message.data.get("event_type")
            if event_type:
                self.connection_manager.add_subscription(client_id, event_type)
                logger.info(f"Client {client_id} subscribed to {event_type}")
        
        def handle_unsubscribe(message: Message, client_id: str) -> None:
            """Handle unsubscription requests."""
            event_type = message.data.get("event_type")
            if event_type:
                self.connection_manager.remove_subscription(client_id, event_type)
                logger.info(f"Client {client_id} unsubscribed from {event_type}")
        
        def handle_heartbeat(message: Message, client_id: str) -> None:
            """Handle heartbeat messages."""
            self.connection_manager.update_heartbeat(client_id)
        
        self.message_router.register_handler(MessageType.SUBSCRIBE, handle_subscribe)
        self.message_router.register_handler(MessageType.UNSUBSCRIBE, handle_unsubscribe)
        self.message_router.register_handler(MessageType.HEARTBEAT, handle_heartbeat)
    
    async def _heartbeat_loop(self) -> None:
        """Send periodic heartbeats and clean up stale connections."""
        while self._running:
            try:
                # Send heartbeat to all clients
                heartbeat_msg = self.message_router.create_heartbeat_message()
                await self.broadcast(heartbeat_msg)
                
                # Clean up stale connections
                stale_clients = self.connection_manager.get_stale_connections(timeout_seconds=120)
                for client_id in stale_clients:
                    logger.info(f"Removing stale connection: {client_id}")
                    connection = self.connection_manager.get_connection(client_id)
                    if connection:
                        try:
                            await connection.close()
                        except Exception:
                            pass
                    self.connection_manager.remove_connection(client_id)
                
                await asyncio.sleep(30)  # Send heartbeat every 30 seconds
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in heartbeat loop: {e}")
                await asyncio.sleep(30)