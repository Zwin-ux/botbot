"""Demo script for the scenario visualizer components."""

import time
import json
from typing import List, Dict, Any

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scenario import (
    ScenarioVisualizer, 
    VisualizationConfig, 
    SectorBounds, 
    NavigationAid
)


def create_sample_aircraft_states() -> List[Dict[str, Any]]:
    """Create sample aircraft states for testing."""
    import numpy as np
    
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
        },
        {
            "id": "AC003",
            "x_nm": 10.0,
            "y_nm": 30.0,
            "v_kt": 220.0,
            "hdg_rad": 4.712,  # 270 degrees
            "alt_ft": 12000.0,
            "goal_x_nm": -10.0,
            "goal_y_nm": -30.0,
            "alive": True,
            "intent_onehot": np.array([0, 0, 0, 1, 0], dtype=np.float32)  # enroute
        },
        {
            "id": "AC004",
            "x_nm": -20.0,
            "y_nm": 25.0,
            "v_kt": 260.0,
            "hdg_rad": 6.283,  # 360 degrees (0)
            "alt_ft": 13000.0,
            "goal_x_nm": 20.0,
            "goal_y_nm": -25.0,
            "alive": True,
            "intent_onehot": np.array([0, 0, 0, 1, 0], dtype=np.float32)  # enroute
        }
    ]
    
    return aircraft_states


def demo_scenario_visualizer():
    """Demonstrate the scenario visualizer functionality."""
    print("=== Scenario Visualizer Demo ===")
    
    # Create sector bounds (100x100 NM sector centered at origin)
    sector_bounds = SectorBounds(
        min_x=-50.0,
        max_x=50.0,
        min_y=-50.0,
        max_y=50.0
    )
    
    # Create visualization configuration
    config = VisualizationConfig(
        canvas_width=800,
        canvas_height=600,
        target_fps=15.0,
        show_aircraft=True,
        show_trails=True,
        show_separation_zones=True,
        show_conflicts=True,
        show_sector_boundary=True,
        show_grid=True,
        show_goal_positions=True
    )
    
    # Create visualizer
    visualizer = ScenarioVisualizer(sector_bounds, config)
    
    # Add some navigation aids
    nav_aids = [
        NavigationAid("ALPHA", (-40, -40), "waypoint"),
        NavigationAid("BRAVO", (40, 40), "waypoint"),
        NavigationAid("CHARLIE", (-40, 40), "vor", "113.5"),
        NavigationAid("DELTA", (40, -40), "ndb", "350")
    ]
    
    for nav_aid in nav_aids:
        visualizer.add_navigation_aid(nav_aid)
    
    # Start visualizer
    visualizer.start()
    
    # Create sample aircraft states
    aircraft_states = create_sample_aircraft_states()
    
    # Update aircraft manager with sample data
    visualizer.aircraft_manager.update_aircraft_states(aircraft_states)
    
    # Select first aircraft for detailed view
    visualizer.select_aircraft("AC001")
    
    # Simulate a few updates
    print("\nSimulating visualization updates...")
    
    for frame in range(5):
        print(f"\n--- Frame {frame + 1} ---")
        
        # Update positions slightly (simulate movement)
        for i, aircraft in enumerate(aircraft_states):
            if aircraft["alive"]:
                # Move aircraft based on heading and speed
                import math
                speed_nm_per_sec = aircraft["v_kt"] / 3600.0  # Convert kt to NM/s
                time_step = 5.0  # 5 second steps
                
                dx = math.cos(aircraft["hdg_rad"]) * speed_nm_per_sec * time_step
                dy = math.sin(aircraft["hdg_rad"]) * speed_nm_per_sec * time_step
                
                aircraft["x_nm"] += dx
                aircraft["y_nm"] += dy
        
        # Update visualizer
        visualizer.aircraft_manager.update_aircraft_states(aircraft_states)
        visualizer.update(force_update=True)
        
        # Get render data
        render_data = visualizer.get_render_data()
        
        # Print summary
        metadata = render_data["metadata"]
        print(f"Active aircraft: {metadata['active_aircraft_count']}")
        print(f"Selected aircraft: {metadata['selected_aircraft']}")
        print(f"Conflicts: {metadata['conflict_summary']['total_conflicts']}")
        print(f"Frame: {metadata['frame_count']}")
        
        # Print aircraft positions
        aircraft_data = render_data["components"].get("aircraft", [])
        for aircraft in aircraft_data[:2]:  # Show first 2 aircraft
            pos = aircraft["position"]
            print(f"  {aircraft['id']}: ({pos[0]:.1f}, {pos[1]:.1f}) NM, "
                  f"hdg={aircraft['heading_vector'][0]:.2f},{aircraft['heading_vector'][1]:.2f}")
        
        time.sleep(0.1)  # Small delay for demo
    
    # Test aircraft selection
    print("\n--- Testing Aircraft Selection ---")
    
    # Test canvas coordinate conversion
    canvas_config = render_data["canvas_config"]
    print(f"Canvas config: {canvas_config['canvas_width']}x{canvas_config['canvas_height']}")
    print(f"Scale: {canvas_config['scale']:.2f}")
    
    # Test finding aircraft at position
    test_aircraft = aircraft_data[0] if aircraft_data else None
    if test_aircraft:
        world_pos = test_aircraft["position"]
        canvas_x, canvas_y = visualizer.sector_renderer.world_to_canvas(
            world_pos[0], world_pos[1], canvas_config
        )
        print(f"Aircraft {test_aircraft['id']} at world ({world_pos[0]:.1f}, {world_pos[1]:.1f}) "
              f"-> canvas ({canvas_x:.1f}, {canvas_y:.1f})")
        
        # Test reverse conversion
        found_aircraft = visualizer.get_aircraft_at_position(canvas_x, canvas_y, tolerance=20.0)
        print(f"Aircraft found at canvas position: {found_aircraft}")
    
    # Get performance stats
    print("\n--- Performance Stats ---")
    perf_stats = visualizer.get_performance_stats()
    for key, value in perf_stats.items():
        if isinstance(value, float):
            print(f"{key}: {value:.3f}")
        else:
            print(f"{key}: {value}")
    
    # Stop visualizer
    visualizer.stop()
    
    print("\n=== Demo Complete ===")


