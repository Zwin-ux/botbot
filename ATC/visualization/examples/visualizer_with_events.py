"""Example of scenario visualizer integrated with the event system."""

import time
import math
import sys
import os
from typing import Dict, Any
import numpy as np

# Add visualization to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from scenario import ScenarioVisualizer, VisualizationConfig, SectorBounds
from events import get_event_bus, EventBus
from events.event_data import EnvironmentStepEvent, EnvironmentResetEvent, EventType


class MockEnvironment:
    """Mock environment that publishes events like the real training environment."""
    
    def __init__(self, event_bus: EventBus):
        self.event_bus = event_bus
        self.step_count = 0
        self.aircraft_states = []
        self._initialize_aircraft()
    
    def _initialize_aircraft(self):
        """Initialize mock aircraft states."""
        self.aircraft_states = [
            {
                "id": "AC001",
                "x_nm": -40.0,
                "y_nm": -20.0,
                "v_kt": 250.0,
                "hdg_rad": 0.785,  # 45 degrees
                "alt_ft": 35000.0,
                "goal_x_nm": 40.0,
                "goal_y_nm": 20.0,
                "alive": True,
                "intent_onehot": np.array([0, 0, 0, 1, 0], dtype=np.float32)
            },
            {
                "id": "AC002",
                "x_nm": 30.0,
                "y_nm": -30.0,
                "v_kt": 280.0,
                "hdg_rad": 2.356,  # 135 degrees
                "alt_ft": 36000.0,
                "goal_x_nm": -30.0,
                "goal_y_nm": 30.0,
                "alive": True,
                "intent_onehot": np.array([0, 0, 0, 1, 0], dtype=np.float32)
            }
        ]
    
    def reset(self):
        """Reset environment and publish reset event."""
        self.step_count = 0
        self._initialize_aircraft()
        
        # Publish reset event
        reset_event = EnvironmentResetEvent(
            timestamp=time.time(),
            initial_observation=np.zeros(100),  # Mock observation
            scenario_config={
                "scenario": "crossing_pattern",
                "max_aircraft": 4,
                "step_seconds": 5.0
            }
        )
        
        self.event_bus.publish(reset_event)
        print("Environment reset - published reset event")
    
    def step(self):
        """Step environment and publish step event."""
        self.step_count += 1
        
        # Update aircraft positions
        for aircraft in self.aircraft_states:
            if not aircraft["alive"]:
                continue
            
            # Simple movement simulation
            speed_nm_per_sec = aircraft["v_kt"] / 3600.0
            time_step = 5.0  # 5 seconds
            distance = speed_nm_per_sec * time_step
            
            dx = math.cos(aircraft["hdg_rad"]) * distance
            dy = math.sin(aircraft["hdg_rad"]) * distance
            
            aircraft["x_nm"] += dx
            aircraft["y_nm"] += dy
            
            # Check if reached goal
            goal_dist = math.sqrt(
                (aircraft["goal_x_nm"] - aircraft["x_nm"])**2 + 
                (aircraft["goal_y_nm"] - aircraft["y_nm"])**2
            )
            
            if goal_dist < 5.0:
                aircraft["alive"] = False
        
        # Publish step event
        step_event = EnvironmentStepEvent(
            timestamp=time.time(),
            observation=np.random.random(100),  # Mock observation
            action=np.random.random(8),  # Mock action
            reward=1.0,  # Mock reward
            done=False,
            info={"aircraft_states": self.aircraft_states.copy()}
        )
        
        self.event_bus.publish(step_event)
        
        active_count = sum(1 for ac in self.aircraft_states if ac["alive"])
        print(f"Step {self.step_count}: {active_count} active aircraft")
        
        return active_count > 0


