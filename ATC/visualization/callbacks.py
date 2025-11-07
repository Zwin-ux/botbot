"""
Visualization callbacks for streaming data from training environment.

Integrates with SyntheticTowerEnv to capture and stream simulation state
to visualization clients.
"""
from typing import Dict, List, Any, Optional
import time
import json
from collections import deque


class VisualizationCallback:
    """
    Callback for capturing and streaming environment state during training.

    This callback hooks into the environment's step() method to capture:
    - Aircraft states (positions, velocities, headings)
    - Actions taken by the policy
    - Rewards and reward components
    - Episode metrics

    Data can be streamed in real-time to a visualization server or buffered
    for later replay.
    """

    def __init__(
        self,
        viz_server: Optional[Any] = None,
        throttle_ms: int = 100,
        buffer_size: int = 1000
    ):
        """
        Initialize visualization callback.

        Args:
            viz_server: Optional VisualizationServer instance for streaming
            throttle_ms: Minimum milliseconds between updates (for rate limiting)
            buffer_size: Maximum number of steps to buffer in memory
        """
        self.viz_server = viz_server
        self.throttle_ms = throttle_ms
        self.buffer_size = buffer_size

        self.last_send_time = 0
        self.episode_states: deque = deque(maxlen=buffer_size)
        self.episode_count = 0
        self.step_count = 0

        # Metrics aggregation
        self.episode_rewards: List[float] = []
        self.episode_lengths: List[int] = []
        self.los_events: List[int] = []

    def on_reset(self, states: List[Dict[str, Any]], info: Dict[str, Any]):
        """
        Called when environment is reset.

        Args:
            states: Initial aircraft states
            info: Additional info dict from environment
        """
        # Clear episode buffer
        self.episode_states.clear()
        self.episode_count += 1

        # Stream initial state if connected
        if self.viz_server and self._should_send():
            self._stream_state({
                "type": "reset",
                "episode": self.episode_count,
                "states": self._serialize_states(states),
                "info": info,
                "timestamp": time.time()
            })

    def on_step(
        self,
        states: List[Dict[str, Any]],
        actions: Any,
        rewards: float,
        info: Dict[str, Any]
    ):
        """
        Called after each environment step.

        Args:
            states: Current aircraft states
            actions: Actions taken this step
            rewards: Reward received
            info: Additional info dict
        """
        self.step_count += 1

        # Buffer step data
        step_data = {
            "step": self.step_count,
            "states": self._serialize_states(states),
            "actions": self._serialize_actions(actions),
            "reward": float(rewards),
            "info": self._serialize_info(info),
            "timestamp": time.time()
        }
        self.episode_states.append(step_data)

        # Stream to clients if rate limit allows
        if self.viz_server and self._should_send():
            self._stream_state({
                "type": "step",
                "episode": self.episode_count,
                **step_data
            })

    def on_episode_end(
        self,
        total_reward: float,
        episode_length: int,
        info: Dict[str, Any]
    ):
        """
        Called at the end of an episode.

        Args:
            total_reward: Cumulative episode reward
            episode_length: Number of steps in episode
            info: Final info dict
        """
        # Aggregate metrics
        self.episode_rewards.append(total_reward)
        self.episode_lengths.append(episode_length)

        if "los" in info:
            self.los_events.append(info["los"])

        # Stream episode summary
        if self.viz_server:
            summary = {
                "type": "episode_end",
                "episode": self.episode_count,
                "total_reward": total_reward,
                "episode_length": episode_length,
                "info": self._serialize_info(info),
                "timestamp": time.time(),
                "metrics": self._get_aggregate_metrics()
            }
            self._stream_state(summary)

    def get_episode_buffer(self) -> List[Dict[str, Any]]:
        """
        Get buffered episode data for replay.

        Returns:
            List of step data dictionaries
        """
        return list(self.episode_states)

    def _should_send(self) -> bool:
        """Check if enough time has passed to send next update."""
        now = time.time() * 1000  # Convert to ms
        if now - self.last_send_time >= self.throttle_ms:
            self.last_send_time = now
            return True
        return False

    def _stream_state(self, data: Dict[str, Any]):
        """
        Stream data to visualization server.

        Args:
            data: Data dictionary to stream
        """
        if self.viz_server:
            # Async streaming handled by server
            self.viz_server.queue_message(data)

    def _serialize_states(self, states: List[Dict[str, Any]]) -> List[Dict]:
        """
        Serialize aircraft states for JSON transmission.

        Args:
            states: List of aircraft state dicts

        Returns:
            JSON-serializable list of states
        """
        serialized = []
        for state in states:
            serialized.append({
                "id": state["id"],
                "x_nm": float(state["x_nm"]),
                "y_nm": float(state["y_nm"]),
                "v_kt": float(state["v_kt"]),
                "hdg_rad": float(state["hdg_rad"]),
                "alt_ft": float(state["alt_ft"]),
                "goal_x_nm": float(state["goal_x_nm"]),
                "goal_y_nm": float(state["goal_y_nm"]),
                "alive": bool(state["alive"])
            })
        return serialized

    def _serialize_actions(self, actions: Any) -> List[float]:
        """
        Serialize actions for JSON transmission.

        Args:
            actions: Action array or list

        Returns:
            JSON-serializable list of actions
        """
        if hasattr(actions, 'tolist'):
            return actions.tolist()
        return list(actions)

    def _serialize_info(self, info: Dict[str, Any]) -> Dict:
        """
        Serialize info dict for JSON transmission.

        Args:
            info: Info dictionary from environment

        Returns:
            JSON-serializable info dict
        """
        serialized = {}
        for key, value in info.items():
            if isinstance(value, dict):
                # Handle nested dicts (e.g., r_components)
                serialized[key] = {k: float(v) for k, v in value.items()}
            elif hasattr(value, 'tolist'):
                serialized[key] = value.tolist()
            elif isinstance(value, (int, float, str, bool)):
                serialized[key] = value
            else:
                serialized[key] = str(value)
        return serialized

    def _get_aggregate_metrics(self) -> Dict[str, Any]:
        """
        Compute aggregate metrics across recent episodes.

        Returns:
            Dictionary of aggregate metrics
        """
        recent_window = 100  # Last 100 episodes

        metrics = {}

        if len(self.episode_rewards) > 0:
            recent_rewards = self.episode_rewards[-recent_window:]
            metrics["mean_reward"] = sum(recent_rewards) / len(recent_rewards)
            metrics["min_reward"] = min(recent_rewards)
            metrics["max_reward"] = max(recent_rewards)

        if len(self.episode_lengths) > 0:
            recent_lengths = self.episode_lengths[-recent_window:]
            metrics["mean_length"] = sum(recent_lengths) / len(recent_lengths)

        if len(self.los_events) > 0:
            recent_los = self.los_events[-recent_window:]
            metrics["mean_los"] = sum(recent_los) / len(recent_los)
            metrics["total_los"] = sum(self.los_events)

        metrics["total_episodes"] = self.episode_count
        metrics["total_steps"] = self.step_count

        return metrics


class SimpleLogger:
    """
    Simple file-based logger for offline analysis.

    Writes episode data to JSON files for later visualization or analysis.
    """

    def __init__(self, output_dir: str = "./logs/episodes"):
        """
        Initialize logger.

        Args:
            output_dir: Directory to write episode logs
        """
        import os
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        self.episode_count = 0

    def log_episode(self, episode_data: List[Dict[str, Any]], metadata: Dict):
        """
        Write episode data to file.

        Args:
            episode_data: List of step data
            metadata: Episode metadata (reward, length, etc.)
        """
        self.episode_count += 1
        filename = f"episode_{self.episode_count:06d}.json"
        filepath = f"{self.output_dir}/{filename}"

        with open(filepath, 'w') as f:
            json.dump({
                "metadata": metadata,
                "steps": episode_data
            }, f, indent=2)
