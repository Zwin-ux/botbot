"""Aircraft visualization components for real-time air traffic display."""

import math
import time
from collections import deque
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Any
import numpy as np


@dataclass
class AircraftState:
    """Aircraft state data structure for visualization."""
    
    id: str
    position: Tuple[float, float]  # x_nm, y_nm
    velocity: float  # v_kt
    heading: float  # hdg_rad
    altitude: float  # alt_ft
    goal_position: Tuple[float, float]  # goal_x_nm, goal_y_nm
    alive: bool
    intent: str
    timestamp: float
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any], timestamp: float = None) -> "AircraftState":
        """Create AircraftState from dictionary data."""
        if timestamp is None:
            timestamp = time.time()
            
        # Convert intent_onehot to string
        intent_map = ["taxi", "takeoff", "climb", "enroute", "descent"]
        intent_onehot = data.get("intent_onehot", np.array([0, 0, 0, 1, 0]))
        intent_idx = np.argmax(intent_onehot)
        intent = intent_map[intent_idx] if intent_idx < len(intent_map) else "unknown"
        
        return cls(
            id=data["id"],
            position=(data["x_nm"], data["y_nm"]),
            velocity=data["v_kt"],
            heading=data["hdg_rad"],
            altitude=data["alt_ft"],
            goal_position=(data["goal_x_nm"], data["goal_y_nm"]),
            alive=data["alive"],
            intent=intent,
            timestamp=timestamp
        )


class AircraftTrail:
    """Manages aircraft position history for trail rendering."""
    
    def __init__(self, max_length: int = 50, max_age_seconds: float = 300.0):
        """
        Initialize aircraft trail.
        
        Args:
            max_length: Maximum number of trail points
            max_age_seconds: Maximum age of trail points in seconds
        """
        self.max_length = max_length
        self.max_age_seconds = max_age_seconds
        self.points: deque = deque(maxlen=max_length)
    
    def add_point(self, position: Tuple[float, float], timestamp: float) -> None:
        """Add a new position to the trail."""
        self.points.append((position[0], position[1], timestamp))
        self._cleanup_old_points(timestamp)
    
    def get_trail_points(self, current_time: float = None) -> List[Tuple[float, float, float]]:
        """
        Get trail points with age information.
        
        Returns:
            List of (x, y, age_seconds) tuples
        """
        if current_time is None:
            current_time = time.time()
        
        self._cleanup_old_points(current_time)
        
        return [
            (x, y, current_time - timestamp)
            for x, y, timestamp in self.points
        ]
    
    def _cleanup_old_points(self, current_time: float) -> None:
        """Remove points older than max_age_seconds."""
        while (self.points and 
               current_time - self.points[0][2] > self.max_age_seconds):
            self.points.popleft()
    
    def clear(self) -> None:
        """Clear all trail points."""
        self.points.clear()


class Aircraft:
    """Aircraft visualization component with position, heading, and trail rendering."""
    
    def __init__(self, aircraft_id: str, initial_state: AircraftState):
        """
        Initialize aircraft visualization.
        
        Args:
            aircraft_id: Unique aircraft identifier
            initial_state: Initial aircraft state
        """
        self.id = aircraft_id
        self.state = initial_state
        self.trail = AircraftTrail()
        self.last_update_time = initial_state.timestamp
        
        # Visual properties
        self.symbol_size = 8.0  # pixels
        self.trail_width = 2.0  # pixels
        self.label_offset = (10, -10)  # pixels from aircraft center
        
        # Colors based on intent
        self.intent_colors = {
            "taxi": "#FFA500",      # Orange
            "takeoff": "#FF6B6B",   # Red
            "climb": "#4ECDC4",     # Teal
            "enroute": "#45B7D1",   # Blue
            "descent": "#96CEB4",   # Green
            "unknown": "#95A5A6"    # Gray
        }
        
        # Add initial position to trail
        self.trail.add_point(self.state.position, self.state.timestamp)
    
    def update_state(self, new_state: AircraftState) -> None:
        """Update aircraft state and trail."""
        self.state = new_state
        self.last_update_time = new_state.timestamp
        
        # Add position to trail if aircraft moved significantly
        if self._position_changed_significantly():
            self.trail.add_point(new_state.position, new_state.timestamp)
    
    def get_render_data(self, current_time: float = None) -> Dict[str, Any]:
        """
        Get all data needed for rendering this aircraft.
        
        Returns:
            Dictionary containing rendering information
        """
        if current_time is None:
            current_time = time.time()
        
        # Calculate heading vector for symbol rendering
        heading_vector = (
            math.cos(self.state.heading),
            math.sin(self.state.heading)
        )
        
        # Get trail points with age for alpha blending
        trail_points = self.trail.get_trail_points(current_time)
        
        # Determine aircraft color based on intent
        color = self.intent_colors.get(self.state.intent, self.intent_colors["unknown"])
        
        return {
            "id": self.id,
            "position": self.state.position,
            "heading_vector": heading_vector,
            "velocity": self.state.velocity,
            "altitude": self.state.altitude,
            "goal_position": self.state.goal_position,
            "alive": self.state.alive,
            "intent": self.state.intent,
            "color": color,
            "symbol_size": self.symbol_size,
            "trail_points": trail_points,
            "trail_width": self.trail_width,
            "label_offset": self.label_offset,
            "last_update": self.last_update_time
        }
    
    def _position_changed_significantly(self, threshold_nm: float = 0.1) -> bool:
        """Check if aircraft has moved significantly since last trail point."""
        if not self.trail.points:
            return True
        
        last_x, last_y, _ = self.trail.points[-1]
        current_x, current_y = self.state.position
        
        distance = math.sqrt((current_x - last_x)**2 + (current_y - last_y)**2)
        return distance >= threshold_nm
    
    def is_stale(self, current_time: float, max_age_seconds: float = 30.0) -> bool:
        """Check if aircraft data is stale (hasn't been updated recently)."""
        return current_time - self.last_update_time > max_age_seconds


