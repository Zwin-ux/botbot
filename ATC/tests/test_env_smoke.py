"""
Smoke tests for ATC environment.

Verifies basic functionality without requiring full BlueSky integration.
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import pytest

from st_env.env import SyntheticTowerEnv


def test_env_creation():
    """Test that environment can be created."""
    env = SyntheticTowerEnv(
        scenario="scenarios/straight_4.scn",
        step_seconds=5.0,
        seed=0
    )
    assert env is not None
    assert env.observation_space is not None
    assert env.action_space is not None


def test_env_reset():
    """Test environment reset."""
    env = SyntheticTowerEnv(
        scenario="scenarios/straight_4.scn",
        step_seconds=5.0,
        seed=0
    )

    obs, info = env.reset()

    # Check observation shape
    assert obs.shape == env.observation_space.shape
    assert isinstance(obs, np.ndarray)
    assert obs.dtype == np.float32

    # Check info dict
    assert "alive" in info
    assert "num_alive" in info
    assert isinstance(info["num_alive"], int)


def test_env_step():
    """Test environment step."""
    env = SyntheticTowerEnv(
        scenario="scenarios/straight_4.scn",
        step_seconds=5.0,
        seed=0
    )

    obs, info = env.reset()

    # Take a random action
    action = env.action_space.sample()
    obs, reward, terminated, truncated, info = env.step(action)

    # Check outputs
    assert obs.shape == env.observation_space.shape
    assert isinstance(reward, (float, np.floating))
    assert isinstance(terminated, bool)
    assert isinstance(truncated, bool)
    assert isinstance(info, dict)

    # Check info dict
    assert "r_components" in info
    assert "min_sep_nm" in info
    assert "los" in info
    assert "num_alive" in info


def test_env_episode():
    """Test a short episode."""
    env = SyntheticTowerEnv(
        scenario="scenarios/straight_4.scn",
        step_seconds=5.0,
        seed=42
    )

    obs, info = env.reset()
    total_reward = 0.0
    steps = 0

    for _ in range(10):
        action = env.action_space.sample()
        obs, reward, terminated, truncated, info = env.step(action)

        assert obs.shape == env.observation_space.shape
        total_reward += reward
        steps += 1

        if terminated or truncated:
            break

    assert steps > 0
    assert isinstance(total_reward, (float, np.floating))


def test_action_space_bounds():
    """Test that action space has correct bounds."""
    env = SyntheticTowerEnv(
        scenario="scenarios/straight_4.scn",
        step_seconds=5.0,
        seed=0
    )

    # Sample multiple actions
    for _ in range(10):
        action = env.action_space.sample()
        assert env.action_space.contains(action)

        # Reshape to check per-aircraft bounds
        actions = action.reshape((16, 2))

        # Check heading deltas: [-0.2, 0.2]
        assert np.all(actions[:, 0] >= -0.2)
        assert np.all(actions[:, 0] <= 0.2)

        # Check altitude rate deltas: [-1.0, 1.0]
        assert np.all(actions[:, 1] >= -1.0)
        assert np.all(actions[:, 1] <= 1.0)


def test_observation_normalization():
    """Test that observations are properly normalized."""
    env = SyntheticTowerEnv(
        scenario="scenarios/straight_4.scn",
        step_seconds=5.0,
        seed=0
    )

    obs, info = env.reset()

    # Most features should be in [-1, 1] range
    # Allow some slack for numerical precision
    assert np.all(obs >= -1.1)
    assert np.all(obs <= 1.1)


def test_deterministic_reset():
    """Test that reset with same seed produces same initial state."""
    env1 = SyntheticTowerEnv(
        scenario="scenarios/straight_4.scn",
        step_seconds=5.0,
        seed=123
    )
    env2 = SyntheticTowerEnv(
        scenario="scenarios/straight_4.scn",
        step_seconds=5.0,
        seed=123
    )

    obs1, _ = env1.reset(seed=123)
    obs2, _ = env2.reset(seed=123)

    # Observations should be identical with same seed
    assert np.allclose(obs1, obs2)


def test_reward_components():
    """Test that reward components are present."""
    env = SyntheticTowerEnv(
        scenario="scenarios/straight_4.scn",
        step_seconds=5.0,
        seed=0
    )

    obs, info = env.reset()
    action = env.action_space.sample()
    obs, reward, terminated, truncated, info = env.step(action)

    # Check reward components
    r_comps = info["r_components"]
    expected_keys = ["los", "near", "progress", "smooth", "fuel", "terminal", "catastrophe"]

    for key in expected_keys:
        assert key in r_comps
        assert isinstance(r_comps[key], (float, np.floating))


if __name__ == "__main__":
    # Run tests manually
    test_env_creation()
    print("✓ test_env_creation")

    test_env_reset()
    print("✓ test_env_reset")

    test_env_step()
    print("✓ test_env_step")

    test_env_episode()
    print("✓ test_env_episode")

    test_action_space_bounds()
    print("✓ test_action_space_bounds")

    test_observation_normalization()
    print("✓ test_observation_normalization")

    test_deterministic_reset()
    print("✓ test_deterministic_reset")

    test_reward_components()
    print("✓ test_reward_components")

    print("\nAll tests passed!")
