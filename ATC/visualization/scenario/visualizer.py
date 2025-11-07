"""Main scenario visualizer that combines aircraft, separation, and sector rendering."""

import time
from typing import Dict, List, Optional, Set, Any, Tuple
from dataclasses import dataclass

from .aircraft import AircraftManager
from .separation import SeparationVisualizer, SeparationZone
from .sector import SectorRenderer, SectorBounds, GridConfiguration, NavigationAid
try:
    from ..events import EventBus, get_event_bus
    from ..events.event_data import EventData, EventType
except ImportError:
    # Handle case when running as standalone module
    import sys
    import os
    sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
    from events import EventBus, get_event_bus
    from events.event_data import EventData, EventType


@dataclass
class VisualizationConfig:
    """Configuration for the scenario visualizer."""
    
    # Canvas settings
    canvas_width: int = 800
    canvas_height: int = 600
    background_color: str = "#1A1A1A"  # Dark background
    
    # Update settings
    target_fps: float = 15.0
    max_update_rate: float = 30.0  # Maximum updates per second
    
    # Feature toggles
    show_aircraft: bool = True
    show_trails: bool = True
    show_separation_zones: bool = True
    show_conflicts: bool = True
    show_sector_boundary: bool = True
    show_grid: bool = True
    show_navigation_aids: bool = True
    show_goal_positions: bool = True
    
    # Selection settings
    allow_aircraft_selection: bool = True
    max_selected_aircraft: int = 3


