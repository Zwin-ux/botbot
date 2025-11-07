"""
Demonstration of the event system integration.

This script shows how to use the event bus, WebSocket server,
and environment wrapper together.
"""
import asyncio
import sys
import time
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from st_env.env import SyntheticTowerEnv
from visualization.events import get_event_bus, EventType
from visualization.integration.env_wrapper import wrap_env_with_events
from visualization.server import WebSocketServer


def event_subscriber(event_data):
    """Example event subscriber that prints events."""
    print(f"[{event_data.timestamp:.2f}] {event_data.event_type}: {len(str(event_data.data))} bytes")


async def run_demo():
    """Run the event system demonstration."""
    print("Event System Integration Demo")
    print("=" * 50)
    
    # Initialize event bus
    event_bus = get_event_bus()
    
    # Subscribe to all event types
    subscriptions = []
    for event_type in EventType:
        sub_id = event_bus.subscribe(event_type, event_subscriber)
        subscriptions.append(sub_id)
    
    print(f"Subscribed to {len(subscriptions)} event types")
    
    # Start WebSocket server
    websocket_server = WebSocketServer(host="localhost", port=8080)
    await websocket_server.start()
    print("WebSocket server started on localhost:8080")
    
    # Create and wrap environment
    base_env = SyntheticTowerEnv(
        scenario="scenarios/straight_4.scn",
        step_seconds=5.0,
        seed=42,
        horizon=50  # Short episode for demo
    )
    
    env = wrap_env_with_events(base_env, event_bus)
    print("Environment wrapped with event publishing")
    
    # Run a short episode
    print("\nRunning demonstration episode...")
    observation, info = env.reset()
    print(f"Episode started with {info.get('num_alive', 0)} aircraft")
    
    for step in range(20):  # Run for 20 steps
        # Random action for demonstration
        action = env.action_space.sample()
        observation, reward, terminated, truncated, info = env.step(action)
        
        print(f"Step {step + 1}: reward={reward:.2f}, alive={info.get('num_alive', 0)}")
        
        if terminated or truncated:
            print("Episode ended")
            break
        
        # Small delay to see events in real-time
        await asyncio.sleep(0.1)
    
    # Show event statistics
    print(f"\nEvent Statistics:")
    print(f"Total subscribers: {event_bus.get_subscriber_count()}")
    print(f"Events in history: {len(event_bus.get_event_history())}")
    
    # Show event breakdown by type
    for event_type in EventType:
        events = event_bus.get_event_history(event_type)
        print(f"  {event_type}: {len(events)} events")
    
    # Cleanup
    print("\nCleaning up...")
    for sub_id in subscriptions:
        event_bus.unsubscribe(sub_id)
    
    await websocket_server.stop()
    event_bus.shutdown()
    
    print("Demo completed!")


def main():
    """Main function to run the demo."""
    try:
        asyncio.run(run_demo())
    except KeyboardInterrupt:
        print("\nDemo interrupted by user")
    except Exception as e:
        print(f"Demo failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()