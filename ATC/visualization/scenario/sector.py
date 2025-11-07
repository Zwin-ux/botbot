"""Sector boundary and navigation rendering with scalable canvas system."""

import math
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum
import numpy as np


class CoordinateSystem(Enum):
    """Coordinate system types for sector display."""
    
    NAUTICAL_MILES = "nautical_miles"
    LATITUDE_LONGITUDE = "lat_lon"
    GRID_COORDINATES = "grid"


@dataclass
class SectorBounds:
    """Defines the boundaries of an air traffic control sector."""
    
    min_x: float
    max_x: float
    min_y: float
    max_y: float
    coordinate_system: CoordinateSystem = CoordinateSystem.NAUTICAL_MILES
    
    @property
    def width(self) -> float:
        """Get sector width."""
        return self.max_x - self.min_x
    
    @property
    def height(self) -> float:
        """Get sector height."""
        return self.max_y - self.min_y
    
    @property
    def center(self) -> Tuple[float, float]:
        """Get sector center point."""
        return ((self.min_x + self.max_x) / 2, (self.min_y + self.max_y) / 2)
    
    @property
    def aspect_ratio(self) -> float:
        """Get sector aspect ratio (width/height)."""
        return self.width / self.height if self.height > 0 else 1.0
    
    def contains_point(self, x: float, y: float) -> bool:
        """Check if a point is within the sector bounds."""
        return (self.min_x <= x <= self.max_x and 
                self.min_y <= y <= self.max_y)
    
    def expand(self, margin_percent: float = 10.0) -> "SectorBounds":
        """Create expanded bounds with margin."""
        margin_x = self.width * (margin_percent / 100.0)
        margin_y = self.height * (margin_percent / 100.0)
        
        return SectorBounds(
            min_x=self.min_x - margin_x,
            max_x=self.max_x + margin_x,
            min_y=self.min_y - margin_y,
            max_y=self.max_y + margin_y,
            coordinate_system=self.coordinate_system
        )


@dataclass
class GridConfiguration:
    """Configuration for coordinate grid display."""
    
    major_grid_spacing: float = 10.0  # NM
    minor_grid_spacing: float = 2.0   # NM
    show_major_grid: bool = True
    show_minor_grid: bool = True
    show_grid_labels: bool = True
    major_grid_color: str = "#34495E"
    minor_grid_color: str = "#7F8C8D"
    major_grid_width: float = 1.0
    minor_grid_width: float = 0.5
    label_color: str = "#2C3E50"
    label_font_size: int = 10


@dataclass
class NavigationAid:
    """Represents a navigation aid (waypoint, VOR, etc.)."""
    
    id: str
    position: Tuple[float, float]
    nav_type: str  # "waypoint", "vor", "ndb", "fix"
    frequency: Optional[str] = None
    description: Optional[str] = None
    
    @property
    def symbol_type(self) -> str:
        """Get symbol type for rendering."""
        symbol_map = {
            "waypoint": "triangle",
            "vor": "circle_with_cross",
            "ndb": "circle_with_dot",
            "fix": "diamond"
        }
        return symbol_map.get(self.nav_type, "circle")


