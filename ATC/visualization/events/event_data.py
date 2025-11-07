"""Event data structures and serialization utilities."""

import json
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional, Union
from enum import Enum
import numpy as np


class EventType(str, Enum):
    """Enumeration of event types in the training system."""
    
    # Environment events
    ENV_RESET = "env.reset"
    ENV_STEP = "env.step"
    
    # Policy decision events
    POLICY_DECISION = "policy.decision"
    
    # Safety events
    SAFETY_VIOLATION = "safety.violation"
    
    # Training events
    TRAINING_ITERATION = "training.iteration"
    TRAINING_EPISODE_START = "training.episode_start"
    TRAINING_EPISODE_END = "training.episode_end"
    EPISODE_END = "training.episode_end"  # Alias for compatibility
    
    # Command events
    TRAINING_COMMAND = "training.command"
    SCENARIO_COMMAND = "scenario.command"


@dataclass
class EventData:
    """Base class for event data with serialization support."""
    
    timestamp: float
    event_type: EventType
    data: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event data to dictionary for serialization."""
        result = asdict(self)
        # Convert numpy arrays to lists for JSON serialization
        result["data"] = self._serialize_data(result["data"])
        return result
    
    def to_json(self) -> str:
        """Convert event data to JSON string."""
        return json.dumps(self.to_dict())
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EventData":
        """Create EventData from dictionary."""
        return cls(
            timestamp=data["timestamp"],
            event_type=EventType(data["event_type"]),
            data=data["data"]
        )
    
    @classmethod
    def from_json(cls, json_str: str) -> "EventData":
        """Create EventData from JSON string."""
        data = json.loads(json_str)
        return cls.from_dict(data)
    
    def _serialize_data(self, data: Any) -> Any:
        """Recursively serialize data for JSON compatibility."""
        if isinstance(data, np.ndarray):
            return data.tolist()
        elif isinstance(data, np.integer):
            return int(data)
        elif isinstance(data, np.floating):
            return float(data)
        elif isinstance(data, dict):
            return {k: self._serialize_data(v) for k, v in data.items()}
        elif isinstance(data, (list, tuple)):
            return [self._serialize_data(item) for item in data]
        else:
            return data


@dataclass
class EnvironmentResetEvent(EventData):
    """Event data for environment reset."""
    
    def __init__(self, timestamp: float, initial_observation: np.ndarray, 
                 scenario_config: Dict[str, Any]):
        super().__init__(
            timestamp=timestamp,
            event_type=EventType.ENV_RESET,
            data={
                "initial_observation": initial_observation,
                "scenario_config": scenario_config
            }
        )


@dataclass
class EnvironmentStepEvent(EventData):
    """Event data for environment step."""
    
    def __init__(self, timestamp: float, observation: np.ndarray, 
                 action: np.ndarray, reward: float, done: bool, 
                 info: Dict[str, Any]):
        super().__init__(
            timestamp=timestamp,
            event_type=EventType.ENV_STEP,
            data={
                "observation": observation,
                "action": action,
                "reward": reward,
                "done": done,
                "info": info
            }
        )


@dataclass
class PolicyDecisionEvent(EventData):
    """Event data for policy decisions."""
    
    def __init__(self, timestamp: float, observation: np.ndarray,
                 action: np.ndarray, policy_logits: np.ndarray,
                 value_estimate: float, confidence_scores: Dict[str, float]):
        super().__init__(
            timestamp=timestamp,
            event_type=EventType.POLICY_DECISION,
            data={
                "observation": observation,
                "action": action,
                "policy_logits": policy_logits,
                "value_estimate": value_estimate,
                "confidence_scores": confidence_scores
            }
        )


@dataclass
class SafetyViolationEvent(EventData):
    """Event data for safety violations."""
    
    def __init__(self, timestamp: float, violation_type: str,
                 aircraft_involved: List[str], separation_distance: float,
                 minimum_separation: float, severity: str):
        super().__init__(
            timestamp=timestamp,
            event_type=EventType.SAFETY_VIOLATION,
            data={
                "violation_type": violation_type,
                "aircraft_involved": aircraft_involved,
                "separation_distance": separation_distance,
                "minimum_separation": minimum_separation,
                "severity": severity
            }
        )


@dataclass
class TrainingIterationEvent(EventData):
    """Event data for training iteration completion."""
    
    def __init__(self, timestamp: float, iteration: int, 
                 episode_reward_mean: float, episode_len_mean: float,
                 metrics: Dict[str, float]):
        super().__init__(
            timestamp=timestamp,
            event_type=EventType.TRAINING_ITERATION,
            data={
                "iteration": iteration,
                "episode_reward_mean": episode_reward_mean,
                "episode_len_mean": episode_len_mean,
                "metrics": metrics
            }
        )