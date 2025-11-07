"""RLlib training callbacks for publishing training events."""

import time
from typing import Dict, Any, Optional
from ray.rllib.algorithms.callbacks import DefaultCallbacks
from ray.rllib.env import BaseEnv
from ray.rllib.policy import Policy
from ray.rllib.evaluation import Episode, RolloutWorker

from ..events import EventBus, get_event_bus
from ..events.event_data import TrainingIterationEvent, PolicyDecisionEvent, EventType


class TrainingEventCallback(DefaultCallbacks):
    """
    RLlib callback that publishes training events to the event bus.
    
    This callback hooks into the RLlib training loop to capture
    training iterations, policy decisions, and other training events.
    """
    
    def __init__(self, event_bus: Optional[EventBus] = None):
        """
        Initialize the training callback.
        
        Args:
            event_bus: Event bus instance (uses global if None)
        """
        super().__init__()
        self.event_bus = event_bus or get_event_bus()
        self._iteration_count = 0
    
    def on_algorithm_init(self, *, algorithm, **kwargs) -> None:
        """Called when algorithm is initialized."""
        print(f"TrainingEventCallback initialized for algorithm: {algorithm.__class__.__name__}")
    
    def on_train_result(self, *, algorithm, result: Dict[str, Any], **kwargs) -> None:
        """
        Called after each training iteration.
        
        Args:
            algorithm: The training algorithm instance
            result: Training result dictionary
        """
        self._iteration_count += 1
        
        # Extract key metrics
        episode_reward_mean = result.get("episode_reward_mean", 0.0)
        episode_len_mean = result.get("episode_len_mean", 0.0)
        
        # Extract custom metrics if available
        custom_metrics = result.get("custom_metrics", {})
        
        # Build comprehensive metrics dictionary
        metrics = {
            "episodes_this_iter": result.get("episodes_this_iter", 0),
            "timesteps_this_iter": result.get("timesteps_this_iter", 0),
            "timesteps_total": result.get("timesteps_total", 0),
            "time_this_iter_s": result.get("time_this_iter_s", 0.0),
            "time_total_s": result.get("time_total_s", 0.0),
        }
        
        # Add policy-specific metrics
        if "info" in result and "learner" in result["info"]:
            learner_info = result["info"]["learner"]
            if "default_policy" in learner_info:
                policy_info = learner_info["default_policy"]
                metrics.update({
                    "policy_loss": policy_info.get("learner_stats", {}).get("policy_loss", 0.0),
                    "vf_loss": policy_info.get("learner_stats", {}).get("vf_loss", 0.0),
                    "entropy": policy_info.get("learner_stats", {}).get("entropy", 0.0),
                    "kl": policy_info.get("learner_stats", {}).get("kl", 0.0),
                })
        
        # Add custom metrics
        metrics.update(custom_metrics)
        
        # Create and publish training iteration event
        training_event = TrainingIterationEvent(
            timestamp=time.time(),
            iteration=self._iteration_count,
            episode_reward_mean=episode_reward_mean,
            episode_len_mean=episode_len_mean,
            metrics=metrics
        )
        
        try:
            self.event_bus.publish_async(training_event)
        except Exception as e:
            print(f"Warning: Failed to publish training iteration event: {e}")
    
    def on_episode_start(self, *, worker: RolloutWorker, base_env: BaseEnv,
                        policies: Dict[str, Policy], episode: Episode, **kwargs) -> None:
        """Called at the start of each episode."""
        # Could publish episode start events here if needed
        pass
    
    def on_episode_step(self, *, worker: RolloutWorker, base_env: BaseEnv,
                       policies: Dict[str, Policy], episode: Episode, **kwargs) -> None:
        """Called at each step of an episode."""
        # Could capture policy decisions here, but might be too frequent
        # Better to do this in a policy wrapper or custom policy
        pass
    
    def on_episode_end(self, *, worker: RolloutWorker, base_env: BaseEnv,
                      policies: Dict[str, Policy], episode: Episode, **kwargs) -> None:
        """Called at the end of each episode."""
        # Could publish episode end events with summary statistics
        pass
    
    def on_postprocess_trajectory(self, *, worker: RolloutWorker, episode: Episode,
                                 agent_id: str, policy_id: str, policies: Dict[str, Policy],
                                 postprocessed_batch: Dict[str, Any],
                                 original_batches: Dict[str, Any], **kwargs) -> None:
        """Called after trajectory postprocessing."""
        # Could analyze trajectory data here for decision tracking
        pass


def create_training_callback(event_bus: Optional[EventBus] = None) -> TrainingEventCallback:
    """
    Create a training callback instance.
    
    Args:
        event_bus: Event bus instance (uses global if None)
        
    Returns:
        Training callback instance
    """
    return TrainingEventCallback(event_bus)