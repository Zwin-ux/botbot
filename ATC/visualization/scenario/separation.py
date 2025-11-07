"""Separation distance visualization with color-coded zones and conflict detection."""

import math
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Any, Set
from enum import Enum
import numpy as np


class SeparationLevel(Enum):
    """Separation zone levels with associated colors and thresholds."""
    
    SAFE = "safe"           # > 5 NM - Green
    CAUTION = "caution"     # 3-5 NM - Yellow  
    WARNING = "warning"     # 1-3 NM - Orange
    CRITICAL = "critical"   # < 1 NM - Red


@dataclass
class SeparationZone:
    """Configuration for a separation zone."""
    
    level: SeparationLevel
    radius_nm: float
    color: str
    alpha: float
    line_width: float
    
    @classmethod
    def get_default_zones(cls) -> List["SeparationZone"]:
        """Get default separation zone configuration."""
        return [
            cls(SeparationLevel.SAFE, 5.0, "#2ECC71", 0.1, 1.0),      # Green
            cls(SeparationLevel.CAUTION, 3.0, "#F39C12", 0.2, 1.5),   # Yellow
            cls(SeparationLevel.WARNING, 1.0, "#E67E22", 0.3, 2.0),   # Orange
            cls(SeparationLevel.CRITICAL, 0.5, "#E74C3C", 0.4, 2.5),  # Red
        ]


@dataclass
class ConflictPair:
    """Represents a conflict between two aircraft."""
    
    aircraft1_id: str
    aircraft2_id: str
    distance_nm: float
    separation_level: SeparationLevel
    time_to_closest_approach: float  # seconds
    closest_approach_distance: float  # NM
    relative_bearing: float  # radians
    altitude_separation: float  # feet
    
    @property
    def is_critical(self) -> bool:
        """Check if this is a critical separation violation."""
        return self.separation_level in [SeparationLevel.WARNING, SeparationLevel.CRITICAL]
    
    @property
    def conflict_id(self) -> str:
        """Get unique identifier for this conflict pair."""
        # Sort IDs to ensure consistent ordering
        ids = sorted([self.aircraft1_id, self.aircraft2_id])
        return f"{ids[0]}_{ids[1]}"


