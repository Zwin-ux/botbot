"""Pattern analysis system for detecting recurring AI behaviors."""

import time
import numpy as np
from collections import defaultdict, Counter
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import threading

from .decision_tracker import DecisionRecord, DecisionTracker, get_decision_tracker


@dataclass
class BehaviorPattern:
    """
    Represents a detected behavioral pattern in AI decisions.
    """
    pattern_id: str
    pattern_type: str  # "action_sequence", "observation_cluster", "temporal", etc.
    frequency: int
    confidence: float
    description: str
    examples: List[str]  # Decision IDs that exhibit this pattern
    characteristics: Dict[str, Any]
    first_seen: float
    last_seen: float


class PatternAnalyzer:
    """
    Analyzes decision history to detect recurring behavioral patterns.
    
    This class implements various pattern detection algorithms to identify
    common behaviors, decision sequences, and response patterns in AI decisions.
    """
    
    def __init__(self, decision_tracker: Optional[DecisionTracker] = None,
                 min_pattern_frequency: int = 3, confidence_threshold: float = 0.7):
        """
        Initialize the pattern analyzer.
        
        Args:
            decision_tracker: Decision tracker instance (uses global if None)
            min_pattern_frequency: Minimum frequency for pattern detection
            confidence_threshold: Minimum confidence for pattern reporting
        """
        self.decision_tracker = decision_tracker or get_decision_tracker()
        self.min_pattern_frequency = min_pattern_frequency
        self.confidence_threshold = confidence_threshold
        
        # Pattern storage
        self._detected_patterns: Dict[str, BehaviorPattern] = {}
        self._pattern_counter = 0
        self._lock = threading.RLock()
        
        # Analysis cache
        self._last_analysis_time = 0
        self._analysis_cache_duration = 30.0  # seconds
        
        print(f"PatternAnalyzer initialized with min_frequency={min_pattern_frequency}, "
              f"confidence_threshold={confidence_threshold}")
    
    def analyze_patterns(self, lookback_seconds: Optional[float] = None) -> List[BehaviorPattern]:
        """
        Analyze decision history to detect behavioral patterns.
        
        Args:
            lookback_seconds: Time window to analyze (None for all history)
            
        Returns:
            List of detected behavioral patterns
        """
        current_time = time.time()
        
        # Check cache validity
        if (current_time - self._last_analysis_time) < self._analysis_cache_duration:
            with self._lock:
                return list(self._detected_patterns.values())
        
        # Get decision history
        if lookback_seconds:
            decisions = self.decision_tracker.get_recent_decisions(lookback_seconds)
        else:
            decisions = self.decision_tracker.get_decision_history()
        
        if len(decisions) < self.min_pattern_frequency:
            return []
        
        patterns = []
        
        # Detect different types of patterns
        patterns.extend(self._detect_action_sequence_patterns(decisions))
        patterns.extend(self._detect_observation_cluster_patterns(decisions))
        patterns.extend(self._detect_temporal_patterns(decisions))
        patterns.extend(self._detect_confidence_patterns(decisions))
        patterns.extend(self._detect_reward_response_patterns(decisions))
        
        # Filter by confidence threshold
        patterns = [p for p in patterns if p.confidence >= self.confidence_threshold]
        
        # Update cache
        with self._lock:
            self._detected_patterns.clear()
            for pattern in patterns:
                self._detected_patterns[pattern.pattern_id] = pattern
            self._last_analysis_time = current_time
        
        return patterns
    
    def get_pattern_summary(self) -> Dict[str, Any]:
        """
        Get a summary of detected patterns.
        
        Returns:
            Dictionary containing pattern summary statistics
        """
        with self._lock:
            patterns = list(self._detected_patterns.values())
        
        if not patterns:
            return {
                "total_patterns": 0,
                "pattern_types": {},
                "average_confidence": 0.0,
                "most_frequent_pattern": None
            }
        
        pattern_types = Counter(p.pattern_type for p in patterns)
        confidences = [p.confidence for p in patterns]
        most_frequent = max(patterns, key=lambda p: p.frequency)
        
        return {
            "total_patterns": len(patterns),
            "pattern_types": dict(pattern_types),
            "average_confidence": np.mean(confidences),
            "confidence_std": np.std(confidences),
            "most_frequent_pattern": {
                "id": most_frequent.pattern_id,
                "type": most_frequent.pattern_type,
                "frequency": most_frequent.frequency,
                "description": most_frequent.description
            }
        }
    
    def _detect_action_sequence_patterns(self, decisions: List[DecisionRecord]) -> List[BehaviorPattern]:
        """Detect patterns in action sequences."""
        patterns = []
        
        try:
            # Extract action sequences
            action_sequences = []
            sequence_length = 3  # Look for 3-action sequences
            
            for i in range(len(decisions) - sequence_length + 1):
                sequence = []
                for j in range(sequence_length):
                    action = decisions[i + j].action
                    # Discretize continuous actions for pattern detection
                    if len(action) > 0:
                        discretized = self._discretize_action(action)
                        sequence.append(discretized)
                
                if len(sequence) == sequence_length:
                    action_sequences.append((tuple(sequence), i))
            
            # Count sequence frequencies
            sequence_counts = Counter(seq for seq, _ in action_sequences)
            
            # Create patterns for frequent sequences
            for sequence, count in sequence_counts.items():
                if count >= self.min_pattern_frequency:
                    # Find examples
                    examples = [
                        decisions[idx].decision_id 
                        for seq, idx in action_sequences 
                        if seq == sequence
                    ][:5]  # Limit examples
                    
                    # Calculate confidence based on frequency
                    confidence = min(1.0, count / len(action_sequences))
                    
                    pattern = BehaviorPattern(
                        pattern_id=f"action_seq_{self._pattern_counter}",
                        pattern_type="action_sequence",
                        frequency=count,
                        confidence=confidence,
                        description=f"Repeated action sequence: {sequence}",
                        examples=examples,
                        characteristics={"sequence": sequence, "length": sequence_length},
                        first_seen=min(decisions[idx].timestamp for _, idx in action_sequences if _ == sequence),
                        last_seen=max(decisions[idx].timestamp for _, idx in action_sequences if _ == sequence)
                    )
                    
                    patterns.append(pattern)
                    self._pattern_counter += 1
        
        except Exception as e:
            print(f"Warning: Error detecting action sequence patterns: {e}")
        
        return patterns
    
    def _detect_observation_cluster_patterns(self, decisions: List[DecisionRecord]) -> List[BehaviorPattern]:
        """Detect patterns in observation clusters."""
        patterns = []
        
        try:
            if len(decisions) < 10:  # Need minimum data for clustering
                return patterns
            
            # Extract observations
            observations = []
            decision_indices = []
            
            for i, decision in enumerate(decisions):
                if decision.observation is not None and len(decision.observation) > 0:
                    observations.append(decision.observation.flatten())
                    decision_indices.append(i)
            
            if len(observations) < 10:
                return patterns
            
            observations = np.array(observations)
            
            # Standardize observations
            scaler = StandardScaler()
            observations_scaled = scaler.fit_transform(observations)
            
            # Perform clustering
            n_clusters = min(5, len(observations) // 3)  # Reasonable number of clusters
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            cluster_labels = kmeans.fit_predict(observations_scaled)
            
            # Analyze clusters
            cluster_counts = Counter(cluster_labels)
            
            for cluster_id, count in cluster_counts.items():
                if count >= self.min_pattern_frequency:
                    # Find decisions in this cluster
                    cluster_decisions = [
                        decisions[decision_indices[i]] 
                        for i, label in enumerate(cluster_labels) 
                        if label == cluster_id
                    ]
                    
                    examples = [d.decision_id for d in cluster_decisions[:5]]
                    
                    # Calculate cluster characteristics
                    cluster_center = kmeans.cluster_centers_[cluster_id]
                    cluster_actions = [d.action for d in cluster_decisions if d.action is not None]
                    
                    if cluster_actions:
                        avg_action = np.mean([a.flatten() for a in cluster_actions], axis=0)
                        action_std = np.std([a.flatten() for a in cluster_actions], axis=0)
                    else:
                        avg_action = np.array([])
                        action_std = np.array([])
                    
                    confidence = count / len(observations)
                    
                    pattern = BehaviorPattern(
                        pattern_id=f"obs_cluster_{self._pattern_counter}",
                        pattern_type="observation_cluster",
                        frequency=count,
                        confidence=confidence,
                        description=f"Similar observation states leading to consistent actions",
                        examples=examples,
                        characteristics={
                            "cluster_id": int(cluster_id),
                            "cluster_center": cluster_center.tolist(),
                            "average_action": avg_action.tolist(),
                            "action_std": action_std.tolist()
                        },
                        first_seen=min(d.timestamp for d in cluster_decisions),
                        last_seen=max(d.timestamp for d in cluster_decisions)
                    )
                    
                    patterns.append(pattern)
                    self._pattern_counter += 1
        
        except Exception as e:
            print(f"Warning: Error detecting observation cluster patterns: {e}")
        
        return patterns
    
    def _detect_temporal_patterns(self, decisions: List[DecisionRecord]) -> List[BehaviorPattern]:
        """Detect temporal patterns in decision making."""
        patterns = []
        
        try:
            if len(decisions) < 10:
                return patterns
            
            # Analyze decision timing patterns
            timestamps = [d.timestamp for d in decisions]
            time_diffs = np.diff(timestamps)
            
            # Detect regular intervals
            if len(time_diffs) > 5:
                # Look for consistent timing patterns
                mean_interval = np.mean(time_diffs)
                std_interval = np.std(time_diffs)
                
                # Check for regularity (low standard deviation relative to mean)
                if std_interval / mean_interval < 0.3:  # Coefficient of variation < 0.3
                    confidence = 1.0 - (std_interval / mean_interval)
                    
                    pattern = BehaviorPattern(
                        pattern_id=f"temporal_regular_{self._pattern_counter}",
                        pattern_type="temporal",
                        frequency=len(time_diffs),
                        confidence=confidence,
                        description=f"Regular decision timing with {mean_interval:.2f}s intervals",
                        examples=[d.decision_id for d in decisions[:5]],
                        characteristics={
                            "mean_interval": mean_interval,
                            "std_interval": std_interval,
                            "regularity_score": confidence
                        },
                        first_seen=timestamps[0],
                        last_seen=timestamps[-1]
                    )
                    
                    patterns.append(pattern)
                    self._pattern_counter += 1
            
            # Detect burst patterns (periods of rapid decisions)
            burst_threshold = np.percentile(time_diffs, 25)  # Bottom quartile
            burst_periods = []
            current_burst = []
            
            for i, diff in enumerate(time_diffs):
                if diff <= burst_threshold:
                    current_burst.append(i)
                else:
                    if len(current_burst) >= 3:  # Minimum burst length
                        burst_periods.append(current_burst)
                    current_burst = []
            
            if len(current_burst) >= 3:
                burst_periods.append(current_burst)
            
            if len(burst_periods) >= 2:  # Multiple burst periods detected
                total_burst_decisions = sum(len(burst) for burst in burst_periods)
                confidence = total_burst_decisions / len(decisions)
                
                examples = []
                for burst in burst_periods[:2]:  # First two bursts
                    examples.extend([decisions[i].decision_id for i in burst[:2]])
                
                pattern = BehaviorPattern(
                    pattern_id=f"temporal_burst_{self._pattern_counter}",
                    pattern_type="temporal",
                    frequency=len(burst_periods),
                    confidence=confidence,
                    description=f"Burst decision patterns with {len(burst_periods)} bursts",
                    examples=examples,
                    characteristics={
                        "burst_count": len(burst_periods),
                        "burst_threshold": burst_threshold,
                        "total_burst_decisions": total_burst_decisions
                    },
                    first_seen=timestamps[0],
                    last_seen=timestamps[-1]
                )
                
                patterns.append(pattern)
                self._pattern_counter += 1
        
        except Exception as e:
            print(f"Warning: Error detecting temporal patterns: {e}")
        
        return patterns
    
    def _detect_confidence_patterns(self, decisions: List[DecisionRecord]) -> List[BehaviorPattern]:
        """Detect patterns in confidence scores."""
        patterns = []
        
        try:
            # Extract confidence scores
            confidence_scores = []
            for decision in decisions:
                if decision.confidence_scores:
                    # Use primary confidence metric
                    if "action_confidence" in decision.confidence_scores:
                        confidence_scores.append(decision.confidence_scores["action_confidence"])
                    elif "max_probability" in decision.confidence_scores:
                        confidence_scores.append(decision.confidence_scores["max_probability"])
                    elif "certainty" in decision.confidence_scores:
                        confidence_scores.append(decision.confidence_scores["certainty"])
            
            if len(confidence_scores) < self.min_pattern_frequency:
                return patterns
            
            confidence_array = np.array(confidence_scores)
            
            # Detect consistently high confidence
            high_confidence_threshold = 0.8
            high_confidence_count = np.sum(confidence_array >= high_confidence_threshold)
            
            if high_confidence_count >= self.min_pattern_frequency:
                confidence = high_confidence_count / len(confidence_scores)
                
                high_conf_decisions = [
                    decisions[i].decision_id 
                    for i, score in enumerate(confidence_scores)
                    if score >= high_confidence_threshold
                ]
                
                pattern = BehaviorPattern(
                    pattern_id=f"high_confidence_{self._pattern_counter}",
                    pattern_type="confidence",
                    frequency=high_confidence_count,
                    confidence=confidence,
                    description=f"Consistently high confidence decisions (>{high_confidence_threshold})",
                    examples=high_conf_decisions[:5],
                    characteristics={
                        "threshold": high_confidence_threshold,
                        "mean_confidence": np.mean(confidence_array),
                        "confidence_std": np.std(confidence_array)
                    },
                    first_seen=decisions[0].timestamp,
                    last_seen=decisions[-1].timestamp
                )
                
                patterns.append(pattern)
                self._pattern_counter += 1
            
            # Detect confidence trends
            if len(confidence_scores) >= 10:
                # Simple linear trend detection
                x = np.arange(len(confidence_scores))
                correlation = np.corrcoef(x, confidence_array)[0, 1]
                
                if abs(correlation) > 0.5:  # Strong correlation
                    trend_type = "increasing" if correlation > 0 else "decreasing"
                    
                    pattern = BehaviorPattern(
                        pattern_id=f"confidence_trend_{self._pattern_counter}",
                        pattern_type="confidence",
                        frequency=len(confidence_scores),
                        confidence=abs(correlation),
                        description=f"{trend_type.capitalize()} confidence trend over time",
                        examples=[d.decision_id for d in decisions[:5]],
                        characteristics={
                            "trend_type": trend_type,
                            "correlation": correlation,
                            "start_confidence": confidence_scores[0],
                            "end_confidence": confidence_scores[-1]
                        },
                        first_seen=decisions[0].timestamp,
                        last_seen=decisions[-1].timestamp
                    )
                    
                    patterns.append(pattern)
                    self._pattern_counter += 1
        
        except Exception as e:
            print(f"Warning: Error detecting confidence patterns: {e}")
        
        return patterns
    
    def _detect_reward_response_patterns(self, decisions: List[DecisionRecord]) -> List[BehaviorPattern]:
        """Detect patterns in response to rewards."""
        patterns = []
        
        try:
            # Extract decisions with reward information
            reward_decisions = [d for d in decisions if d.reward is not None]
            
            if len(reward_decisions) < self.min_pattern_frequency:
                return patterns
            
            # Analyze reward-action relationships
            rewards = [d.reward for d in reward_decisions]
            
            # Detect response to positive rewards
            positive_rewards = [d for d in reward_decisions if d.reward > 0]
            if len(positive_rewards) >= self.min_pattern_frequency:
                # Analyze actions following positive rewards
                pos_actions = [self._discretize_action(d.action) for d in positive_rewards if d.action is not None]
                
                if pos_actions:
                    action_counts = Counter(pos_actions)
                    most_common_action, count = action_counts.most_common(1)[0]
                    
                    if count >= self.min_pattern_frequency:
                        confidence = count / len(pos_actions)
                        
                        pattern = BehaviorPattern(
                            pattern_id=f"reward_response_{self._pattern_counter}",
                            pattern_type="reward_response",
                            frequency=count,
                            confidence=confidence,
                            description=f"Consistent action following positive rewards",
                            examples=[d.decision_id for d in positive_rewards[:5]],
                            characteristics={
                                "reward_type": "positive",
                                "common_action": most_common_action,
                                "action_frequency": count,
                                "total_positive_rewards": len(positive_rewards)
                            },
                            first_seen=positive_rewards[0].timestamp,
                            last_seen=positive_rewards[-1].timestamp
                        )
                        
                        patterns.append(pattern)
                        self._pattern_counter += 1
        
        except Exception as e:
            print(f"Warning: Error detecting reward response patterns: {e}")
        
        return patterns
    
    def _discretize_action(self, action: np.ndarray, bins: int = 5) -> str:
        """
        Discretize continuous actions for pattern detection.
        
        Args:
            action: Continuous action array
            bins: Number of discretization bins
            
        Returns:
            String representation of discretized action
        """
        if len(action) == 0:
            return "empty"
        
        # Normalize action to [0, 1] range (assuming actions are bounded)
        normalized = (action + 1) / 2  # Assuming actions in [-1, 1]
        normalized = np.clip(normalized, 0, 1)
        
        # Discretize each dimension
        discretized = []
        for val in normalized:
            bin_idx = min(int(val * bins), bins - 1)
            discretized.append(str(bin_idx))
        
        return "_".join(discretized)
    
    def clear_patterns(self) -> None:
        """Clear all detected patterns."""
        with self._lock:
            self._detected_patterns.clear()
            self._pattern_counter = 0
            self._last_analysis_time = 0
        
        print("Pattern analysis cache cleared")