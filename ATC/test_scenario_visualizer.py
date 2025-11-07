"""Test script for the scenario visualizer components."""

import time
import json
import sys
import os
from typing import List, Dict, Any
import numpy as np

# Add visualization to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'visualization'))

from visualization.scenario import (
    ScenarioVisualizer, 
    VisualizationConfig, 
    SectorBounds, 
    NavigationAid
)


def create_sample_aircraft_states() -> List[Dict[str, Any]]:
    """Create sample aircraft states for testing."""
    aircraft_states = [
        {
            "id": "AC001",
            "x_nm": -30.0,
            "y_nm": -20.0,
            "v_kt": 250.0,
            "hdg_rad": 0.785,  # 45 degrees
            "alt_ft": 10000.0,
            "goal_x_nm": 30.0,
            "goal_y_nm": 20.0,
            "alive": True,
            "intent_onehot": np.array([0, 0, 0, 1, 0], dtype=np.float32)  # enroute
        },
        {
            "id": "AC002", 
            "x_nm": 25.0,
            "y_nm": -15.0,
            "v_kt": 280.0,
            "hdg_rad": 2.356,  # 135 degrees
            "alt_ft": 11000.0,
            "goal_x_nm": -25.0,
            "goal_y_nm": 15.0,
            "alive": True,
            "intent_onehot": np.array([0, 0, 0, 1, 0], dtype=np.float32)  # enroute
        }
    ]
    
    return aircraft_states


def test_aircraft_components():
    """Test aircraft visualization components."""
    print("=== Testing Aircraft Components ===")
    
    from visualization.scenario.aircraft import AircraftManager, AircraftState
    
    # Create aircraft manager
    manager = AircraftManager(max_aircraft=10)
    
    # Create sample states
    states = create_sample_aircraft_states()
    
    # Update aircraft states
    manager.update_aircraft_states(states)
    
    print(f"Active aircraft count: {manager.get_active_aircraft_count()}")
    
    # Get render data
    render_data = manager.get_all_render_data()
    print(f"Render data for {len(render_data)} aircraft")
    
    if render_data:
        first_aircraft = render_data[0]
        print(f"First aircraft: {first_aircraft['id']} at {first_aircraft['position']}")
        print(f"Trail points: {len(first_aircraft['trail_points'])}")
    
    print("✓ Aircraft components test passed")


def test_separation_components():
    """Test separation visualization components."""
    print("\n=== Testing Separation Components ===")
    
    from visualization.scenario.separation import SeparationVisualizer
    
    # Create separation visualizer
    sep_viz = SeparationVisualizer()
    
    # Create sample aircraft data (close together to trigger conflicts)
    aircraft_data = [
        {
            "id": "AC001",
            "position": (0.0, 0.0),
            "heading_vector": (1.0, 0.0),
            "velocity": 250.0,
            "altitude": 10000.0,
            "alive": True
        },
        {
            "id": "AC002", 
            "position": (2.0, 1.0),  # Close to AC001
            "heading_vector": (-1.0, 0.0),
            "velocity": 280.0,
            "altitude": 10500.0,  # Close altitude
            "alive": True
        }
    ]
    
    # Update separation analysis
    sep_viz.update_aircraft_data(aircraft_data)
    
    # Get conflict summary
    summary = sep_viz.get_conflict_summary()
    print(f"Conflicts detected: {summary['total_conflicts']}")
    print(f"Conflict levels: {summary['conflicts_by_level']}")
    
    # Get conflict render data
    conflict_data = sep_viz.get_conflict_render_data()
    print(f"Conflict render items: {len(conflict_data)}")
    
    print("✓ Separation components test passed")


def test_sector_components():
    """Test sector rendering components."""
    print("\n=== Testing Sector Components ===")
    
    from visualization.scenario.sector import SectorRenderer, SectorBounds, NavigationAid
    
    # Create sector bounds
    bounds = SectorBounds(-50, 50, -50, 50)
    print(f"Sector: {bounds.width}x{bounds.height} NM, center at {bounds.center}")
    
    # Create sector renderer
    renderer = SectorRenderer(bounds)
    
    # Add navigation aid
    nav_aid = NavigationAid("TEST", (10, 20), "waypoint")
    renderer.add_navigation_aid(nav_aid)
    
    # Get render data
    sector_data = renderer.get_sector_render_data()
    print(f"Sector render data: {sector_data['type']}")
    
    grid_data = renderer.get_grid_render_data()
    print(f"Grid render items: {len(grid_data)}")
    
    nav_data = renderer.get_navigation_aids_render_data()
    print(f"Navigation aids: {len(nav_data)}")
    
    # Test canvas configuration
    canvas_config = renderer.get_canvas_configuration(800, 600)
    print(f"Canvas scale: {canvas_config['scale']:.2f}")
    
    print("✓ Sector components test passed")


def test_main_visualizer():
    """Test the main scenario visualizer."""
    print("\n=== Testing Main Visualizer ===")
    
    # Create sector bounds
    sector_bounds = SectorBounds(-50, 50, -50, 50)
    
    # Create configuration
    config = VisualizationConfig(
        canvas_width=800,
        canvas_height=600,
        target_fps=15.0
    )
    
    # Create visualizer
    visualizer = ScenarioVisualizer(sector_bounds, config)
    
    # Start visualizer
    visualizer.start()
    
    # Add sample aircraft
    aircraft_states = create_sample_aircraft_states()
    visualizer.aircraft_manager.update_aircraft_states(aircraft_states)
    
    # Update and get render data
    visualizer.update(force_update=True)
    render_data = visualizer.get_render_data()
    
    print(f"Render data timestamp: {render_data['timestamp']}")
    print(f"Components: {list(render_data['components'].keys())}")
    print(f"Active aircraft: {render_data['metadata']['active_aircraft_count']}")
    
    # Test aircraft selection
    visualizer.select_aircraft("AC001")
    print(f"Selected aircraft: {list(visualizer.selected_aircraft)}")
    
    # Get performance stats
    perf_stats = visualizer.get_performance_stats()
    print(f"Frame count: {perf_stats['frame_count']}")
    
    # Stop visualizer
    visualizer.stop()
    
    print("✓ Main visualizer test passed")


if __name__ == "__main__":
    try:
        test_aircraft_components()
        test_separation_components()
        test_sector_components()
        test_main_visualizer()
        print("\n🎉 All tests passed!")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()