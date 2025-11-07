"""
Integration helpers for easily adding visualization to training.

Provides high-level APIs to integrate visualization with minimal code changes.
"""
import asyncio
import threading
from typing import Optional, Callable
from pathlib import Path

from .viz_server import VisualizationServer
from .callbacks import VisualizationCallback
from .replay import EpisodeRecorder


class VisualizationManager:
    """
    High-level manager for visualization system.

    Handles server lifecycle, callback creation, and episode recording
    with a simple API.
    """

    def __init__(
        self,
        host: str = "localhost",
        port: int = 8765,
        record_episodes: bool = True,
        episodes_dir: str = "./logs/episodes",
        throttle_ms: int = 100
    ):
        """
        Initialize visualization manager.

        Args:
            host: WebSocket server host
            port: WebSocket server port
            record_episodes: Whether to record episodes to disk
            episodes_dir: Directory for episode recordings
            throttle_ms: Minimum milliseconds between updates
        """
        self.host = host
        self.port = port
        self.throttle_ms = throttle_ms

        # Create server
        self.server = VisualizationServer(host, port)

        # Create callback
        self.callback = VisualizationCallback(
            viz_server=self.server,
            throttle_ms=throttle_ms
        )

        # Optional episode recorder
        self.recorder = EpisodeRecorder(episodes_dir) if record_episodes else None
        self.record_episodes = record_episodes

        # Server thread
        self._server_thread: Optional[threading.Thread] = None
        self._is_running = False

    def start(self, daemon: bool = True):
        """
        Start the visualization server in a background thread.

        Args:
            daemon: Whether to run as daemon thread
        """
        if self._is_running:
            print("Visualization server already running")
            return

        def run_server():
            asyncio.run(self.server.start())

        self._server_thread = threading.Thread(
            target=run_server,
            daemon=daemon,
            name="VizServer"
        )
        self._server_thread.start()
        self._is_running = True

        print(f"✓ Visualization server started on ws://{self.host}:{self.port}")
        print(f"  Open visualization/web/index.html in your browser")

    def get_callback(self) -> VisualizationCallback:
        """
        Get the visualization callback for passing to environment.

        Returns:
            VisualizationCallback instance
        """
        return self.callback

    def on_episode_end(self, metadata: dict):
        """
        Called when episode ends to save recording.

        Args:
            metadata: Episode metadata (reward, length, etc.)
        """
        if self.recorder and self.record_episodes:
            episode_data = self.callback.get_episode_buffer()
            if episode_data:
                filepath = self.recorder.save_episode(metadata)
                print(f"  Saved episode to: {filepath}")

    def stop(self):
        """Stop the visualization server."""
        # Note: asyncio servers don't stop gracefully without additional work
        # This is a placeholder for future cleanup
        self._is_running = False


def setup_visualization(
    enable: bool = True,
    port: int = 8765,
    record: bool = True,
    **kwargs
) -> Optional[VisualizationManager]:
    """
    Quick setup function for visualization.

    Usage:
        viz = setup_visualization()
        if viz:
            callback = viz.get_callback()
            env = SyntheticTowerEnv(..., viz_callback=callback)

    Args:
        enable: Whether to enable visualization
        port: WebSocket port
        record: Whether to record episodes
        **kwargs: Additional arguments for VisualizationManager

    Returns:
        VisualizationManager instance or None if disabled
    """
    if not enable:
        return None

    manager = VisualizationManager(port=port, record_episodes=record, **kwargs)
    manager.start()

    return manager


class EnvWrapper:
    """
    Wrapper for SyntheticTowerEnv that automatically integrates visualization.

    Makes it trivial to add visualization to existing environments.
    """

    def __init__(self, env, viz_manager: Optional[VisualizationManager] = None):
        """
        Wrap an environment with visualization.

        Args:
            env: SyntheticTowerEnv instance
            viz_manager: Optional VisualizationManager (creates one if None)
        """
        self.env = env
        self.viz_manager = viz_manager or VisualizationManager()

        # Start server if not already running
        if viz_manager is None:
            self.viz_manager.start()

        self.callback = self.viz_manager.get_callback()
        self._episode_reward = 0.0

    def reset(self, **kwargs):
        """Reset environment and notify visualization."""
        obs, info = self.env.reset(**kwargs)

        # Get initial states from sim
        states = self.env.sim._snapshot()
        self.callback.on_reset(states, info)
        self._episode_reward = 0.0

        return obs, info

    def step(self, action):
        """Step environment and notify visualization."""
        obs, reward, terminated, truncated, info = self.env.step(action)

        # Get current states
        states = self.env.sim._snapshot()
        self.callback.on_step(states, action, reward, info)

        self._episode_reward += reward

        # Handle episode end
        if terminated or truncated:
            self.callback.on_episode_end(
                total_reward=self._episode_reward,
                episode_length=self.env._step_count,
                info=info
            )

            # Save episode if recording enabled
            self.viz_manager.on_episode_end({
                "total_reward": self._episode_reward,
                "episode_length": self.env._step_count,
                "info": info
            })

        return obs, reward, terminated, truncated, info

    def __getattr__(self, name):
        """Forward all other attributes to wrapped environment."""
        return getattr(self.env, name)


