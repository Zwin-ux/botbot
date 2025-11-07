"""Unit tests for visualization components.

Tests aircraft rendering accuracy, separation zone calculations, 
conflict detection, and canvas coordinate transformations.
"""

import pytest
import math
import time
import numpy as np
from typing import Dict, Any, List, Tuple
from unittest.mock import Mock, patch

# Import visualization components
from visualization.scenario.aircraft import (
    Aircraft, AircraftState, AircraftTrail, AircraftManager
)
from visualization.scenario.separation import (
    SeparationVisualizer, SeparationZone, SeparationLevel, ConflictPair
)
from visualization.scenario.sector import (
    SectorRenderer, SectorBounds, GridConfiguration, NavigationAid
)
from visualization.scenario.visualizer import (
    ScenarioVisualizer, VisualizationConfig
)


class TestAircraftRendering:
    """Test aircraft rendering accuracy and performance."""
    
    def test_aircraft_state_creation(self):
        """Test aircraft state creation from dictionary data."""
        # Test data matching requirements 1.1 (aircraft positions and trajectories)
        test_data = {
            "id": "TEST001",
            "x_nm": 10.5,
            "y_nm": -5.2,
            "v_kt": 250.0,
            "hdg_rad": math.pi / 4,  # 45 degrees
            "alt_ft": 35000.0,
            "goal_x_nm": 20.0,
            "goal_y_nm": 10.0,
            "alive": True,
            "intent_onehot": np.array([0, 0, 0, 1, 0])  # enroute
        }
        
        timestamp = time.time()
        state = AircraftState.from_dict(test_data, timestamp)
        
        assert state.id == "TEST001"
        assert state.position == (10.5, -5.2)
        assert state.velocity == 250.0
        assert state.heading == math.pi / 4
        assert state.altitude == 35000.0
        assert state.goal_position == (20.0, 10.0)
        assert state.alive is True
        assert state.intent == "enroute"
        assert state.timestamp == timestamp
    
    def test_aircraft_trail_management(self):
        """Test aircraft trail history for trajectory display."""
        trail = AircraftTrail(max_length=5, max_age_seconds=10.0)
        base_time = time.time()
        
        # Add trail points
        positions = [(0, 0), (1, 1), (2, 2), (3, 3), (4, 4)]
        for i, pos in enumerate(positions):
            trail.add_point(pos, base_time + i)
        
        # Test trail length limit
        assert len(trail.points) == 5
        
        # Add one more point to test max_length
        trail.add_point((5, 5), base_time + 5)
        assert len(trail.points) == 5  # Should still be 5 due to max_length
        
        # Test age-based cleanup
        trail.add_point((6, 6), base_time + 15)  # 15 seconds later
        trail_points = trail.get_trail_points(base_time + 15)
        
        # Old points should be removed due to max_age_seconds=10
        assert len(trail_points) <= 2  # Only recent points should remain
    
    def test_aircraft_render_data_accuracy(self):
        """Test aircraft render data contains all required information."""
        # Create aircraft state
        state = AircraftState(
            id="RENDER_TEST",
            position=(15.0, -10.0),
            velocity=280.0,
            heading=math.pi / 3,  # 60 degrees
            altitude=37000.0,
            goal_position=(25.0, 5.0),
            alive=True,
            intent="climb",
            timestamp=time.time()
        )
        
        aircraft = Aircraft("RENDER_TEST", state)
        render_data = aircraft.get_render_data()
        
        # Verify all required render data is present (requirement 1.1)
        assert render_data["id"] == "RENDER_TEST"
        assert render_data["position"] == (15.0, -10.0)
        assert render_data["velocity"] == 280.0
        assert render_data["altitude"] == 37000.0
        assert render_data["goal_position"] == (25.0, 5.0)
        assert render_data["alive"] is True
        assert render_data["intent"] == "climb"
        
        # Verify heading vector calculation
        expected_heading = (math.cos(math.pi / 3), math.sin(math.pi / 3))
        heading_vector = render_data["heading_vector"]
        assert abs(heading_vector[0] - expected_heading[0]) < 1e-6
        assert abs(heading_vector[1] - expected_heading[1]) < 1e-6
        
        # Verify visual properties
        assert "color" in render_data
        assert "symbol_size" in render_data
        assert "trail_points" in render_data
    
    def test_aircraft_manager_performance(self):
        """Test aircraft manager performance with multiple aircraft."""
        manager = AircraftManager(max_aircraft=50)
        
        # Create multiple aircraft states
        states = []
        for i in range(25):
            states.append({
                "id": f"PERF{i:03d}",
                "x_nm": float(i * 2),
                "y_nm": float(i * -1.5),
                "v_kt": 250.0 + i * 5,
                "hdg_rad": (i * math.pi / 12) % (2 * math.pi),
                "alt_ft": 30000.0 + i * 1000,
                "goal_x_nm": float(50 - i),
                "goal_y_nm": float(25 - i),
                "alive": True,
                "intent_onehot": np.array([0, 0, 0, 1, 0])
            })
        
        # Test update performance (requirement 1.2 - 10+ updates per second)
        start_time = time.time()
        manager.update_aircraft_states(states)
        update_time = time.time() - start_time
        
        # Update should complete quickly (< 0.1 seconds for 25 aircraft)
        assert update_time < 0.1
        assert manager.get_active_aircraft_count() == 25
        
        # Test render data generation performance
        start_time = time.time()
        render_data = manager.get_all_render_data()
        render_time = time.time() - start_time
        
        # Render data generation should be fast
        assert render_time < 0.05
        assert len(render_data) == 25