def demo_event_integration():
    """Demonstrate visualizer integration with event system."""
    print("=== Event Integration Demo ===")
    
    # Get global event bus
    event_bus = get_event_bus()
    
    # Create sector bounds
    sector_bounds = SectorBounds(-50, 50, -50, 50)
    
    # Create visualizer configuration
    config = VisualizationConfig(
        canvas_width=800,
        canvas_height=600,
        target_fps=10.0,
        show_aircraft=True,
        show_trails=True,
        show_conflicts=True
    )
    
    # Create visualizer (it will automatically subscribe to events)
    visualizer = ScenarioVisualizer(sector_bounds, config, event_bus)
    visualizer.start()
    
    # Create mock environment
    mock_env = MockEnvironment(event_bus)
    
    # Reset environment
    mock_env.reset()
    
    # Wait a moment for event processing
    time.sleep(0.1)
    
    # Run simulation steps
    print("\nRunning simulation steps...")
    
    for step in range(15):
        # Step environment (publishes events)
        still_active = mock_env.step()
        
        # Update visualizer
        visualizer.update(force_update=True)
        
        # Get render data
        render_data = visualizer.get_render_data()
        metadata = render_data["metadata"]
        
        print(f"  Visualizer sees {metadata['active_aircraft_count']} aircraft")
        
        # Show aircraft positions from visualizer
        aircraft_data = render_data["components"].get("aircraft", [])
        for aircraft in aircraft_data:
            if aircraft["alive"]:
                pos = aircraft["position"]
                print(f"    {aircraft['id']}: ({pos[0]:.1f}, {pos[1]:.1f}) NM")
        
        if not still_active:
            print("All aircraft completed routes")
            break
        
        time.sleep(0.2)
    
    # Show final stats
    print("\n--- Final Stats ---")
    perf_stats = visualizer.get_performance_stats()
    print(f"Total frames rendered: {perf_stats['frame_count']}")
    print(f"Average FPS: {perf_stats['current_fps']:.2f}")
    
    # Stop visualizer
    visualizer.stop()
    
    # Shutdown event bus
    event_bus.shutdown()
    
    print("✓ Event integration demo completed")


def test_event_handling():
    """Test specific event handling functionality."""
    print("\n=== Event Handling Test ===")
    
    # Create fresh event bus for testing
    event_bus = EventBus()
    
    # Create visualizer
    sector_bounds = SectorBounds(-25, 25, -25, 25)
    visualizer = ScenarioVisualizer(sector_bounds, event_bus=event_bus)
    visualizer.start()
    
    # Manually create and publish events
    print("Publishing manual events...")
    
    # Reset event
    reset_event = EnvironmentResetEvent(
        timestamp=time.time(),
        initial_observation=np.zeros(50),
        scenario_config={"test": True}
    )
    event_bus.publish(reset_event)
    
    # Step event with aircraft data
    aircraft_data = [
        {
            "id": "TEST1",
            "x_nm": 0.0,
            "y_nm": 0.0,
            "v_kt": 200.0,
            "hdg_rad": 0.0,
            "alt_ft": 30000.0,
            "goal_x_nm": 20.0,
            "goal_y_nm": 0.0,
            "alive": True,
            "intent_onehot": np.array([0, 0, 0, 1, 0], dtype=np.float32)
        }
    ]
    
    step_event = EnvironmentStepEvent(
        timestamp=time.time(),
        observation=np.zeros(50),
        action=np.zeros(4),
        reward=0.5,
        done=False,
        info={"aircraft_states": aircraft_data}
    )
    event_bus.publish(step_event)
    
    # Allow time for event processing
    time.sleep(0.1)
    
    # Update visualizer and check results
    visualizer.update(force_update=True)
    render_data = visualizer.get_render_data()
    
    aircraft_count = render_data["metadata"]["active_aircraft_count"]
    print(f"Aircraft received via events: {aircraft_count}")
    
    if aircraft_count > 0:
        aircraft_list = render_data["components"]["aircraft"]
        print(f"First aircraft: {aircraft_list[0]['id']} at {aircraft_list[0]['position']}")
    
    # Test event bus stats
    subscriber_count = event_bus.get_subscriber_count()
    print(f"Total event subscribers: {subscriber_count}")
    
    step_subscribers = event_bus.get_subscriber_count(EventType.ENV_STEP)
    reset_subscribers = event_bus.get_subscriber_count(EventType.ENV_RESET)
    print(f"Step event subscribers: {step_subscribers}")
    print(f"Reset event subscribers: {reset_subscribers}")
    
    # Cleanup
    visualizer.stop()
    event_bus.shutdown()
    
    print("✓ Event handling test completed")


if __name__ == "__main__":
    try:
        demo_event_integration()
        test_event_handling()
        print("\n🎉 All event integration tests passed!")
    except Exception as e:
        print(f"\n❌ Event integration test failed: {e}")
        import traceback
        traceback.print_exc()