class SeparationVisualizer:
    """Handles separation distance visualization and conflict detection."""
    
    def __init__(self, separation_zones: Optional[List[SeparationZone]] = None,
                 vertical_separation_ft: float = 1000.0):
        """
        Initialize separation visualizer.
        
        Args:
            separation_zones: Custom separation zone configuration
            vertical_separation_ft: Minimum vertical separation in feet
        """
        self.zones = separation_zones or SeparationZone.get_default_zones()
        self.vertical_separation_ft = vertical_separation_ft
        
        # Sort zones by radius (smallest first) for proper level determination
        self.zones.sort(key=lambda z: z.radius_nm)
        
        # Conflict tracking
        self.active_conflicts: Dict[str, ConflictPair] = {}
        self.conflict_history: List[ConflictPair] = []
        self.max_history_size = 100
        
        # Configuration
        self.show_zones_for_selected = True  # Only show zones for selected aircraft
        self.show_all_zones = False  # Show zones for all aircraft
        self.highlight_conflicts = True
        self.predict_conflicts = True
        self.prediction_time_horizon = 120.0  # seconds
    
    def update_aircraft_data(self, aircraft_data: List[Dict[str, Any]]) -> None:
        """
        Update separation analysis with current aircraft data.
        
        Args:
            aircraft_data: List of aircraft render data dictionaries
        """
        # Filter to only alive aircraft
        active_aircraft = [ac for ac in aircraft_data if ac["alive"]]
        
        # Clear previous conflicts
        self.active_conflicts.clear()
        
        # Analyze all aircraft pairs for conflicts
        for i, aircraft1 in enumerate(active_aircraft):
            for aircraft2 in active_aircraft[i + 1:]:
                conflict = self._analyze_aircraft_pair(aircraft1, aircraft2)
                if conflict:
                    self.active_conflicts[conflict.conflict_id] = conflict
        
        # Update conflict history
        self._update_conflict_history()
    
    def get_separation_zones_render_data(self, selected_aircraft_ids: Set[str] = None) -> List[Dict[str, Any]]:
        """
        Get render data for separation zones.
        
        Args:
            selected_aircraft_ids: Set of aircraft IDs to show zones for
            
        Returns:
            List of zone render data dictionaries
        """
        if not (self.show_all_zones or (selected_aircraft_ids and self.show_zones_for_selected)):
            return []
        
        zones_data = []
        
        # Determine which aircraft to show zones for
        if self.show_all_zones:
            # Show zones for all aircraft (might be too cluttered)
            target_aircraft = selected_aircraft_ids or set()
        else:
            # Show zones only for selected aircraft
            target_aircraft = selected_aircraft_ids or set()
        
        for aircraft_id in target_aircraft:
            for zone in self.zones:
                zones_data.append({
                    "type": "separation_zone",
                    "aircraft_id": aircraft_id,
                    "level": zone.level.value,
                    "radius_nm": zone.radius_nm,
                    "color": zone.color,
                    "alpha": zone.alpha,
                    "line_width": zone.line_width
                })
        
        return zones_data
    
    def get_conflict_render_data(self) -> List[Dict[str, Any]]:
        """Get render data for active conflicts."""
        if not self.highlight_conflicts:
            return []
        
        conflict_data = []
        
        for conflict in self.active_conflicts.values():
            # Create conflict line between aircraft
            conflict_data.append({
                "type": "conflict_line",
                "aircraft1_id": conflict.aircraft1_id,
                "aircraft2_id": conflict.aircraft2_id,
                "distance_nm": conflict.distance_nm,
                "separation_level": conflict.separation_level.value,
                "color": self._get_conflict_color(conflict.separation_level),
                "line_width": self._get_conflict_line_width(conflict.separation_level),
                "alpha": 0.8,
                "is_critical": conflict.is_critical
            })
            
            # Add conflict warning indicator
            if conflict.is_critical:
                conflict_data.append({
                    "type": "conflict_warning",
                    "aircraft1_id": conflict.aircraft1_id,
                    "aircraft2_id": conflict.aircraft2_id,
                    "distance_nm": conflict.distance_nm,
                    "time_to_closest": conflict.time_to_closest_approach,
                    "closest_distance": conflict.closest_approach_distance,
                    "severity": conflict.separation_level.value
                })
        
        return conflict_data
    
    def get_conflict_summary(self) -> Dict[str, Any]:
        """Get summary of current conflict situation."""
        conflicts_by_level = {level.value: 0 for level in SeparationLevel}
        
        for conflict in self.active_conflicts.values():
            conflicts_by_level[conflict.separation_level.value] += 1
        
        return {
            "total_conflicts": len(self.active_conflicts),
            "critical_conflicts": conflicts_by_level[SeparationLevel.CRITICAL.value],
            "warning_conflicts": conflicts_by_level[SeparationLevel.WARNING.value],
            "caution_conflicts": conflicts_by_level[SeparationLevel.CAUTION.value],
            "conflicts_by_level": conflicts_by_level,
            "active_conflict_pairs": list(self.active_conflicts.keys())
        }
    
    def _analyze_aircraft_pair(self, aircraft1: Dict[str, Any], 
                             aircraft2: Dict[str, Any]) -> Optional[ConflictPair]:
        """Analyze a pair of aircraft for separation conflicts."""
        # Calculate horizontal distance
        pos1 = aircraft1["position"]
        pos2 = aircraft2["position"]
        horizontal_distance = math.sqrt((pos1[0] - pos2[0])**2 + (pos1[1] - pos2[1])**2)
        
        # Calculate vertical separation
        alt1 = aircraft1["altitude"]
        alt2 = aircraft2["altitude"]
        vertical_separation = abs(alt1 - alt2)
        
        # Check if aircraft are vertically separated
        if vertical_separation >= self.vertical_separation_ft:
            # Sufficient vertical separation - no horizontal conflict
            return None
        
        # Determine separation level based on horizontal distance
        separation_level = self._get_separation_level(horizontal_distance)
        
        # Only create conflict if within monitored range
        if separation_level == SeparationLevel.SAFE and horizontal_distance > 10.0:
            return None
        
        # Calculate relative bearing
        dx = pos2[0] - pos1[0]
        dy = pos2[1] - pos1[1]
        relative_bearing = math.atan2(dy, dx)
        
        # Predict closest approach if enabled
        time_to_closest = 0.0
        closest_distance = horizontal_distance
        
        if self.predict_conflicts:
            time_to_closest, closest_distance = self._predict_closest_approach(
                aircraft1, aircraft2
            )
        
        return ConflictPair(
            aircraft1_id=aircraft1["id"],
            aircraft2_id=aircraft2["id"],
            distance_nm=horizontal_distance,
            separation_level=separation_level,
            time_to_closest_approach=time_to_closest,
            closest_approach_distance=closest_distance,
            relative_bearing=relative_bearing,
            altitude_separation=vertical_separation
        )
    
    def _get_separation_level(self, distance_nm: float) -> SeparationLevel:
        """Determine separation level based on distance."""
        for zone in self.zones:
            if distance_nm <= zone.radius_nm:
                return zone.level
        return SeparationLevel.SAFE
    
    def _predict_closest_approach(self, aircraft1: Dict[str, Any], 
                                aircraft2: Dict[str, Any]) -> Tuple[float, float]:
        """
        Predict time and distance of closest approach between two aircraft.
        
        Returns:
            Tuple of (time_to_closest_seconds, closest_distance_nm)
        """
        # Current positions and velocities
        pos1 = np.array(aircraft1["position"])
        pos2 = np.array(aircraft2["position"])
        
        # Velocity vectors (convert from heading/speed to x,y components)
        vel1 = np.array(aircraft1["heading_vector"]) * aircraft1["velocity"]
        vel2 = np.array(aircraft2["heading_vector"]) * aircraft2["velocity"]
        
        # Relative position and velocity
        rel_pos = pos2 - pos1
        rel_vel = vel2 - vel1
        
        # Time to closest approach (when relative velocity is perpendicular to relative position)
        rel_speed_squared = np.dot(rel_vel, rel_vel)
        
        if rel_speed_squared < 1e-6:  # Aircraft moving at same velocity
            return 0.0, np.linalg.norm(rel_pos)
        
        time_to_closest = -np.dot(rel_pos, rel_vel) / rel_speed_squared
        
        # Clamp to prediction horizon
        time_to_closest = max(0.0, min(time_to_closest, self.prediction_time_horizon))
        
        # Calculate closest approach distance
        closest_rel_pos = rel_pos + rel_vel * time_to_closest
        closest_distance = np.linalg.norm(closest_rel_pos)
        
        return time_to_closest, closest_distance
    
    def _get_conflict_color(self, level: SeparationLevel) -> str:
        """Get color for conflict visualization based on separation level."""
        color_map = {
            SeparationLevel.SAFE: "#2ECC71",      # Green
            SeparationLevel.CAUTION: "#F39C12",   # Yellow
            SeparationLevel.WARNING: "#E67E22",   # Orange
            SeparationLevel.CRITICAL: "#E74C3C"   # Red
        }
        return color_map.get(level, "#95A5A6")  # Gray default
    
    def _get_conflict_line_width(self, level: SeparationLevel) -> float:
        """Get line width for conflict visualization based on separation level."""
        width_map = {
            SeparationLevel.SAFE: 1.0,
            SeparationLevel.CAUTION: 2.0,
            SeparationLevel.WARNING: 3.0,
            SeparationLevel.CRITICAL: 4.0
        }
        return width_map.get(level, 1.0)
    
    def _update_conflict_history(self) -> None:
        """Update conflict history with resolved conflicts."""
        # Add resolved conflicts to history
        for conflict in self.active_conflicts.values():
            if conflict.is_critical:
                self.conflict_history.append(conflict)
        
        # Trim history to max size
        if len(self.conflict_history) > self.max_history_size:
            self.conflict_history = self.conflict_history[-self.max_history_size:]