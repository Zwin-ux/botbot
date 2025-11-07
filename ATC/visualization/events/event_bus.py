"""Event bus implementation for publish/subscribe pattern."""

import asyncio
import logging
import threading
import time
import uuid
from collections import defaultdict, deque
from typing import Any, Callable, Dict, List, Optional, Set
from concurrent.futures import ThreadPoolExecutor

from .event_data import EventData, EventType


logger = logging.getLogger(__name__)


class EventBus:
    """
    Thread-safe event bus for publish/subscribe pattern.
    
    Supports both synchronous and asynchronous event handling with
    rate limiting and event filtering capabilities.
    """
    
    def __init__(self, max_history: int = 1000, rate_limit_per_second: int = 1000):
        """
        Initialize the event bus.
        
        Args:
            max_history: Maximum number of events to keep in history
            rate_limit_per_second: Maximum events per second to prevent flooding
        """
        self._subscribers: Dict[EventType, Dict[str, Callable]] = defaultdict(dict)
        self._async_subscribers: Dict[EventType, Dict[str, Callable]] = defaultdict(dict)
        self._event_history: deque = deque(maxlen=max_history)
        self._rate_limit = rate_limit_per_second
        self._rate_counter = 0
        self._rate_window_start = time.time()
        self._lock = threading.RLock()
        self._executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="EventBus")
        self._running = True
        
        # Event filtering
        self._filters: Dict[str, Callable[[EventData], bool]] = {}
        
        logger.info(f"EventBus initialized with max_history={max_history}, "
                   f"rate_limit={rate_limit_per_second}/sec")
    
    def subscribe(self, event_type: EventType, callback: Callable[[EventData], None]) -> str:
        """
        Subscribe to events of a specific type.
        
        Args:
            event_type: Type of events to subscribe to
            callback: Function to call when event occurs
            
        Returns:
            Subscription ID for unsubscribing
        """
        subscription_id = str(uuid.uuid4())
        
        with self._lock:
            if asyncio.iscoroutinefunction(callback):
                self._async_subscribers[event_type][subscription_id] = callback
                logger.debug(f"Added async subscriber {subscription_id} for {event_type}")
            else:
                self._subscribers[event_type][subscription_id] = callback
                logger.debug(f"Added sync subscriber {subscription_id} for {event_type}")
        
        return subscription_id
    
    def unsubscribe(self, subscription_id: str) -> bool:
        """
        Unsubscribe from events.
        
        Args:
            subscription_id: ID returned from subscribe()
            
        Returns:
            True if subscription was found and removed
        """
        with self._lock:
            # Check sync subscribers
            for event_type, subscribers in self._subscribers.items():
                if subscription_id in subscribers:
                    del subscribers[subscription_id]
                    logger.debug(f"Removed sync subscriber {subscription_id} for {event_type}")
                    return True
            
            # Check async subscribers
            for event_type, subscribers in self._async_subscribers.items():
                if subscription_id in subscribers:
                    del subscribers[subscription_id]
                    logger.debug(f"Removed async subscriber {subscription_id} for {event_type}")
                    return True
        
        logger.warning(f"Subscription {subscription_id} not found")
        return False
    
    def publish(self, event: EventData) -> None:
        """
        Publish an event to all subscribers.
        
        Args:
            event: Event data to publish
        """
        if not self._running:
            return
        
        # Rate limiting check
        if not self._check_rate_limit():
            logger.warning(f"Rate limit exceeded, dropping event {event.event_type}")
            return
        
        # Apply filters
        if not self._apply_filters(event):
            logger.debug(f"Event {event.event_type} filtered out")
            return
        
        # Add to history
        with self._lock:
            self._event_history.append(event)
        
        # Notify subscribers
        self._notify_subscribers(event)
        
        logger.debug(f"Published event {event.event_type} at {event.timestamp}")
    
    def publish_async(self, event: EventData) -> None:
        """
        Publish an event asynchronously (non-blocking).
        
        Args:
            event: Event data to publish
        """
        if not self._running:
            return
        
        self._executor.submit(self.publish, event)
    
    def add_filter(self, filter_id: str, filter_func: Callable[[EventData], bool]) -> None:
        """
        Add an event filter.
        
        Args:
            filter_id: Unique identifier for the filter
            filter_func: Function that returns True if event should be processed
        """
        with self._lock:
            self._filters[filter_id] = filter_func
        logger.debug(f"Added filter {filter_id}")
    
    def remove_filter(self, filter_id: str) -> bool:
        """
        Remove an event filter.
        
        Args:
            filter_id: ID of filter to remove
            
        Returns:
            True if filter was found and removed
        """
        with self._lock:
            if filter_id in self._filters:
                del self._filters[filter_id]
                logger.debug(f"Removed filter {filter_id}")
                return True
        
        logger.warning(f"Filter {filter_id} not found")
        return False
    
    def get_event_history(self, event_type: Optional[EventType] = None, 
                         limit: Optional[int] = None) -> List[EventData]:
        """
        Get event history, optionally filtered by type.
        
        Args:
            event_type: Filter by specific event type (optional)
            limit: Maximum number of events to return (optional)
            
        Returns:
            List of historical events
        """
        with self._lock:
            events = list(self._event_history)
        
        if event_type:
            events = [e for e in events if e.event_type == event_type]
        
        if limit:
            events = events[-limit:]
        
        return events
    
    def get_subscriber_count(self, event_type: Optional[EventType] = None) -> int:
        """
        Get number of subscribers for an event type or total.
        
        Args:
            event_type: Specific event type (optional)
            
        Returns:
            Number of subscribers
        """
        with self._lock:
            if event_type:
                sync_count = len(self._subscribers.get(event_type, {}))
                async_count = len(self._async_subscribers.get(event_type, {}))
                return sync_count + async_count
            else:
                total_sync = sum(len(subs) for subs in self._subscribers.values())
                total_async = sum(len(subs) for subs in self._async_subscribers.values())
                return total_sync + total_async
    
    def shutdown(self) -> None:
        """Shutdown the event bus and cleanup resources."""
        logger.info("Shutting down EventBus")
        self._running = False
        self._executor.shutdown(wait=True)
        
        with self._lock:
            self._subscribers.clear()
            self._async_subscribers.clear()
            self._event_history.clear()
            self._filters.clear()
    
    def _check_rate_limit(self) -> bool:
        """Check if we're within rate limits."""
        current_time = time.time()
        
        # Reset counter if we're in a new time window
        if current_time - self._rate_window_start >= 1.0:
            self._rate_counter = 0
            self._rate_window_start = current_time
        
        if self._rate_counter >= self._rate_limit:
            return False
        
        self._rate_counter += 1
        return True
    
    def _apply_filters(self, event: EventData) -> bool:
        """Apply all filters to an event."""
        with self._lock:
            for filter_func in self._filters.values():
                try:
                    if not filter_func(event):
                        return False
                except Exception as e:
                    logger.error(f"Error in event filter: {e}")
                    # Continue processing if filter fails
        return True
    
    def _notify_subscribers(self, event: EventData) -> None:
        """Notify all subscribers of an event."""
        # Notify synchronous subscribers
        with self._lock:
            sync_subscribers = self._subscribers.get(event.event_type, {}).copy()
            async_subscribers = self._async_subscribers.get(event.event_type, {}).copy()
        
        # Handle sync subscribers in thread pool to avoid blocking
        for callback in sync_subscribers.values():
            self._executor.submit(self._safe_callback, callback, event)
        
        # Handle async subscribers
        for callback in async_subscribers.values():
            self._executor.submit(self._safe_async_callback, callback, event)
    
    def _safe_callback(self, callback: Callable, event: EventData) -> None:
        """Safely execute a callback with error handling."""
        try:
            callback(event)
        except Exception as e:
            logger.error(f"Error in event callback: {e}", exc_info=True)
    
    def _safe_async_callback(self, callback: Callable, event: EventData) -> None:
        """Safely execute an async callback with error handling."""
        try:
            # Run async callback in new event loop if needed
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            if loop.is_running():
                # If loop is already running, schedule the coroutine
                asyncio.create_task(callback(event))
            else:
                # Run the coroutine
                loop.run_until_complete(callback(event))
        except Exception as e:
            logger.error(f"Error in async event callback: {e}", exc_info=True)


# Global event bus instance
_global_event_bus: Optional[EventBus] = None


def get_event_bus() -> EventBus:
    """Get the global event bus instance."""
    global _global_event_bus
    if _global_event_bus is None:
        _global_event_bus = EventBus()
    return _global_event_bus


def shutdown_event_bus() -> None:
    """Shutdown the global event bus."""
    global _global_event_bus
    if _global_event_bus is not None:
        _global_event_bus.shutdown()
        _global_event_bus = None