class AircraftManager:
    """Manages multiple aircraft for efficient rendering and updates."""
    
    def __init__(self, max_aircraft: int = 50):
        """
        Initialize aircraft manager.
        
        Args:
            max_aircraft: Maximum number of aircraft to track
        """
        self.max_aircraft = max_aircraft
        self.aircraft: Dict[str, Aircraft] = {}
        self.last_cleanup_time = time.time()
        self.cleanup_interval = 10.0  # seconds
    
    def update_aircraft_states(self, states: List[Dict[str, Any]], 
                             timestamp: float = None) -> None:
        """
        Update aircraft states from environment data.
        
        Args:
            states: List of aircraft state dictionaries
            timestamp: Timestamp for the update
        """
        if timestamp is None:
            timestamp = time.time()
        
        # Convert states to AircraftState objects
        aircraft_states = {}
        for state_dict in states:
            aircraft_state = AircraftState.from_dict(state_dict, timestamp)
            aircraft_states[aircraft_state.id] = aircraft_state
        
        # Update existing aircraft or create new ones
        for aircraft_id, state in aircraft_states.items():
            if aircraft_id in self.aircraft:
                self.aircraft[aircraft_id].update_state(state)
            else:
                # Create new aircraft if we haven't reached the limit
                if len(self.aircraft) < self.max_aircraft:
                    self.aircraft[aircraft_id] = Aircraft(aircraft_id, state)
        
        # Mark aircraft as inactive if they're not in the current states
        current_ids = set(aircraft_states.keys())
        for aircraft_id, aircraft in self.aircraft.items():
            if aircraft_id not in current_ids and aircraft.state.alive:
                # Create a dead state for missing aircraft
                dead_state = AircraftState(
                    id=aircraft_id,
                    position=aircraft.state.position,
                    velocity=0.0,
                    heading=aircraft.state.heading,
                    altitude=aircraft.state.altitude,
                    goal_position=aircraft.state.goal_position,
                    alive=False,
                    intent=aircraft.state.intent,
                    timestamp=timestamp
                )
                aircraft.update_state(dead_state)
        
        # Periodic cleanup of stale aircraft
        if timestamp - self.last_cleanup_time > self.cleanup_interval:
            self._cleanup_stale_aircraft(timestamp)
            self.last_cleanup_time = timestamp
    
    def get_all_render_data(self, current_time: float = None) -> List[Dict[str, Any]]:
        """Get render data for all aircraft."""
        if current_time is None:
            current_time = time.time()
        
        return [
            aircraft.get_render_data(current_time)
            for aircraft in self.aircraft.values()
        ]
    
    def get_active_aircraft_count(self) -> int:
        """Get count of active (alive) aircraft."""
        return sum(1 for aircraft in self.aircraft.values() if aircraft.state.alive)
    
    def get_aircraft_by_id(self, aircraft_id: str) -> Optional[Aircraft]:
        """Get aircraft by ID."""
        return self.aircraft.get(aircraft_id)
    
    def clear_all_aircraft(self) -> None:
        """Clear all aircraft data."""
        self.aircraft.clear()
    
    def _cleanup_stale_aircraft(self, current_time: float, 
                              max_stale_time: float = 60.0) -> None:
        """Remove aircraft that haven't been updated recently."""
        stale_ids = [
            aircraft_id for aircraft_id, aircraft in self.aircraft.items()
            if aircraft.is_stale(current_time, max_stale_time)
        ]
        
        for aircraft_id in stale_ids:
            del self.aircraft[aircraft_id]
        
        if stale_ids:
            print(f"Cleaned up {len(stale_ids)} stale aircraft")