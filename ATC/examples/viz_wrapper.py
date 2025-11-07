"""
Environment wrapper example - automatic integration.

This shows how to wrap an existing environment to add visualization
without modifying the environment code.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from visualization import wrap_env_with_viz
from st_env.env import SyntheticTowerEnv
import numpy as np


def main():
    print("=" * 60)
    print("Environment Wrapper Example")
    print("=" * 60)

    # Create environment
    env = SyntheticTowerEnv(
        scenario="scenarios/straight_4.scn",
        step_seconds=5.0,
        seed=42
    )

    # Wrap with visualization - ONE LINE!
    env = wrap_env_with_viz(env, enable=True, record_episodes=True)

    print("\n✓ Environment wrapped with visualization")
    print("  Open: visualization/web/index.html")
    print()

    # Now use environment normally - visualization happens automatically!
    for episode in range(3):
        print(f"\nEpisode {episode + 1}")

        obs, info = env.reset()
        total_reward = 0.0
        steps = 0

        done = False
        while not done and steps < 100:
            # Sample random action
            action = env.action_space.sample()

            # Step environment
            obs, reward, terminated, truncated, info = env.step(action)

            total_reward += reward
            steps += 1
            done = terminated or truncated

            if steps % 10 == 0:
                print(f"  Step {steps}: Reward={total_reward:.2f}, Alive={info.get('num_alive', 0)}")

        print(f"  Episode complete: {steps} steps, {total_reward:.2f} reward")

    print("\n✓ Done! Episodes automatically saved.")

    input("\nPress Enter to exit...")


if __name__ == "__main__":
    main()
