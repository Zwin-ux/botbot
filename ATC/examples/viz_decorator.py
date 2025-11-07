"""
Decorator example - automatic visualization for env factories.

This is perfect for RLlib or other frameworks that use environment factories.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from visualization import with_visualization
from st_env.env import SyntheticTowerEnv
import numpy as np


# Use decorator to automatically add visualization!
@with_visualization(port=8765, record=True)
def make_env(config):
    """Environment factory with automatic visualization."""
    return SyntheticTowerEnv(
        scenario=config.get("scenario", "scenarios/straight_4.scn"),
        step_seconds=config.get("step_seconds", 5.0),
        seed=config.get("seed", 0),
        horizon=config.get("horizon", 400)
    )


def main():
    print("=" * 60)
    print("Decorator Example")
    print("=" * 60)

    print("\n✓ Environment factory decorated")
    print("  Open: visualization/web/index.html")
    print()

    # Create environment using factory - visualization automatic!
    config = {"scenario": "scenarios/straight_4.scn", "seed": 42}
    env = make_env(config)

    # Run training loop
    for episode in range(3):
        print(f"\nEpisode {episode + 1}")

        obs, info = env.reset()
        total_reward = 0.0
        steps = 0

        for step in range(50):
            action = env.action_space.sample()
            obs, reward, terminated, truncated, info = env.step(action)

            total_reward += reward
            steps += 1

            if terminated or truncated:
                break

        print(f"  {steps} steps, {total_reward:.2f} reward")

    print("\n✓ Done!")

    input("\nPress Enter to exit...")


if __name__ == "__main__":
    main()
