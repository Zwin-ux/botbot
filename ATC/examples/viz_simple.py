"""
Simple visualization example - minimal setup.

This shows the easiest way to add visualization to your training.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from visualization import setup_visualization
from bluesky_adapter.adapter import BlueSkySim
import time


def main():
    print("=" * 60)
    print("Simple Visualization Example")
    print("=" * 60)

    # ONE LINE to enable visualization!
    viz = setup_visualization(enable=True, record=True)

    print("\n✓ Visualization enabled")
    print("  Open: visualization/web/index.html in your browser")
    print()

    # Get the callback
    callback = viz.get_callback()

    # Create your simulation
    sim = BlueSkySim("scenarios/straight_4.scn", seed=42)

    # Run simulation with visualization
    print("Running simulation...")

    for episode in range(2):
        print(f"\nEpisode {episode + 1}")

        # Reset
        states = sim.reset()
        callback.on_reset(states, {"episode": episode + 1})

        episode_reward = 0.0

        # Run episode
        for step in range(50):
            # Step simulation
            commands = []  # Add your control logic here
            states = sim.step(commands)

            # Update visualization
            reward = 0.1
            episode_reward += reward

            callback.on_step(
                states=states,
                actions=[],
                rewards=reward,
                info={
                    "los": 0,
                    "min_sep_nm": 12.0,
                    "num_alive": sum(1 for s in states if s["alive"])
                }
            )

            time.sleep(0.05)  # Slow down for visibility

        # Episode end
        callback.on_episode_end(episode_reward, 50, {"los": 0})

        # Save episode
        viz.on_episode_end({
            "total_reward": episode_reward,
            "episode_length": 50,
            "info": {"los": 0}
        })

    print("\n✓ Done! Check visualization/web/index.html")
    print("  Episodes saved to: logs/episodes/")

    # Keep server running
    input("\nPress Enter to exit...")


if __name__ == "__main__":
    main()