class ScenarioVisualizer:
    """
    Main scenario visualizer for real-time air traffic display.
    
    Combines aircraft visualization, separation monitoring, and sector rendering
    into a unified system for real-time display of air traffic scenarios.
    """
    
    def __init__(self, sector_bounds: SectorBounds, 
                 config: Optional[VisualizationConfig] = None,
                 event_bus: Optional[EventBus] = None):
        """
        Initialize the scenario visualizer.
        
        Args:
            sector_bounds: Sector boundary definition
            config: Visualization configuration
            event_bus: Event bus for receiving updates
        """
        self.config = config or VisualizationConfig()
        self.event_bus = event_bus or get_event_bus()
        
        # Initialize components
        self.aircraft_manager = AircraftManager(max_aircraft=50)
        self.separation_visualizer = SeparationVisualizer()
        self.sector_renderer = SectorRenderer(
            sector_bounds=sector_bounds,
            grid_config=GridConfiguration()
        )
        
        # State management
        self.selected_aircraft: Set[str] = set()
        self.last_update_time = 0.0
        self.frame_count = 0
        self.fps_history: List[float] = []
        self.is_running = False
        
        # Performance tracking
        self.render_times: List[float] = []
        self.max_render_time_history = 100
        
        # Subscribe to relevant events
        self._setup_event_subscriptions()
        
        print(f"ScenarioVisualizer initialized with {sector_bounds.width}x{sector_bounds.height} NM sector")
    
    def start(self) -> None:
        """Start the visualizer."""
        self.is_running = True
        self.last_update_time = time.time()
        print("ScenarioVisualizer started")
    
    def stop(self) -> None:
        """Stop the visualizer."""
        self.is_running = False
        print("ScenarioVisualizer stopped")
    
    def update(self, force_update: bool = False) -> bool:
        """
        Update the visualizer state.
        
        Args:
            force_update: Force update regardless of rate limiting
            
        Returns:
            True if update was performed
        """
        if not self.is_running:
            return False
        
        current_time = time.time()
        
        # Rate limiting
        if not force_update:
            time_since_last_update = current_time - self.last_update_time
            min_update_interval = 1.0 / self.config.max_update_rate
            
            if time_since_last_update < min_update_interval:
                return False
        
        # Update separation analysis with current aircraft data
        aircraft_data = self.aircraft_manager.get_all_render_data(current_time)
        self.separation_visualizer.update_aircraft_data(aircraft_data)
        
        # Update frame timing
        self._update_fps_tracking(current_time)
        self.last_update_time = current_time
        
        return True
    
    def get_render_data(self) -> Dict[str, Any]:
        """
        Get complete render data for the current frame.
        
        Returns:
            Dictionary containing all render data
        """
        render_start_time = time.time()
        
        # Get canvas configuration
        canvas_config = self.sector_renderer.get_canvas_configuration(
            self.config.canvas_width, 
            self.config.canvas_height
        )
        
        # Collect render data from all components
        render_data = {
            "timestamp": time.time(),
            "canvas_config": canvas_config,
            "background_color": self.config.background_color,
            "components": {}
        }
        
        # Aircraft data
        if self.config.show_aircraft:
            aircraft_data = self.aircraft_manager.get_all_render_data()
            render_data["components"]["aircraft"] = aircraft_data
            
            # Goal positions (depends on aircraft data)
            if self.config.show_goal_positions:
                render_data["components"]["goal_positions"] = \
                    self.sector_renderer.get_goal_positions_render_data(aircraft_data)
        
        # Sector boundary
        if self.config.show_sector_boundary:
            render_data["components"]["sector_boundary"] = \
                self.sector_renderer.get_sector_render_data()
        
        # Grid
        if self.config.show_grid:
            render_data["components"]["grid"] = \
                self.sector_renderer.get_grid_render_data()
        
        # Navigation aids
        if self.config.show_navigation_aids:
            render_data["components"]["navigation_aids"] = \
                self.sector_renderer.get_navigation_aids_render_data()
        
        # Separation zones
        if self.config.show_separation_zones:
            render_data["components"]["separation_zones"] = \
                self.separation_visualizer.get_separation_zones_render_data(
                    self.selected_aircraft
                )
        
        # Conflicts
        if self.config.show_conflicts:
            render_data["components"]["conflicts"] = \
                self.separation_visualizer.get_conflict_render_data()
        
        # Metadata
        render_data["metadata"] = {
            "active_aircraft_count": self.aircraft_manager.get_active_aircraft_count(),
            "selected_aircraft": list(self.selected_aircraft),
            "conflict_summary": self.separation_visualizer.get_conflict_summary(),
            "fps": self.get_current_fps(),
            "frame_count": self.frame_count
        }
        
        # Track render performance
        render_time = time.time() - render_start_time
        self._track_render_performance(render_time)
        
        self.frame_count += 1
        return render_data
    
    def select_aircraft(self, aircraft_id: str) -> bool:
        """
        Select an aircraft for detailed visualization.
        
        Args:
            aircraft_id: ID of aircraft to select
            
        Returns:
            True if aircraft was selected
        """
        if not self.config.allow_aircraft_selection:
            return False
        
        if len(self.selected_aircraft) >= self.config.max_selected_aircraft:
            # Remove oldest selection
            oldest_id = next(iter(self.selected_aircraft))
            self.selected_aircraft.remove(oldest_id)
        
        self.selected_aircraft.add(aircraft_id)
        return True
    
    def deselect_aircraft(self, aircraft_id: str) -> bool:
        """
        Deselect an aircraft.
        
        Args:
            aircraft_id: ID of aircraft to deselect
            
        Returns:
            True if aircraft was deselected
        """
        if aircraft_id in self.selected_aircraft:
            self.selected_aircraft.remove(aircraft_id)
            return True
        return False
    
    def clear_selection(self) -> None:
        """Clear all aircraft selections."""
        self.selected_aircraft.clear()
    
    def add_navigation_aid(self, nav_aid: NavigationAid) -> None:
        """Add a navigation aid to the sector."""
        self.sector_renderer.add_navigation_aid(nav_aid)
    
    def get_aircraft_at_position(self, canvas_x: float, canvas_y: float,
                                tolerance: float = 10.0) -> Optional[str]:
        """
        Get aircraft ID at canvas position (for mouse interaction).
        
        Args:
            canvas_x: Canvas X coordinate
            canvas_y: Canvas Y coordinate
            tolerance: Selection tolerance in pixels
            
        Returns:
            Aircraft ID if found, None otherwise
        """
        canvas_config = self.sector_renderer.get_canvas_configuration(
            self.config.canvas_width, 
            self.config.canvas_height
        )
        
        # Convert canvas coordinates to world coordinates
        world_x, world_y = self.sector_renderer.canvas_to_world(
            canvas_x, canvas_y, canvas_config
        )
        
        # Find closest aircraft within tolerance
        closest_aircraft = None
        closest_distance = float('inf')
        
        for aircraft_data in self.aircraft_manager.get_all_render_data():
            if not aircraft_data["alive"]:
                continue
            
            # Convert aircraft position to canvas coordinates
            ac_canvas_x, ac_canvas_y = self.sector_renderer.world_to_canvas(
                aircraft_data["position"][0], 
                aircraft_data["position"][1], 
                canvas_config
            )
            
            # Calculate distance in canvas coordinates
            distance = ((canvas_x - ac_canvas_x)**2 + (canvas_y - ac_canvas_y)**2)**0.5
            
            if distance <= tolerance and distance < closest_distance:
                closest_distance = distance
                closest_aircraft = aircraft_data["id"]
        
        return closest_aircraft
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics."""
        return {
            "current_fps": self.get_current_fps(),
            "target_fps": self.config.target_fps,
            "average_render_time": self._get_average_render_time(),
            "max_render_time": max(self.render_times) if self.render_times else 0.0,
            "frame_count": self.frame_count,
            "active_aircraft": self.aircraft_manager.get_active_aircraft_count(),
            "selected_aircraft_count": len(self.selected_aircraft)
        }
    
    def get_current_fps(self) -> float:
        """Get current FPS."""
        if len(self.fps_history) < 2:
            return 0.0
        
        # Calculate FPS from recent history
        recent_fps = self.fps_history[-10:]  # Last 10 frames
        return sum(recent_fps) / len(recent_fps)
    
    def _setup_event_subscriptions(self) -> None:
        """Set up event bus subscriptions."""
        # Subscribe to environment step events for aircraft updates
        self.event_bus.subscribe(
            EventType.ENV_STEP, 
            self._handle_environment_step
        )
        
        # Subscribe to environment reset events
        self.event_bus.subscribe(
            EventType.ENV_RESET,
            self._handle_environment_reset
        )
    
    def _handle_environment_step(self, event: EventData) -> None:
        """Handle environment step events."""
        if not self.is_running:
            return
        
        # Extract aircraft states from environment info
        info = event.data.get("info", {})
        if "aircraft_states" in info:
            self.aircraft_manager.update_aircraft_states(
                info["aircraft_states"], 
                event.timestamp
            )
        elif hasattr(event.data.get("env"), "_last_states"):
            # Fallback: try to get states from environment
            env = event.data.get("env")
            if env and hasattr(env, "_last_states") and env._last_states:
                self.aircraft_manager.update_aircraft_states(
                    env._last_states,
                    event.timestamp
                )
    
    def _handle_environment_reset(self, event: EventData) -> None:
        """Handle environment reset events."""
        # Clear existing aircraft data
        self.aircraft_manager.clear_all_aircraft()
        self.clear_selection()
        
        # Reset frame counting
        self.frame_count = 0
        self.fps_history.clear()
        
        print("Visualizer reset for new episode")
    
    def _update_fps_tracking(self, current_time: float) -> None:
        """Update FPS tracking."""
        if self.last_update_time > 0:
            frame_time = current_time - self.last_update_time
            if frame_time > 0:
                fps = 1.0 / frame_time
                self.fps_history.append(fps)
                
                # Keep only recent history
                if len(self.fps_history) > 60:  # 60 frames
                    self.fps_history = self.fps_history[-60:]
    
    def _track_render_performance(self, render_time: float) -> None:
        """Track render performance."""
        self.render_times.append(render_time)
        
        # Keep only recent history
        if len(self.render_times) > self.max_render_time_history:
            self.render_times = self.render_times[-self.max_render_time_history:]
    
    def _get_average_render_time(self) -> float:
        """Get average render time."""
        if not self.render_times:
            return 0.0
        return sum(self.render_times) / len(self.render_times)