class SectorRenderer:
    """Handles sector boundary, grid, and navigation aid rendering."""
    
    def __init__(self, sector_bounds: SectorBounds, 
                 grid_config: Optional[GridConfiguration] = None):
        """
        Initialize sector renderer.
        
        Args:
            sector_bounds: Sector boundary definition
            grid_config: Grid display configuration
        """
        self.sector_bounds = sector_bounds
        self.grid_config = grid_config or GridConfiguration()
        self.navigation_aids: Dict[str, NavigationAid] = {}
        
        # Visual configuration
        self.boundary_color = "#E74C3C"  # Red
        self.boundary_width = 2.0
        self.boundary_style = "solid"  # "solid", "dashed", "dotted"
        
        # Goal position rendering
        self.show_goal_positions = True
        self.goal_symbol_size = 6.0
        self.goal_color = "#9B59B6"  # Purple
        self.goal_line_color = "#8E44AD"  # Darker purple
        self.goal_line_width = 1.0
        self.goal_line_style = "dashed"
    
    def add_navigation_aid(self, nav_aid: NavigationAid) -> None:
        """Add a navigation aid to the sector."""
        self.navigation_aids[nav_aid.id] = nav_aid
    
    def remove_navigation_aid(self, nav_id: str) -> bool:
        """Remove a navigation aid from the sector."""
        if nav_id in self.navigation_aids:
            del self.navigation_aids[nav_id]
            return True
        return False
    
    def get_sector_render_data(self) -> Dict[str, Any]:
        """Get render data for sector boundaries."""
        return {
            "type": "sector_boundary",
            "bounds": {
                "min_x": self.sector_bounds.min_x,
                "max_x": self.sector_bounds.max_x,
                "min_y": self.sector_bounds.min_y,
                "max_y": self.sector_bounds.max_y
            },
            "color": self.boundary_color,
            "line_width": self.boundary_width,
            "line_style": self.boundary_style,
            "coordinate_system": self.sector_bounds.coordinate_system.value
        }
    
    def get_grid_render_data(self) -> List[Dict[str, Any]]:
        """Get render data for coordinate grid."""
        if not (self.grid_config.show_major_grid or self.grid_config.show_minor_grid):
            return []
        
        grid_data = []
        
        # Generate major grid lines
        if self.grid_config.show_major_grid:
            grid_data.extend(self._generate_grid_lines(
                self.grid_config.major_grid_spacing,
                self.grid_config.major_grid_color,
                self.grid_config.major_grid_width,
                "major"
            ))
        
        # Generate minor grid lines
        if self.grid_config.show_minor_grid:
            grid_data.extend(self._generate_grid_lines(
                self.grid_config.minor_grid_spacing,
                self.grid_config.minor_grid_color,
                self.grid_config.minor_grid_width,
                "minor"
            ))
        
        # Generate grid labels
        if self.grid_config.show_grid_labels:
            grid_data.extend(self._generate_grid_labels())
        
        return grid_data
    
    def get_navigation_aids_render_data(self) -> List[Dict[str, Any]]:
        """Get render data for navigation aids."""
        nav_data = []
        
        for nav_aid in self.navigation_aids.values():
            nav_data.append({
                "type": "navigation_aid",
                "id": nav_aid.id,
                "position": nav_aid.position,
                "nav_type": nav_aid.nav_type,
                "symbol_type": nav_aid.symbol_type,
                "frequency": nav_aid.frequency,
                "description": nav_aid.description,
                "color": self._get_nav_aid_color(nav_aid.nav_type),
                "size": 8.0
            })
        
        return nav_data
    
    def get_goal_positions_render_data(self, aircraft_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Get render data for aircraft goal positions and trajectory predictions."""
        if not self.show_goal_positions:
            return []
        
        goal_data = []
        
        for aircraft in aircraft_data:
            if not aircraft["alive"]:
                continue
            
            goal_pos = aircraft["goal_position"]
            current_pos = aircraft["position"]
            
            # Goal position marker
            goal_data.append({
                "type": "goal_position",
                "aircraft_id": aircraft["id"],
                "position": goal_pos,
                "color": self.goal_color,
                "size": self.goal_symbol_size,
                "aircraft_color": aircraft["color"]
            })
            
            # Trajectory line from current position to goal
            goal_data.append({
                "type": "trajectory_line",
                "aircraft_id": aircraft["id"],
                "start_position": current_pos,
                "end_position": goal_pos,
                "color": self.goal_line_color,
                "line_width": self.goal_line_width,
                "line_style": self.goal_line_style,
                "alpha": 0.6
            })
            
            # Predicted trajectory based on current heading and speed
            if aircraft["velocity"] > 0:
                predicted_positions = self._calculate_trajectory_prediction(aircraft)
                if predicted_positions:
                    goal_data.append({
                        "type": "predicted_trajectory",
                        "aircraft_id": aircraft["id"],
                        "positions": predicted_positions,
                        "color": aircraft["color"],
                        "line_width": 1.0,
                        "line_style": "dotted",
                        "alpha": 0.4
                    })
        
        return goal_data
    
    def get_canvas_configuration(self, canvas_width: int, canvas_height: int) -> Dict[str, Any]:
        """
        Get canvas configuration for scalable rendering.
        
        Args:
            canvas_width: Canvas width in pixels
            canvas_height: Canvas height in pixels
            
        Returns:
            Canvas configuration dictionary
        """
        # Calculate scale factors to fit sector in canvas
        scale_x = canvas_width / self.sector_bounds.width
        scale_y = canvas_height / self.sector_bounds.height
        
        # Use uniform scaling to maintain aspect ratio
        scale = min(scale_x, scale_y)
        
        # Calculate offset to center the sector
        scaled_width = self.sector_bounds.width * scale
        scaled_height = self.sector_bounds.height * scale
        offset_x = (canvas_width - scaled_width) / 2
        offset_y = (canvas_height - scaled_height) / 2
        
        return {
            "canvas_width": canvas_width,
            "canvas_height": canvas_height,
            "scale": scale,
            "offset_x": offset_x,
            "offset_y": offset_y,
            "sector_bounds": {
                "min_x": self.sector_bounds.min_x,
                "max_x": self.sector_bounds.max_x,
                "min_y": self.sector_bounds.min_y,
                "max_y": self.sector_bounds.max_y
            },
            "coordinate_system": self.sector_bounds.coordinate_system.value
        }
    
    def world_to_canvas(self, world_x: float, world_y: float, 
                       canvas_config: Dict[str, Any]) -> Tuple[float, float]:
        """Convert world coordinates to canvas coordinates."""
        # Translate to origin
        x = world_x - self.sector_bounds.min_x
        y = world_y - self.sector_bounds.min_y
        
        # Scale
        x *= canvas_config["scale"]
        y *= canvas_config["scale"]
        
        # Apply offset and flip Y axis (canvas Y increases downward)
        canvas_x = x + canvas_config["offset_x"]
        canvas_y = canvas_config["canvas_height"] - (y + canvas_config["offset_y"])
        
        return canvas_x, canvas_y
    
    def canvas_to_world(self, canvas_x: float, canvas_y: float,
                       canvas_config: Dict[str, Any]) -> Tuple[float, float]:
        """Convert canvas coordinates to world coordinates."""
        # Remove offset and flip Y axis
        x = canvas_x - canvas_config["offset_x"]
        y = canvas_config["canvas_height"] - canvas_y - canvas_config["offset_y"]
        
        # Unscale
        x /= canvas_config["scale"]
        y /= canvas_config["scale"]
        
        # Translate from origin
        world_x = x + self.sector_bounds.min_x
        world_y = y + self.sector_bounds.min_y
        
        return world_x, world_y
    
    def _generate_grid_lines(self, spacing: float, color: str, 
                           width: float, grid_type: str) -> List[Dict[str, Any]]:
        """Generate grid line render data."""
        lines = []
        
        # Vertical lines
        x = math.ceil(self.sector_bounds.min_x / spacing) * spacing
        while x <= self.sector_bounds.max_x:
            lines.append({
                "type": "grid_line",
                "grid_type": grid_type,
                "orientation": "vertical",
                "position": x,
                "start_y": self.sector_bounds.min_y,
                "end_y": self.sector_bounds.max_y,
                "color": color,
                "line_width": width
            })
            x += spacing
        
        # Horizontal lines
        y = math.ceil(self.sector_bounds.min_y / spacing) * spacing
        while y <= self.sector_bounds.max_y:
            lines.append({
                "type": "grid_line",
                "grid_type": grid_type,
                "orientation": "horizontal",
                "position": y,
                "start_x": self.sector_bounds.min_x,
                "end_x": self.sector_bounds.max_x,
                "color": color,
                "line_width": width
            })
            y += spacing
        
        return lines
    
    def _generate_grid_labels(self) -> List[Dict[str, Any]]:
        """Generate grid label render data."""
        labels = []
        spacing = self.grid_config.major_grid_spacing
        
        # X-axis labels (bottom edge)
        x = math.ceil(self.sector_bounds.min_x / spacing) * spacing
        while x <= self.sector_bounds.max_x:
            labels.append({
                "type": "grid_label",
                "text": f"{x:.0f}",
                "position": (x, self.sector_bounds.min_y),
                "anchor": "top_center",
                "color": self.grid_config.label_color,
                "font_size": self.grid_config.label_font_size
            })
            x += spacing
        
        # Y-axis labels (left edge)
        y = math.ceil(self.sector_bounds.min_y / spacing) * spacing
        while y <= self.sector_bounds.max_y:
            labels.append({
                "type": "grid_label",
                "text": f"{y:.0f}",
                "position": (self.sector_bounds.min_x, y),
                "anchor": "center_right",
                "color": self.grid_config.label_color,
                "font_size": self.grid_config.label_font_size
            })
            y += spacing
        
        return labels
    
    def _get_nav_aid_color(self, nav_type: str) -> str:
        """Get color for navigation aid based on type."""
        color_map = {
            "waypoint": "#3498DB",    # Blue
            "vor": "#E67E22",        # Orange
            "ndb": "#9B59B6",        # Purple
            "fix": "#2ECC71"         # Green
        }
        return color_map.get(nav_type, "#95A5A6")  # Gray default
    
    def _calculate_trajectory_prediction(self, aircraft: Dict[str, Any], 
                                       prediction_time: float = 300.0) -> List[Tuple[float, float]]:
        """
        Calculate predicted trajectory points for an aircraft.
        
        Args:
            aircraft: Aircraft data dictionary
            prediction_time: Prediction time in seconds
            
        Returns:
            List of predicted position tuples
        """
        if aircraft["velocity"] <= 0:
            return []
        
        current_pos = aircraft["position"]
        heading_vector = aircraft["heading_vector"]
        velocity_kt = aircraft["velocity"]
        
        # Convert velocity to NM per second
        velocity_nm_per_sec = velocity_kt / 3600.0
        
        # Generate prediction points every 30 seconds
        time_step = 30.0
        positions = []
        
        for t in np.arange(time_step, prediction_time + time_step, time_step):
            # Calculate position at time t
            distance_nm = velocity_nm_per_sec * t
            pred_x = current_pos[0] + heading_vector[0] * distance_nm
            pred_y = current_pos[1] + heading_vector[1] * distance_nm
            
            # Stop if aircraft would exit sector bounds
            if not self.sector_bounds.contains_point(pred_x, pred_y):
                break
            
            positions.append((pred_x, pred_y))
        
        return positions