class TestSeparationZoneCalculations:
    """Test separation zone calculations and conflict detection."""
    
    def test_separation_zone_configuration(self):
        """Test separation zone setup and configuration."""
        zones = SeparationZone.get_default_zones()
        
        # Verify default zones are properly configured
        assert len(zones) == 4
        
        # Check zone levels and radii
        zone_levels = [zone.level for zone in zones]
        assert SeparationLevel.SAFE in zone_levels
        assert SeparationLevel.CAUTION in zone_levels
        assert SeparationLevel.WARNING in zone_levels
        assert SeparationLevel.CRITICAL in zone_levels
        
        # Verify zones are ordered by radius (largest first)
        radii = [zone.radius_nm for zone in zones]
        assert radii == sorted(radii, reverse=True)
    
    def test_conflict_detection_accuracy(self):
        """Test conflict detection between aircraft pairs."""
        visualizer = SeparationVisualizer()
        
        # Create aircraft data for conflict testing (requirement 1.5)
        aircraft_data = [
            {
                "id": "CONFLICT_A",
                "position": (0.0, 0.0),
                "heading_vector": (1.0, 0.0),
                "velocity": 250.0,
                "altitude": 35000.0,
                "alive": True
            },
            {
                "id": "CONFLICT_B", 
                "position": (2.0, 0.0),  # 2 NM separation
                "heading_vector": (-1.0, 0.0),
                "velocity": 250.0,
                "altitude": 35000.0,  # Same altitude
                "alive": True
            }
        ]
        
        visualizer.update_aircraft_data(aircraft_data)
        conflict_summary = visualizer.get_conflict_summary()
        
        # Should detect conflict due to close proximity and same altitude
        assert conflict_summary["total_conflicts"] > 0
        
        # Test with sufficient vertical separation
        aircraft_data[1]["altitude"] = 36500.0  # 1500 ft separation
        visualizer.update_aircraft_data(aircraft_data)
        conflict_summary = visualizer.get_conflict_summary()
        
        # Should not detect conflict due to vertical separation
        assert conflict_summary["total_conflicts"] == 0
    
    def test_separation_level_determination(self):
        """Test separation level calculation based on distance."""
        visualizer = SeparationVisualizer()
        
        # Test different separation distances based on default zone configuration
        # Zones sorted smallest first: CRITICAL(0.5), WARNING(1.0), CAUTION(3.0), SAFE(5.0)
        test_cases = [
            (0.3, SeparationLevel.CRITICAL),  # <= 0.5 NM (first match)
            (0.5, SeparationLevel.CRITICAL),  # <= 0.5 NM (first match)
            (0.8, SeparationLevel.WARNING),   # <= 1.0 NM (first match > 0.5)
            (1.0, SeparationLevel.WARNING),   # <= 1.0 NM (first match)
            (2.0, SeparationLevel.CAUTION),   # <= 3.0 NM (first match > 1.0)
            (3.0, SeparationLevel.CAUTION),   # <= 3.0 NM (first match)
            (4.0, SeparationLevel.SAFE),      # <= 5.0 NM (first match > 3.0)
            (5.0, SeparationLevel.SAFE),      # <= 5.0 NM (first match)
            (6.0, SeparationLevel.SAFE)       # > 5.0 NM (default return)
        ]
        
        for distance, expected_level in test_cases:
            level = visualizer._get_separation_level(distance)
            assert level == expected_level, f"Distance {distance} NM should be {expected_level}, got {level}"
    
    def test_closest_approach_prediction(self):
        """Test prediction of closest approach between aircraft."""
        visualizer = SeparationVisualizer()
        
        # Create aircraft on converging paths
        aircraft1 = {
            "id": "PRED_A",
            "position": (0.0, 0.0),
            "heading_vector": (1.0, 0.0),  # Moving east
            "velocity": 300.0,  # 300 knots
            "altitude": 35000.0,
            "alive": True
        }
        
        aircraft2 = {
            "id": "PRED_B",
            "position": (10.0, 5.0),
            "heading_vector": (-0.8, -0.6),  # Moving southwest
            "velocity": 250.0,  # 250 knots
            "altitude": 35000.0,
            "alive": True
        }
        
        time_to_closest, closest_distance = visualizer._predict_closest_approach(
            aircraft1, aircraft2
        )
        
        # Should predict a future closest approach
        assert time_to_closest >= 0
        assert closest_distance >= 0
        assert time_to_closest <= visualizer.prediction_time_horizon


