"""Decision tracking system for capturing AI reasoning processes."""

import time
import json
import pickle
from collections import deque
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import threading

from ..events import EventBus, get_event_bus
from ..events.event_data import EventData, EventType


@dataclass
class DecisionRecord:
    """
    Record of a single AI decision with context and reasoning information.
    
    This captures all relevant information about a policy decision including
    the observation, action taken, policy outputs, and derived explanations.
    """
    
    # Core decision data
    timestamp: float
    decision_id: str
    observation: np.ndarray
    action: np.ndarray
    
    # Policy network outputs
    policy_logits: np.ndarray
    value_estimate: float
    confidence_scores: Dict[str, float]
    
    # Context information
    episode_id: Optional[str] = None
    step_number: Optional[int] = None
    reward: Optional[float] = None
    
    # Derived explanations (populated later)
    explanation: Optional[str] = None
    predicted_outcomes: Optional[Dict[str, float]] = None
    attention_weights: Optional[np.ndarray] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert decision record to dictionary for serialization."""
        result = asdict(self)
        # Convert numpy arrays to lists for JSON serialization
        result["observation"] = self.observation.tolist() if self.observation is not None else None
        result["action"] = self.action.tolist() if self.action is not None else None
        result["policy_logits"] = self.policy_logits.tolist() if self.policy_logits is not None else None
        result["attention_weights"] = self.attention_weights.tolist() if self.attention_weights is not None else None
        return result
    
    def to_json(self) -> str:
        """Convert decision record to JSON string."""
        return json.dumps(self.to_dict())
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DecisionRecord":
        """Create DecisionRecord from dictionary."""
        # Convert lists back to numpy arrays
        if data.get("observation") is not None:
            data["observation"] = np.array(data["observation"])
        if data.get("action") is not None:
            data["action"] = np.array(data["action"])
        if data.get("policy_logits") is not None:
            data["policy_logits"] = np.array(data["policy_logits"])
        if data.get("attention_weights") is not None:
            data["attention_weights"] = np.array(data["attention_weights"])
        
        return cls(**data)


class DecisionTracker:
    """
    Tracks and manages AI decision records with efficient storage and retrieval.
    
    This class maintains a rolling buffer of decision records, provides
    serialization capabilities, and integrates with the event bus system.
    """
    
    def __init__(self, max_decisions: int = 100, event_bus: Optional[EventBus] = None):
        """
        Initialize the decision tracker.
        
        Args:
            max_decisions: Maximum number of decisions to keep in memory
            event_bus: Event bus instance (uses global if None)
        """
        self.max_decisions = max_decisions
        self.event_bus = event_bus or get_event_bus()
        
        # Rolling buffer for decision records
        self._decisions: deque = deque(maxlen=max_decisions)
        self._decision_count = 0
        self._lock = threading.RLock()
        
        # Subscribe to policy decision events
        self._subscription_id = self.event_bus.subscribe(
            EventType.POLICY_DECISION, 
            self._handle_policy_decision_event
        )
        
        print(f"DecisionTracker initialized with max_decisions={max_decisions}")
    
    def log_decision(self, observation: np.ndarray, action: np.ndarray,
                    policy_output: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> str:
        """
        Log a new decision record.
        
        Args:
            observation: Input observation array
            action: Selected action array
            policy_output: Policy network output dictionary
            context: Additional context information (optional)
            
        Returns:
            Decision ID for the logged record
        """
        with self._lock:
            self._decision_count += 1
            decision_id = f"decision_{self._decision_count}_{int(time.time() * 1000)}"
            
            # Extract policy information
            policy_logits = policy_output.get("action_logits", np.array([]))
            value_estimate = policy_output.get("vf_preds", np.array([0.0]))[0]
            confidence_scores = policy_output.get("confidence_scores", {})
            
            # Extract context information
            episode_id = context.get("episode_id") if context else None
            step_number = context.get("step_number") if context else None
            reward = context.get("reward") if context else None
            
            # Create decision record
            decision_record = DecisionRecord(
                timestamp=time.time(),
                decision_id=decision_id,
                observation=observation.copy(),
                action=action.copy(),
                policy_logits=policy_logits.copy() if len(policy_logits) > 0 else np.array([]),
                value_estimate=float(value_estimate),
                confidence_scores=confidence_scores.copy(),
                episode_id=episode_id,
                step_number=step_number,
                reward=reward
            )
            
            # Add to rolling buffer
            self._decisions.append(decision_record)
            
            return decision_id
    
    def get_decision_history(self, limit: Optional[int] = None) -> List[DecisionRecord]:
        """
        Get decision history records.
        
        Args:
            limit: Maximum number of records to return (None for all)
            
        Returns:
            List of decision records (most recent first)
        """
        with self._lock:
            decisions = list(reversed(self._decisions))
            
            if limit is not None:
                decisions = decisions[:limit]
            
            return decisions
    
    def get_decision_by_id(self, decision_id: str) -> Optional[DecisionRecord]:
        """
        Get a specific decision record by ID.
        
        Args:
            decision_id: ID of the decision to retrieve
            
        Returns:
            Decision record if found, None otherwise
        """
        with self._lock:
            for decision in self._decisions:
                if decision.decision_id == decision_id:
                    return decision
            return None
    
    def get_recent_decisions(self, seconds: float) -> List[DecisionRecord]:
        """
        Get decisions made within the last N seconds.
        
        Args:
            seconds: Time window in seconds
            
        Returns:
            List of recent decision records
        """
        cutoff_time = time.time() - seconds
        
        with self._lock:
            recent_decisions = [
                decision for decision in self._decisions
                if decision.timestamp >= cutoff_time
            ]
            
            return list(reversed(recent_decisions))  # Most recent first
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about tracked decisions.
        
        Returns:
            Dictionary of statistics
        """
        with self._lock:
            if not self._decisions:
                return {
                    "total_decisions": 0,
                    "buffer_size": 0,
                    "time_range": None,
                    "average_confidence": None
                }
            
            decisions = list(self._decisions)
            timestamps = [d.timestamp for d in decisions]
            confidences = []
            
            # Collect confidence scores
            for decision in decisions:
                if "action_confidence" in decision.confidence_scores:
                    confidences.append(decision.confidence_scores["action_confidence"])
                elif "max_probability" in decision.confidence_scores:
                    confidences.append(decision.confidence_scores["max_probability"])
            
            return {
                "total_decisions": self._decision_count,
                "buffer_size": len(decisions),
                "time_range": {
                    "start": min(timestamps),
                    "end": max(timestamps),
                    "duration": max(timestamps) - min(timestamps)
                },
                "average_confidence": np.mean(confidences) if confidences else None,
                "confidence_std": np.std(confidences) if confidences else None
            }
    
    def save_to_file(self, filepath: str, format: str = "json") -> None:
        """
        Save decision history to file.
        
        Args:
            filepath: Path to save file
            format: Format to use ("json" or "pickle")
        """
        with self._lock:
            decisions = list(self._decisions)
        
        if format == "json":
            with open(filepath, 'w') as f:
                json.dump([d.to_dict() for d in decisions], f, indent=2)
        elif format == "pickle":
            with open(filepath, 'wb') as f:
                pickle.dump(decisions, f)
        else:
            raise ValueError(f"Unsupported format: {format}")
        
        print(f"Saved {len(decisions)} decisions to {filepath}")
    
    def load_from_file(self, filepath: str, format: str = "json") -> None:
        """
        Load decision history from file.
        
        Args:
            filepath: Path to load file
            format: Format to use ("json" or "pickle")
        """
        if format == "json":
            with open(filepath, 'r') as f:
                data = json.load(f)
                decisions = [DecisionRecord.from_dict(d) for d in data]
        elif format == "pickle":
            with open(filepath, 'rb') as f:
                decisions = pickle.load(f)
        else:
            raise ValueError(f"Unsupported format: {format}")
        
        with self._lock:
            self._decisions.clear()
            self._decisions.extend(decisions[-self.max_decisions:])  # Keep only recent ones
            self._decision_count = len(decisions)
        
        print(f"Loaded {len(decisions)} decisions from {filepath}")
    
    def clear_history(self) -> None:
        """Clear all decision history."""
        with self._lock:
            self._decisions.clear()
            self._decision_count = 0
        
        print("Decision history cleared")
    
    def shutdown(self) -> None:
        """Shutdown the decision tracker and cleanup resources."""
        if self._subscription_id:
            self.event_bus.unsubscribe(self._subscription_id)
            self._subscription_id = None
        
        print("DecisionTracker shutdown complete")
    
    def _handle_policy_decision_event(self, event: EventData) -> None:
        """
        Handle policy decision events from the event bus.
        
        Args:
            event: Policy decision event data
        """
        try:
            data = event.data
            
            # Extract data from event
            observation = np.array(data.get("observation", []))
            action = np.array(data.get("action", []))
            
            # Build policy output dictionary
            policy_output = {
                "action_logits": np.array(data.get("policy_logits", [])),
                "vf_preds": np.array([data.get("value_estimate", 0.0)]),
                "confidence_scores": data.get("confidence_scores", {})
            }
            
            # Log the decision
            self.log_decision(observation, action, policy_output)
            
        except Exception as e:
            print(f"Warning: Error handling policy decision event: {e}")


# Global decision tracker instance
_global_decision_tracker: Optional[DecisionTracker] = None


def get_decision_tracker() -> DecisionTracker:
    """Get the global decision tracker instance."""
    global _global_decision_tracker
    if _global_decision_tracker is None:
        _global_decision_tracker = DecisionTracker()
    return _global_decision_tracker


def set_decision_tracker(tracker: DecisionTracker) -> None:
    """Set the global decision tracker instance."""
    global _global_decision_tracker
    if _global_decision_tracker is not None:
        _global_decision_tracker.shutdown()
    _global_decision_tracker = tracker


def shutdown_decision_tracker() -> None:
    """Shutdown the global decision tracker."""
    global _global_decision_tracker
    if _global_decision_tracker is not None:
        _global_decision_tracker.shutdown()
        _global_decision_tracker = None