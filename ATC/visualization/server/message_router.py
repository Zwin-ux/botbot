"""Message routing system for different data types."""

import json
import logging
from enum import Enum
from typing import Any, Callable, Dict, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class MessageType(str, Enum):
    """Types of messages that can be sent through WebSocket."""
    
    # Client to server messages
    SUBSCRIBE = "subscribe"
    UNSUBSCRIBE = "unsubscribe"
    TRAINING_CONTROL = "training_control"
    TRAINING_COMMAND = "training_command"
    SCENARIO_SELECT = "scenario_select"
    SCENARIO_COMMAND = "scenario_command"
    DATA_REQUEST = "data_request"
    
    # Server to client messages
    EVENT_DATA = "event_data"
    TRAINING_STATUS = "training_status"
    ERROR = "error"
    HEARTBEAT = "heartbeat"


@dataclass
class Message:
    """WebSocket message structure."""
    
    type: MessageType
    data: Dict[str, Any]
    client_id: Optional[str] = None
    timestamp: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert message to dictionary."""
        return {
            "type": self.type.value,
            "data": self.data,
            "client_id": self.client_id,
            "timestamp": self.timestamp
        }
    
    def to_json(self) -> str:
        """Convert message to JSON string."""
        return json.dumps(self.to_dict())
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Message":
        """Create message from dictionary."""
        return cls(
            type=MessageType(data["type"]),
            data=data["data"],
            client_id=data.get("client_id"),
            timestamp=data.get("timestamp")
        )
    
    @classmethod
    def from_json(cls, json_str: str) -> "Message":
        """Create message from JSON string."""
        data = json.loads(json_str)
        return cls.from_dict(data)


class MessageRouter:
    """Routes messages to appropriate handlers based on message type."""
    
    def __init__(self):
        """Initialize the message router."""
        self._handlers: Dict[MessageType, Callable[[Message, str], None]] = {}
        self._default_handler: Optional[Callable[[Message, str], None]] = None
        
        logger.info("MessageRouter initialized")
    
    def register_handler(self, message_type: MessageType, 
                        handler: Callable[[Message, str], None]) -> None:
        """
        Register a handler for a specific message type.
        
        Args:
            message_type: Type of message to handle
            handler: Function to handle the message (message, client_id) -> None
        """
        self._handlers[message_type] = handler
        logger.debug(f"Registered handler for {message_type}")
    
    def set_default_handler(self, handler: Callable[[Message, str], None]) -> None:
        """
        Set default handler for unregistered message types.
        
        Args:
            handler: Default handler function
        """
        self._default_handler = handler
        logger.debug("Set default message handler")
    
    def route_message(self, message: Message, client_id: str) -> None:
        """
        Route a message to the appropriate handler.
        
        Args:
            message: Message to route
            client_id: ID of the client that sent the message
        """
        try:
            handler = self._handlers.get(message.type)
            
            if handler:
                logger.debug(f"Routing {message.type} message from client {client_id}")
                handler(message, client_id)
            elif self._default_handler:
                logger.debug(f"Using default handler for {message.type} from client {client_id}")
                self._default_handler(message, client_id)
            else:
                logger.warning(f"No handler found for message type {message.type} from client {client_id}")
                
        except Exception as e:
            logger.error(f"Error routing message {message.type} from client {client_id}: {e}", 
                        exc_info=True)
    
    def create_error_message(self, error_msg: str, client_id: Optional[str] = None) -> Message:
        """
        Create an error message.
        
        Args:
            error_msg: Error message text
            client_id: Client ID (optional)
            
        Returns:
            Error message
        """
        return Message(
            type=MessageType.ERROR,
            data={"error": error_msg},
            client_id=client_id
        )
    
    def create_heartbeat_message(self, client_id: Optional[str] = None) -> Message:
        """
        Create a heartbeat message.
        
        Args:
            client_id: Client ID (optional)
            
        Returns:
            Heartbeat message
        """
        return Message(
            type=MessageType.HEARTBEAT,
            data={"status": "alive"},
            client_id=client_id
        )
    
    def create_event_data_message(self, event_data: Dict[str, Any], 
                                 client_id: Optional[str] = None) -> Message:
        """
        Create an event data message.
        
        Args:
            event_data: Event data to send
            client_id: Client ID (optional)
            
        Returns:
            Event data message
        """
        return Message(
            type=MessageType.EVENT_DATA,
            data=event_data,
            client_id=client_id
        )
    
    def create_training_status_message(self, status_data: Dict[str, Any],
                                     client_id: Optional[str] = None) -> Message:
        """
        Create a training status message.
        
        Args:
            status_data: Training status data
            client_id: Client ID (optional)
            
        Returns:
            Training status message
        """
        return Message(
            type=MessageType.TRAINING_STATUS,
            data=status_data,
            client_id=client_id
        )