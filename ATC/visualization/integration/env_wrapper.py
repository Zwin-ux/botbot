"""Environment wrapper for publishing events to the event bus."""

import time
import numpy as np
from typing import Any, Dict, Optional, Tuple
import gymnasium as gym

from ..events import EventBus, get_event_bus
from ..events.event_data import (
    EnvironmentResetEvent, 
    EnvironmentStepEvent, 
    SafetyViolationEvent,
    EventType
)


class EventPublishingEnvWrapper(gym.Wrapper):
    """
    Wrapper that publishes environment events to the event bus.
    
    This wrapper intercepts reset() and step() calls to publish
    events for visualization and analysis components.
    """
    
    def __init__(self, env: gym.Env, event_bus: Optional[EventBus] = None,
                 publish_rate_limit: int = 100):
        """
        Initialize the event publishing wrapper.
        
        Args:
            env: Environment to wrap
            event_bus: Event bus instance (uses global if None)
            publish_rate_limit: Maximum events per second to prevent flooding
        """
        super().__init__(env)
        self.event_bus = event_bus or get_event_bus()
        self.publish_rate_limit = publish_rate_limit
        self._last_publish_time = 0.0
        self._publish_counter = 0
        self._episode_start_time = 0.0
        
        # Safety violation tracking
        self._min_separation_threshold = 5.0  # NM
        self._critical_separation_threshold = 3.0  # NM
        
    def reset(self, **kwargs) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Reset environment and publish reset event."""
        self._episode_start_time = time.time()
        self._publish_counter = 0
        
        observation, info = self.env.reset(**kwargs)
        
        # Create scenario config from environment attributes
        scenario_config = {
            "scenario": getattr(self.env, "scenario", "unknown"),
            "step_seconds": getattr(self.env, "step_seconds", 5.0),
            "horizon": getattr(self.env, "_horizon", 400),
            "max_aircraft": getattr(self.env, "MAX_AC", 16) if hasattr(self.env, "MAX_AC") else 16
        }
        
        # Publish reset event
        reset_event = EnvironmentResetEvent(
            timestamp=self._episode_start_time,
            initial_observation=observation,
            scenario_config=scenario_config
        )
        
        self._safe_publish(reset_event)
        
        return observation, info
    
    def step(self, action: np.ndarray) -> Tuple[np.ndarray, float, bool, bool, Dict[str, Any]]:
        """Execute step and publish step event."""
        step_start_time = time.time()
        
        observation, reward, terminated, truncated, info = self.env.step(action)
        
        # Check for safety violations
        self._check_safety_violations(info, step_start_time)
        
        # Publish step event (with rate limiting)
        if self._should_publish():
            step_event = EnvironmentStepEvent(
                timestamp=step_start_time,
                observation=observation,
                action=action,
                reward=reward,
                done=terminated or truncated,
                info=info
            )
            
            self._safe_publish(step_event)
        
        return observation, reward, terminated, truncated, info
    
    def _check_safety_violations(self, info: Dict[str, Any], timestamp: float) -> None:
        """Check for and publish safety violation events."""
        min_sep_nm = info.get("min_sep_nm", float("inf"))
        los_count = info.get("los", 0)
        
        # Determine violation severity
        violation_type = None
        severity = None
        
        if min_sep_nm < self._critical_separation_threshold:
            violation_type = "critical_separation"
            severity = "critical"
        elif min_sep_nm < self._min_separation_threshold:
            violation_type = "loss_of_separation"
            severity = "warning"
        elif los_count > 0:
            violation_type = "near_miss"
            severity = "caution"
        
        if violation_type:
            # Extract aircraft information if available
            aircraft_involved = []
            if hasattr(self.env, "_last_states") and self.env._last_states:
                # Get IDs of alive aircraft (simplified - in real implementation
                # would need to identify specific aircraft in conflict)
                aircraft_involved = [
                    ac["id"] for ac in self.env._last_states 
                    if ac.get("alive", True)
                ][:2]  # Limit to first 2 for simplicity
            
            safety_event = SafetyViolationEvent(
                timestamp=timestamp,
                violation_type=violation_type,
                aircraft_involved=aircraft_involved,
                separation_distance=min_sep_nm,
                minimum_separation=self._min_separation_threshold,
                severity=severity
            )
            
            self._safe_publish(safety_event)
    
    def _should_publish(self) -> bool:
        """Check if we should publish based on rate limiting."""
        current_time = time.time()
        
        # Reset counter every second
        if current_time - self._last_publish_time >= 1.0:
            self._publish_counter = 0
            self._last_publish_time = current_time
        
        if self._publish_counter >= self.publish_rate_limit:
            return False
        
        self._publish_counter += 1
        return True
    
    def _safe_publish(self, event) -> None:
        """Safely publish event with error handling."""
        try:
            self.event_bus.publish_async(event)
        except Exception as e:
            # Log error but don't interrupt training
            print(f"Warning: Failed to publish event {event.event_type}: {e}")


def wrap_env_with_events(env: gym.Env, event_bus: Optional[EventBus] = None) -> EventPublishingEnvWrapper:
    """
    Convenience function to wrap an environment with event publishing.
    
    Args:
        env: Environment to wrap
        event_bus: Event bus instance (uses global if None)
        
    Returns:
        Wrapped environment
    """
    return EventPublishingEnvWrapper(env, event_bus)