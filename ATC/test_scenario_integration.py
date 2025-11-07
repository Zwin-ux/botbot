"""Integration test for scenario visualizer with realistic aircraft movement."""

import time
import math
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


def simulate_aircraft_movement():
    """Test the visualizer with realistic aircraft movement simulation."""
    print("=== Aircraft Movement Simulation ===")
    
    # Create sector bounds (100x100 NM sector)
    sector_bounds = SectorBounds(-50, 50, -50, 50)
    
    # Create visualization config
    config = VisualizationConfig(
        canvas_width=1000,
        canvas_height=800,
        target_fps=10.0,
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
    
    # Add navigation aids
    nav_aids = [
        NavigationAid("ALPHA", (-40, -40), "waypoint"),
        NavigationAid("BRAVO", (40, 40), "waypoint"),
        NavigationAid("CHARLIE", (-40, 40), "vor", "113.5"),
        NavigationAid("DELTA", (40, -40), "ndb", "350"),
        NavigationAid("CENTER", (0, 0), "fix")
    ]
    
    for nav_aid in nav_aids:
        visualizer.add_navigation_aid(nav_aid)
    
    # Start visualizer
    visualizer.start()
    
    # Create initial aircraft states (crossing pattern)
    aircraft_states = [
        {
            "id": "UAL123",
            "x_nm": -45.0,
            "y_nm": -10.0,
            "v_kt": 250.0,
            "hdg_rad": 0.0,  # East
            "alt_ft": 35000.0,
            "goal_x_nm": 45.0,
            "goal_y_nm": -10.0,
            "alive": True,
            "intent_onehot": np.array([0, 0, 0, 1, 0], dtype=np.float32)
        },
        {
            "id": "DAL456",
            "x_nm": 10.0,
            "y_nm": -45.0,
            "v_kt": 280.0,
            "hdg_rad": math.pi/2,  # North
            "alt_ft": 37000.0,
            "goal_x_nm": 10.0,
            "goal_y_nm": 45.0,
            "alive": True,
            "intent_onehot": np.array([0, 0, 0, 1, 0], dtype=np.float32)
        },
        {
            "id": "AAL789",
            "x_nm": 45.0,
            "y_nm": 15.0,
            "v_kt": 260.0,
            "hdg_rad": math.pi,  # West
            "alt_ft": 36000.0,
            "goal_x_nm": -45.0,
            "goal_y_nm": 15.0,
            "alive": True,
            "intent_onehot": np.array([0, 0, 0, 1, 0], dtype=np.float32)
        },
        {
            "id": "SWA321",
            "x_nm": -15.0,
            "y_nm": 45.0,
            "v_kt": 240.0,
            "hdg_rad": 3*math.pi/2,  # South
            "alt_ft": 34000.0,
            "goal_x_nm": -15.0,
            "goal_y_nm": -45.0,
            "alive": True,
            "intent_onehot": np.array([0, 0, 0, 1, 0], dtype=np.float32)
        }
    ]
    
    # Select aircraft for detailed view
    visualizer.select_aircraft("UAL123")
    visualizer.select_aircraft("DAL456")
    
    print(f"Starting simulation with {len(aircraft_states)} aircraft")
    
    # Simulate movement for several time steps
    time_step = 10.0  # 10 second steps
    total_steps = 20
    
    for step in range(total_steps):
        print(f"\n--- Step {step + 1}/{total_steps} ---")
        
        # Update aircraft positions
        for aircraft in aircraft_states:
            if not aircraft["alive"]:
                continue
            
            # Calculate movement
            speed_nm_per_sec = aircraft["v_kt"] / 3600.0
            distance = speed_nm_per_sec * time_step
            
            dx = math.cos(aircraft["hdg_rad"]) * distance
            dy = math.sin(aircraft["hdg_rad"]) * distance
            
            aircraft["x_nm"] += dx
            aircraft["y_nm"] += dy
            
            # Check if aircraft reached goal or left sector
            goal_dist = math.sqrt(
                (aircraft["goal_x_nm"] - aircraft["x_nm"])**2 + 
                (aircraft["goal_y_nm"] - aircraft["y_nm"])**2
            )
            
            if goal_dist < 5.0:  # Within 5 NM of goal
                aircraft["alive"] = False
                print(f"  {aircraft['id']} reached goal")
            elif (abs(aircraft["x_nm"]) > 60 or abs(aircraft["y_nm"]) > 60):
                aircraft["alive"] = False
                print(f"  {aircraft['id']} left sector")
        
        # Update visualizer
        visualizer.aircraft_manager.update_aircraft_states(aircraft_states)
        visualizer.update(force_update=True)
        
        # Get render data and analyze
        render_data = visualizer.get_render_data()
        metadata = render_data["metadata"]
        
        print(f"Active aircraft: {metadata['active_aircraft_count']}")
        print(f"Total conflicts: {metadata['conflict_summary']['total_conflicts']}")
        
        # Show conflict details
        if metadata['conflict_summary']['total_conflicts'] > 0:
            conflicts = metadata['conflict_summary']['conflicts_by_level']
            print(f"  Critical: {conflicts['critical']}, Warning: {conflicts['warning']}")
            print(f"  Caution: {conflicts['caution']}, Safe: {conflicts['safe']}")
        
        # Show aircraft positions
        aircraft_data = render_data["components"].get("aircraft", [])
        for aircraft in aircraft_data:
            if aircraft["alive"]:
                pos = aircraft["position"]
                print(f"  {aircraft['id']}: ({pos[0]:.1f}, {pos[1]:.1f}) NM, "
                      f"alt={aircraft['altitude']:.0f} ft")
        
        # Check if all aircraft are done
        active_count = sum(1 for ac in aircraft_states if ac["alive"])
        if active_count == 0:
            print("All aircraft completed their routes")
            break
        
        time.sleep(0.2)  # Small delay for visualization
    
    # Final performance stats
    print("\n--- Final Performance Stats ---")
    perf_stats = visualizer.get_performance_stats()
    for key, value in perf_stats.items():
        if isinstance(value, float):
            print(f"{key}: {value:.3f}")
        else:
            print(f"{key}: {value}")
    
    # Test canvas interaction
    print("\n--- Testing Canvas Interaction ---")
    canvas_config = render_data["canvas_config"]
    
    # Test coordinate conversion
    test_world_pos = (0, 0)  # Center of sector
    canvas_x, canvas_y = visualizer.sector_renderer.world_to_canvas(
        test_world_pos[0], test_world_pos[1], canvas_config
    )
    print(f"World center (0, 0) -> Canvas ({canvas_x:.1f}, {canvas_y:.1f})")
    
    # Test reverse conversion
    back_world_x, back_world_y = visualizer.sector_renderer.canvas_to_world(
        canvas_x, canvas_y, canvas_config
    )
    print(f"Canvas ({canvas_x:.1f}, {canvas_y:.1f}) -> World ({back_world_x:.1f}, {back_world_y:.1f})")
    
    # Test aircraft selection at position
    if aircraft_data:
        test_aircraft = aircraft_data[0]
        if test_aircraft["alive"]:
            world_pos = test_aircraft["position"]
            canvas_x, canvas_y = visualizer.sector_renderer.world_to_canvas(
                world_pos[0], world_pos[1], canvas_config
            )
            
            found_aircraft = visualizer.get_aircraft_at_position(
                canvas_x, canvas_y, tolerance=15.0
            )
            print(f"Aircraft at canvas ({canvas_x:.1f}, {canvas_y:.1f}): {found_aircraft}")
    
    visualizer.stop()
    print("\n✓ Integration test completed successfully")


def test_conflict_detection():
    """Test conflict detection with aircraft on collision course."""
    print("\n=== Conflict Detection Test ===")
    
    sector_bounds = SectorBounds(-25, 25, -25, 25)
    visualizer = ScenarioVisualizer(sector_bounds)
    visualizer.start()
    
    # Create aircraft on collision course
    aircraft_states = [
        {
            "id": "CONFLICT1",
            "x_nm": -20.0,
            "y_nm": 0.0,
            "v_kt": 300.0,
            "hdg_rad": 0.0,  # East
            "alt_ft": 35000.0,
            "goal_x_nm": 20.0,
            "goal_y_nm": 0.0,
            "alive": True,
            "intent_onehot": np.array([0, 0, 0, 1, 0], dtype=np.float32)
        },
        {
            "id": "CONFLICT2",
            "x_nm": 20.0,
            "y_nm": 0.0,
            "v_kt": 300.0,
            "hdg_rad": math.pi,  # West
            "alt_ft": 35500.0,  # Only 500 ft separation
            "goal_x_nm": -20.0,
            "goal_y_nm": 0.0,
            "alive": True,
            "intent_onehot": np.array([0, 0, 0, 1, 0], dtype=np.float32)
        }
    ]
    
    print("Simulating head-on collision scenario...")
    
    for step in range(10):
        # Move aircraft toward each other
        for aircraft in aircraft_states:
            if aircraft["alive"]:
                speed_nm_per_sec = aircraft["v_kt"] / 3600.0
                distance = speed_nm_per_sec * 5.0  # 5 second steps
                
                dx = math.cos(aircraft["hdg_rad"]) * distance
                dy = math.sin(aircraft["hdg_rad"]) * distance
                
                aircraft["x_nm"] += dx
                aircraft["y_nm"] += dy
        
        # Update visualizer
        visualizer.aircraft_manager.update_aircraft_states(aircraft_states)
        visualizer.update(force_update=True)
        
        # Check conflicts
        render_data = visualizer.get_render_data()
        conflict_summary = render_data["metadata"]["conflict_summary"]
        
        print(f"Step {step + 1}: Distance between aircraft: "
              f"{abs(aircraft_states[0]['x_nm'] - aircraft_states[1]['x_nm']):.1f} NM")
        print(f"  Conflicts: {conflict_summary['total_conflicts']} "
              f"(Critical: {conflict_summary['critical_conflicts']})")
        
        # Stop if aircraft pass each other
        if aircraft_states[0]["x_nm"] > aircraft_states[1]["x_nm"]:
            print("Aircraft have passed each other")
            break
    
    visualizer.stop()
    print("✓ Conflict detection test completed")


if __name__ == "__main__":
    try:
        simulate_aircraft_movement()
        test_conflict_detection()
        print("\n🎉 All integration tests passed!")
    except Exception as e:
        print(f"\n❌ Integration test failed: {e}")
        import traceback
        traceback.print_exc()