def wrap_env_with_viz(env, enable: bool = True, **kwargs):
    """
    Convenience function to wrap an environment with visualization.

    Usage:
        env = SyntheticTowerEnv(...)
        env = wrap_env_with_viz(env, enable=True)

    Args:
        env: Environment to wrap
        enable: Whether to enable visualization
        **kwargs: Additional arguments for VisualizationManager

    Returns:
        Wrapped environment or original if disabled
    """
    if not enable:
        return env

    viz_manager = VisualizationManager(**kwargs)
    viz_manager.start()

    return EnvWrapper(env, viz_manager)


# Decorator for automatic visualization
def with_visualization(
    port: int = 8765,
    record: bool = True,
    auto_start: bool = True
):
    """
    Decorator to automatically add visualization to env factory functions.

    Usage:
        @with_visualization(port=8765)
        def make_env(config):
            return SyntheticTowerEnv(**config)

        # Now make_env() returns a wrapped environment with viz

    Args:
        port: WebSocket port
        record: Whether to record episodes
        auto_start: Whether to auto-start server

    Returns:
        Decorator function
    """
    viz_manager = None

    def decorator(env_factory: Callable):
        def wrapper(*args, **kwargs):
            nonlocal viz_manager

            # Create manager on first call
            if viz_manager is None and auto_start:
                viz_manager = VisualizationManager(
                    port=port,
                    record_episodes=record
                )
                viz_manager.start()

            # Create environment
            env = env_factory(*args, **kwargs)

            # Wrap with visualization
            if viz_manager:
                return EnvWrapper(env, viz_manager)

            return env

        return wrapper

    return decorator


# Simple progress callback for training
class TrainingProgressCallback:
    """
    Simple callback for tracking training progress.

    Can be used alongside visualization or standalone.
    """

    def __init__(self, log_interval: int = 10):
        """
        Initialize progress callback.

        Args:
            log_interval: Log every N episodes
        """
        self.log_interval = log_interval
        self.episode_count = 0
        self.episode_rewards = []
        self.episode_lengths = []

    def on_episode_end(
        self,
        reward: float,
        length: int,
        info: dict
    ):
        """
        Called at end of episode.

        Args:
            reward: Total episode reward
            length: Episode length in steps
            info: Episode info dict
        """
        self.episode_count += 1
        self.episode_rewards.append(reward)
        self.episode_lengths.append(length)

        if self.episode_count % self.log_interval == 0:
            recent_rewards = self.episode_rewards[-self.log_interval:]
            recent_lengths = self.episode_lengths[-self.log_interval:]

            avg_reward = sum(recent_rewards) / len(recent_rewards)
            avg_length = sum(recent_lengths) / len(recent_lengths)

            print(f"Episode {self.episode_count}: "
                  f"Avg Reward: {avg_reward:.2f}, "
                  f"Avg Length: {avg_length:.1f}")

            if "los" in info:
                print(f"  LoS Events: {info['los']}")


# Example integration with RLlib
def make_rllib_env_with_viz(config: dict):
    """
    Environment factory for RLlib with visualization.

    Usage in train_rllib.py:
        register_env("SyntheticTowerEnv", make_rllib_env_with_viz)

    Args:
        config: RLlib environment config

    Returns:
        Environment instance with visualization
    """
    from st_env.env import SyntheticTowerEnv

    # Check if visualization is enabled in config
    enable_viz = config.get("enable_viz", False)
    worker_index = config.get("worker_index", 0)

    # Only visualize worker 0 to avoid overhead
    enable_viz = enable_viz and (worker_index == 0)

    env = SyntheticTowerEnv(
        scenario=config.get("scenario", "scenarios/straight_4.scn"),
        step_seconds=config.get("step_seconds", 5.0),
        seed=config.get("seed", 0),
        horizon=config.get("horizon", 400)
    )

    if enable_viz:
        return wrap_env_with_viz(env)

    return env
