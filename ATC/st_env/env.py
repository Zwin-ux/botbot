"""Gymnasium environment for ATC using BlueSky simulator."""
import gymnasium as gym
import numpy as np
from gymnasium import spaces
from typing import Tuple, Dict, Any, Optional

from .utils import normalize_angle, pairwise_min_separation_nm
from .reward import compute_reward
from bluesky_adapter.adapter import BlueSkySim

# Environment constants
MAX_AC = 16  # Maximum number of aircraft
PER_AC_FEATS = 18  # Features per aircraft


class SyntheticTowerEnv(gym.Env):
    """
    Gymnasium environment for training an AI ATC controller.

    Single-agent environment where the controller issues vectoring commands
    to all aircraft in the sector.

    Observation: Per-aircraft state (position, velocity, heading, altitude, goal)
                 plus global features (wind, density, time)
    Action: Per-aircraft continuous (Δheading, Δaltitude_rate)
    Reward: Dense reward with safety penalties, progress rewards, efficiency
    """

    metadata = {"render_modes": []}

    def __init__(
        self,
        scenario: str,
        step_seconds: float = 5.0,
        seed: int = 0,
        horizon: int = 400
    ):
        """
        Initialize ATC environment.

        Args:
            scenario: Path to BlueSky scenario file
            step_seconds: Simulation time step in seconds
            seed: Random seed for reproducibility
            horizon: Maximum episode length in steps
        """
        super().__init__()

        self.sim = BlueSkySim(scenario, step_seconds, MAX_AC, seed)
        self.step_seconds = step_seconds
        self.scenario = scenario
        self._horizon = horizon

        # Observation space: flattened per-aircraft features + global features
        # Shape: (MAX_AC * PER_AC_FEATS + 8,)
        self.observation_space = spaces.Box(
            low=-1.0,
            high=1.0,
            shape=(MAX_AC * PER_AC_FEATS + 8,),
            dtype=np.float32
        )

        # Action space: per-aircraft (Δheading, Δaltitude_rate)
        # Δheading in [-0.2, 0.2] rad/step
        # Δalt_rate in [-1.0, 1.0] kft/min setpoint change
        action_low = np.tile(np.array([-0.2, -1.0], dtype=np.float32), MAX_AC)
        action_high = np.tile(np.array([+0.2, +1.0], dtype=np.float32), MAX_AC)
        self.action_space = spaces.Box(
            low=action_low,
            high=action_high,
            dtype=np.float32
        )

        # Internal state
        self._alive_mask = np.zeros(MAX_AC, dtype=np.float32)
        self._last_states: Optional[list] = None
        self._step_count = 0

    def seed(self, seed: Optional[int] = None) -> None:
        """
        Set random seed.

        Args:
            seed: Random seed value
        """
        if seed is not None:
            np.random.seed(seed)

    def _encode_obs(
        self, states: list
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Encode aircraft states into observation vector.

        Per-aircraft features (18 total):
        - x, y position (normalized to ~[-1, 1])
        - velocity (normalized)
        - heading (sin, cos)
        - altitude (normalized)
        - bearing to goal (sin, cos)
        - range to goal (normalized)
        - intent one-hot (5 dims)
        - spare slots (4 dims)

        Global features (8 total):
        - traffic density
        - wind components (2)
        - normalized time in episode
        - spare (4)

        Args:
            states: List of aircraft state dicts

        Returns:
            Tuple of (observation_array, alive_mask)
        """
        feats = np.zeros((MAX_AC, PER_AC_FEATS), dtype=np.float32)
        alive = np.zeros((MAX_AC,), dtype=np.float32)

        for i, ac in enumerate(states[:MAX_AC]):
            alive[i] = 1.0 if ac.get("alive", True) else 0.0

            # Position (normalized to ~100 NM sector)
            x, y = ac["x_nm"], ac["y_nm"]

            # Velocity (normalize: 600 kt max)
            v = ac["v_kt"] / 600.0

            # Heading (encode as sin/cos)
            hdg_s, hdg_c = np.sin(ac["hdg_rad"]), np.cos(ac["hdg_rad"])

            # Altitude (normalize: center at 15k ft, range ±15k)
            alt = (ac["alt_ft"] - 15000.0) / 15000.0

            # Goal bearing and range
            gx, gy = ac["goal_x_nm"], ac["goal_y_nm"]
            brg = np.arctan2(gy - y, gx - x)
            brg_s, brg_c = np.sin(brg), np.cos(brg)
            rng = np.hypot(gx - x, gy - y) / 100.0  # Normalize to 100 NM

            # Intent one-hot (if available)
            intent = ac.get("intent_onehot", np.zeros(5, dtype=np.float32))

            # Build feature vector
            row = np.array(
                [x / 100, y / 100, v, hdg_s, hdg_c, alt, brg_s, brg_c, rng],
                dtype=np.float32
            )
            feats[i, :9] = row
            feats[i, 9:14] = intent[:5]  # Intent one-hot
            # Remaining slots 14-18 reserved for future features

        # Global features
        global_feats = np.array([
            np.sum(alive) / MAX_AC,  # Traffic density
            0.0, 0.0,                # Wind components (placeholder)
            self._step_count / self._horizon,  # Normalized time
            0.0, 0.0, 0.0, 0.0       # Spare
        ], dtype=np.float32)

        # Concatenate and return
        obs = np.concatenate([feats.flatten(), global_feats], axis=0)
        return obs, alive

    def reset(
        self,
        *,
        seed: Optional[int] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Reset environment to initial state.

        Args:
            seed: Random seed
            options: Additional options (unused)

        Returns:
            Tuple of (observation, info_dict)
        """
        if seed is not None:
            self.seed(seed)

        states = self.sim.reset()
        obs, alive = self._encode_obs(states)

        self._alive_mask = alive
        self._last_states = states
        self._step_count = 0

        info = {"alive": alive, "num_alive": int(np.sum(alive))}
        return obs, info

    def step(
        self, action: np.ndarray
    ) -> Tuple[np.ndarray, float, bool, bool, Dict[str, Any]]:
        """
        Execute one time step.

        Args:
            action: Action array of shape (MAX_AC * 2,)
                   Contains (Δheading, Δaltitude_rate) for each aircraft

        Returns:
            Tuple of (observation, reward, terminated, truncated, info)
        """
        self._step_count += 1

        # Reshape actions: (MAX_AC, 2)
        actions = action.reshape((MAX_AC, 2)).astype(np.float32)

        # Build command list only for alive aircraft
        cmds = []
        for i, ac in enumerate(self._last_states[:MAX_AC]):
            if i >= len(self._last_states):
                break
            if not ac.get("alive", True):
                continue

            cmds.append({
                "id": ac["id"],
                "delta_hdg": float(actions[i, 0]),
                "delta_vs": float(actions[i, 1]) * 1000.0  # kft/min → ft/min
            })

        # Advance simulation
        states = self.sim.step(cmds)

        # Encode new observation
        obs, alive = self._encode_obs(states)

        # Compute separation metrics
        min_sep_nm, los_count = pairwise_min_separation_nm(states)

        # Compute reward
        reward, r_components = compute_reward(
            prev_states=self._last_states,
            cur_states=states,
            min_sep_nm=min_sep_nm,
            los_count=los_count,
            alive_mask=alive
        )

        # Update state
        self._last_states = states
        self._alive_mask = alive

        # Check termination conditions
        terminated = False
        truncated = False

        # Terminate on catastrophe
        if r_components["catastrophe"] < 0:
            terminated = True

        # Truncate on horizon
        if self._step_count >= self._horizon:
            truncated = True

        # Terminate if all aircraft exited
        if np.sum(alive) == 0:
            terminated = True

        # Build info dict
        info = {
            "r_components": r_components,
            "min_sep_nm": min_sep_nm,
            "los": los_count,
            "num_alive": int(np.sum(alive)),
            "step_count": self._step_count
        }

        return obs, reward, terminated, truncated, info

    def render(self) -> None:
        """Render is not implemented."""
        pass

    def close(self) -> None:
        """Clean up resources."""
        pass
