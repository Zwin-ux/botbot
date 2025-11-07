"""
Simple demonstration script for visualization system.

Runs a simulation and streams data to the visualization server.
Open visualization/web/index.html in a browser to see the aircraft moving.

Usage:
    python test_visualization_demo.py
"""
import sys
import asyncio
import threading
import time
from pathlib import Path

# Add project to path
sys.path.insert(0, str(Path(__file__).parent))

from visualization.viz_server import VisualizationServer
from visualization.callbacks import VisualizationCallback
from bluesky_adapter.adapter import BlueSkySim


def run_server(server):
    """Run visualization server in asyncio event loop."""
    asyncio.run(server.start())


def main():
    print("=" * 60)
    print("ATC Visualization Demo")
    print("=" * 60)

    # Create and start visualization server
    print("\n[1/4] Starting visualization server...")
    viz_server = VisualizationServer(host="localhost", port=8765)

    server_thread = threading.Thread(target=lambda: run_server(viz_server), daemon=True)
    server_thread.start()
    time.sleep(1)  # Wait for server to start

    print("✓ Server running on ws://localhost:8765")

    # Create callback
    print("\n[2/4] Creating visualization callback...")
    callback = VisualizationCallback(viz_server=viz_server, throttle_ms=50)
    print("✓ Callback created (50ms throttle)")

    # Create simulation
    print("\n[3/4] Initializing simulation...")
    sim = BlueSkySim("scenarios/straight_4.scn", step_seconds=5.0, seed=42)
    print("✓ Simulation initialized")

    print("\n[4/4] Running simulation...")
    print("     Open visualization/web/index.html in your browser")
    print("     to see real-time aircraft visualization!")
    print()

    # Run multiple episodes
    for episode in range(3):
        print(f"\n--- Episode {episode + 1} ---")

        # Reset
        states = sim.reset()
        callback.on_reset(states, {"episode": episode + 1})
        print(f"  Reset: {len(states)} aircraft spawned")

        episode_reward = 0.0

        # Run 100 steps
        for step in range(100):
            # Simple commands: slight right turn for first aircraft
            commands = []
            if len(states) > 0 and states[0]["alive"]:
                commands.append({
                    "id": states[0]["id"],
                    "delta_hdg": 0.01,  # Slight right turn
                    "delta_vs": 0.0
                })

            # Advance simulation
            states = sim.step(commands)

            # Compute simple reward (mock)
            num_alive = sum(1 for ac in states if ac["alive"])
            step_reward = 0.1 * num_alive

            episode_reward += step_reward

            # Notify callback
            callback.on_step(
                states=states,
                actions=commands,
                rewards=step_reward,
                info={
                    "los": 0,
                    "min_sep_nm": 15.0,  # Mock data
                    "num_alive": num_alive
                }
            )

            # Print progress every 10 steps
            if (step + 1) % 10 == 0:
                print(f"  Step {step + 1}/100 | Alive: {num_alive} | Reward: {episode_reward:.1f}")

            # Sleep to slow down visualization
            time.sleep(0.05)

        # Episode end
        callback.on_episode_end(
            total_reward=episode_reward,
            episode_length=100,
            info={"los": 0, "num_alive": num_alive}
        )

        print(f"  Episode complete! Total reward: {episode_reward:.2f}")

    print("\n" + "=" * 60)
    print("Demo complete!")
    print("=" * 60)
    print()
    print("The server is still running. You can:")
    print("  1. Refresh the browser to reconnect")
    print("  2. Press Ctrl+C to exit")
    print()

    # Keep server alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down...")


if __name__ == "__main__":
    main()