class TestCanvasCoordinateTransformations:
    """Test canvas scaling and coordinate transformations."""
    
    def test_sector_bounds_calculation(self):
        """Test sector boundary calculations."""
        bounds = SectorBounds(-50, 50, -30, 40)
        
        assert bounds.width == 100.0  # 50 - (-50)
        assert bounds.height == 70.0  # 40 - (-30)
        assert bounds.center == (0.0, 5.0)  # Midpoint
        assert bounds.aspect_ratio == 100.0 / 70.0
    
    def test_canvas_configuration_accuracy(self):
        """Test canvas configuration for different aspect ratios."""
        bounds = SectorBounds(-25, 25, -25, 25)  # Square sector
        renderer = SectorRenderer(bounds)
        
        # Test square canvas
        config = renderer.get_canvas_configuration(800, 800)
        assert config["canvas_width"] == 800
        assert config["canvas_height"] == 800
        assert config["scale"] > 0
        
        # Test rectangular canvas
        config = renderer.get_canvas_configuration(1000, 600)
        assert config["canvas_width"] == 1000
        assert config["canvas_height"] == 600
        
        # Scale should maintain aspect ratio
        expected_scale = min(1000 / bounds.width, 600 / bounds.height)
        assert abs(config["scale"] - expected_scale) < 1e-6
    
    def test_coordinate_transformation_accuracy(self):
        """Test world-to-canvas and canvas-to-world transformations."""
        bounds = SectorBounds(-50, 50, -30, 40)
        renderer = SectorRenderer(bounds)
        canvas_config = renderer.get_canvas_configuration(800, 600)
        
        # Test center point transformation
        world_center = bounds.center
        canvas_x, canvas_y = renderer.world_to_canvas(
            world_center[0], world_center[1], canvas_config
        )
        
        # Should map to canvas center
        expected_canvas_center = (canvas_config["canvas_width"] / 2, 
                                canvas_config["canvas_height"] / 2)
        assert abs(canvas_x - expected_canvas_center[0]) < 1.0
        assert abs(canvas_y - expected_canvas_center[1]) < 1.0
        
        # Test round-trip transformation
        back_world_x, back_world_y = renderer.canvas_to_world(
            canvas_x, canvas_y, canvas_config
        )
        
        assert abs(back_world_x - world_center[0]) < 0.1
        assert abs(back_world_y - world_center[1]) < 0.1
    
    def test_coordinate_transformation_edge_cases(self):
        """Test coordinate transformations at sector boundaries."""
        bounds = SectorBounds(-25, 25, -25, 25)
        renderer = SectorRenderer(bounds)
        canvas_config = renderer.get_canvas_configuration(500, 500)
        
        # Test corner transformations
        corners = [
            (bounds.min_x, bounds.min_y),  # Bottom-left
            (bounds.max_x, bounds.min_y),  # Bottom-right
            (bounds.min_x, bounds.max_y),  # Top-left
            (bounds.max_x, bounds.max_y)   # Top-right
        ]
        
        for world_x, world_y in corners:
            canvas_x, canvas_y = renderer.world_to_canvas(
                world_x, world_y, canvas_config
            )
            
            # Canvas coordinates should be within bounds
            assert 0 <= canvas_x <= canvas_config["canvas_width"]
            assert 0 <= canvas_y <= canvas_config["canvas_height"]
            
            # Test round-trip
            back_world_x, back_world_y = renderer.canvas_to_world(
                canvas_x, canvas_y, canvas_config
            )
            
            assert abs(back_world_x - world_x) < 0.1
            assert abs(back_world_y - world_y) < 0.1