def demo_render_data_structure():
    """Demonstrate the render data structure."""
    print("\n=== Render Data Structure Demo ===")
    
    # Create a simple visualizer
    sector_bounds = SectorBounds(-25, 25, -25, 25)
    visualizer = ScenarioVisualizer(sector_bounds)
    visualizer.start()
    
    # Add sample aircraft
    aircraft_states = create_sample_aircraft_states()[:2]  # Just 2 aircraft
    visualizer.aircraft_manager.update_aircraft_states(aircraft_states)
    visualizer.update(force_update=True)
    
    # Get render data
    render_data = visualizer.get_render_data()
    
    # Print structure (truncated for readability)
    print("Render data structure:")
    print(f"- timestamp: {render_data['timestamp']}")
    print(f"- canvas_config: {list(render_data['canvas_config'].keys())}")
    print(f"- background_color: {render_data['background_color']}")
    print(f"- components: {list(render_data['components'].keys())}")
    
    # Show aircraft component structure
    aircraft_data = render_data["components"].get("aircraft", [])
    if aircraft_data:
        print(f"\nAircraft component (first aircraft):")
        first_aircraft = aircraft_data[0]
        for key, value in first_aircraft.items():
            if key == "trail_points":
                print(f"  {key}: {len(value)} points")
            elif isinstance(value, (list, tuple)) and len(value) == 2:
                print(f"  {key}: ({value[0]:.2f}, {value[1]:.2f})")
            else:
                print(f"  {key}: {value}")
    
    # Show metadata
    print(f"\nMetadata:")
    for key, value in render_data["metadata"].items():
        print(f"  {key}: {value}")
    
    visualizer.stop()


if __name__ == "__main__":
    try:
        demo_scenario_visualizer()
        demo_render_data_structure()
    except Exception as e:
        print(f"Demo failed: {e}")
        import traceback
        traceback.print_exc()