class TestVisualizationIntegration:
    """Test integration of visualization components."""
    
    def test_visualizer_initialization(self):
        """Test scenario visualizer initialization."""
        bounds = SectorBounds(-50, 50, -50, 50)
        config = VisualizationConfig(
            canvas_width=800,
            canvas_height=600,
            target_fps=15.0
        )
        
        visualizer = ScenarioVisualizer(bounds, config)
        
        assert visualizer.config == config
        assert visualizer.aircraft_manager is not None
        assert visualizer.separation_visualizer is not None
        assert visualizer.sector_renderer is not None
        assert not visualizer.is_running
    
    def test_aircraft_selection_functionality(self):
        """Test aircraft selection for detailed visualization."""
        bounds = SectorBounds(-25, 25, -25, 25)
        visualizer = ScenarioVisualizer(bounds)
        
        # Test aircraft selection
        assert visualizer.select_aircraft("TEST001") is True
        assert "TEST001" in visualizer.selected_aircraft
        
        # Test selection limit
        config = VisualizationConfig(max_selected_aircraft=2)
        visualizer.config = config
        
        visualizer.select_aircraft("TEST002")
        visualizer.select_aircraft("TEST003")  # Should remove oldest
        
        assert len(visualizer.selected_aircraft) <= 2
        assert "TEST003" in visualizer.selected_aircraft
    
    def test_render_data_completeness(self):
        """Test that render data contains all required components."""
        bounds = SectorBounds(-25, 25, -25, 25)
        config = VisualizationConfig(
            show_aircraft=True,
            show_separation_zones=True,
            show_sector_boundary=True,
            show_grid=True
        )
        
        visualizer = ScenarioVisualizer(bounds, config)
        visualizer.start()
        
        # Add sample aircraft
        aircraft_states = [{
            "id": "RENDER_TEST",
            "x_nm": 0.0,
            "y_nm": 0.0,
            "v_kt": 250.0,
            "hdg_rad": 0.0,
            "alt_ft": 35000.0,
            "goal_x_nm": 10.0,
            "goal_y_nm": 10.0,
            "alive": True,
            "intent_onehot": np.array([0, 0, 0, 1, 0])
        }]
        
        visualizer.aircraft_manager.update_aircraft_states(aircraft_states)
        visualizer.update(force_update=True)
        
        render_data = visualizer.get_render_data()
        
        # Verify required components are present
        assert "timestamp" in render_data
        assert "canvas_config" in render_data
        assert "components" in render_data
        assert "metadata" in render_data
        
        components = render_data["components"]
        assert "aircraft" in components
        assert "sector_boundary" in components
        assert "grid" in components
        
        # Verify metadata
        metadata = render_data["metadata"]
        assert "active_aircraft_count" in metadata
        assert "conflict_summary" in metadata
        assert "fps" in metadata
        
        visualizer.stop()


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v"])