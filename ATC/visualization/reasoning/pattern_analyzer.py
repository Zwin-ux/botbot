"""
Performance pattern detection for identifying recurring AI behaviors.

This module provides statistical analysis for performance trends, anomaly detection,
and comparative analysis across different training runs.
"""

import time
import math
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional, Tuple, Set
from enum import Enum
import numpy as np
import threading
from collections import defaultdict, deque
from scipy import stats
from scipy.signal import find_peaks

from ..events import EventBus, get_event_bus
from ..events.event_data import EventData, EventType
from ..decision.decision_tracker import DecisionTracker, DecisionRecord, get_decision_tracker


class PatternType(str, Enum):
    """Types of behavioral patterns."""
    
    OSCILLATION = "oscillation"
    CONVERGENCE = "convergence"
    DIVERGENCE = "divergence"
    PERIODIC = "periodic"
    ANOMALY = "anomaly"
    REGRESSION = "regression"
    IMPROVEMENT = "improvement"
    STABILITY = "stability"


class PatternSeverity(str, Enum):
    """Severity levels for detected patterns."""
    
    BENIGN = "benign"
    NOTABLE = "notable"
    CONCERNING = "concerning"
    CRITICAL = "critical"


@dataclass
class BehaviorPattern:
    """Detected behavioral pattern with analysis."""
    
    # Pattern identification
    pattern_id: str
    timestamp: float
    pattern_type: PatternType
    severity: PatternSeverity
    
    # Pattern characteristics
    duration_seconds: float
    
    # Statistical measures
    confidence_score: float  # 0-1 scale
    statistical_significance: float  # p-value
    effect_size: float  # Cohen's d or similar
    
    # Context information
    affected_metrics: List[str]
    episode_range: Tuple[int, int]
    decision_count: int
    
    # Analysis details
    description: str
    recommendations: List[str]
    
    # Optional pattern characteristics
    frequency: Optional[float] = None  # For periodic patterns
    amplitude: Optional[float] = None  # For oscillations
    trend_slope: Optional[float] = None  # For trends
    related_patterns: Optional[List[str]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return asdict(self)


@dataclass
class PerformanceMetrics:
    """Performance metrics for a time period or episode range."""
    
    # Time/episode range
    start_time: float
    end_time: float
    episode_start: int
    episode_end: int
    
    # Reward metrics
    mean_reward: float
    reward_std: float
    reward_trend: float  # Linear trend slope
    
    # Decision quality metrics
    mean_confidence: float
    confidence_std: float
    decision_consistency: float  # 0-1 scale
    
    # Safety metrics
    safety_violations: int
    mean_separation: float
    
    # Efficiency metrics
    action_magnitude_mean: float
    action_changes_per_episode: float
    
    # Learning indicators
    value_estimate_accuracy: float
    policy_entropy: float


class PatternAnalyzer:
    """
    Analyzes AI controller performance patterns and behavioral trends.
    
    This class detects recurring behaviors, performance anomalies, and provides
    statistical analysis of training progress and controller effectiveness.
    """
    
    def __init__(self, decision_tracker: Optional[DecisionTracker] = None,
                 event_bus: Optional[EventBus] = None,
                 analysis_window_episodes: int = 100):
        """
        Initialize the pattern analyzer.
        
        Args:
            decision_tracker: Decision tracker instance (uses global if None)
            event_bus: Event bus instance (uses global if None)
            analysis_window_episodes: Number of episodes for pattern analysis
        """
        self.decision_tracker = decision_tracker or get_decision_tracker()
        self.event_bus = event_bus or get_event_bus()
        self.analysis_window_episodes = analysis_window_episodes
        
        # Pattern storage
        self._patterns: deque = deque(maxlen=500)  # Keep last 500 patterns
        self._pattern_count = 0
        self._lock = threading.RLock()
        
        # Performance history
        self._performance_history: deque = deque(maxlen=1000)  # Episode metrics
        self._training_runs: Dict[str, List[PerformanceMetrics]] = {}
        
        # Analysis configuration
        self.min_pattern_duration = 30.0  # seconds
        self.oscillation_threshold = 0.3  # Relative amplitude
        self.anomaly_threshold = 2.5  # Standard deviations
        self.trend_significance_threshold = 0.05  # p-value
        
        # Subscribe to training events
        self._iteration_subscription = self.event_bus.subscribe(
            EventType.TRAINING_ITERATION,
            self._handle_training_iteration_event
        )
        
        self._episode_subscription = self.event_bus.subscribe(
            EventType.TRAINING_EPISODE_END,
            self._handle_episode_end_event
        )
        
        print(f"PatternAnalyzer initialized with window={analysis_window_episodes} episodes")
    
    def analyze_recent_performance(self, episodes: int = None) -> List[BehaviorPattern]:
        """
        Analyze recent performance for behavioral patterns.
        
        Args:
            episodes: Number of recent episodes to analyze (uses window if None)
            
        Returns:
            List of detected behavioral patterns
        """
        if episodes is None:
            episodes = self.analysis_window_episodes
        
        # Get recent performance metrics
        recent_metrics = list(self._performance_history)[-episodes:]
        
        if len(recent_metrics) < 10:  # Need minimum data for analysis
            return []
        
        detected_patterns = []
        
        # Analyze reward trends
        reward_patterns = self._analyze_reward_patterns(recent_metrics)
        detected_patterns.extend(reward_patterns)
        
        # Analyze decision quality patterns
        decision_patterns = self._analyze_decision_patterns(recent_metrics)
        detected_patterns.extend(decision_patterns)
        
        # Analyze safety patterns
        safety_patterns = self._analyze_safety_patterns(recent_metrics)
        detected_patterns.extend(safety_patterns)
        
        # Analyze learning patterns
        learning_patterns = self._analyze_learning_patterns(recent_metrics)
        detected_patterns.extend(learning_patterns)
        
        # Store detected patterns
        with self._lock:
            for pattern in detected_patterns:
                self._patterns.append(pattern)
                self._pattern_count += 1
        
        return detected_patterns
    
    def detect_anomalies(self, metric_name: str, lookback_episodes: int = 50) -> List[BehaviorPattern]:
        """
        Detect anomalies in a specific performance metric.
        
        Args:
            metric_name: Name of the metric to analyze
            lookback_episodes: Number of episodes to look back for baseline
            
        Returns:
            List of detected anomaly patterns
        """
        recent_metrics = list(self._performance_history)[-lookback_episodes:]
        
        if len(recent_metrics) < 20:
            return []
        
        # Extract metric values
        values = []
        for metrics in recent_metrics:
            if hasattr(metrics, metric_name):
                values.append(getattr(metrics, metric_name))
        
        if not values:
            return []
        
        values = np.array(values)
        
        # Calculate baseline statistics
        baseline_mean = np.mean(values[:-10])  # Exclude recent values from baseline
        baseline_std = np.std(values[:-10])
        
        if baseline_std == 0:
            return []
        
        # Detect anomalies in recent values
        recent_values = values[-10:]
        z_scores = np.abs((recent_values - baseline_mean) / baseline_std)
        
        anomalies = []
        for i, z_score in enumerate(z_scores):
            if z_score > self.anomaly_threshold:
                anomaly_pattern = BehaviorPattern(
                    pattern_id=f"anomaly_{self._pattern_count}_{int(time.time() * 1000)}",
                    timestamp=time.time(),
                    pattern_type=PatternType.ANOMALY,
                    severity=self._classify_anomaly_severity(z_score),
                    duration_seconds=0.0,  # Point anomaly
                    confidence_score=min(z_score / 5.0, 1.0),
                    statistical_significance=stats.norm.sf(z_score) * 2,  # Two-tailed
                    effect_size=z_score,
                    affected_metrics=[metric_name],
                    episode_range=(len(recent_metrics) - 10 + i, len(recent_metrics) - 10 + i),
                    decision_count=1,
                    description=f"Anomalous {metric_name} value: {recent_values[i]:.3f} "
                               f"(z-score: {z_score:.2f})",
                    recommendations=[
                        f"Investigate cause of anomalous {metric_name} value",
                        "Check for environmental changes or training instabilities",
                        "Consider adjusting learning rate or other hyperparameters"
                    ]
                )
                anomalies.append(anomaly_pattern)
                self._pattern_count += 1
        
        return anomalies
    
    def compare_training_runs(self, run_id1: str, run_id2: str) -> Dict[str, Any]:
        """
        Compare performance between two training runs.
        
        Args:
            run_id1: First training run identifier
            run_id2: Second training run identifier
            
        Returns:
            Comparison analysis results
        """
        if run_id1 not in self._training_runs or run_id2 not in self._training_runs:
            return {"error": "One or both training runs not found"}
        
        run1_metrics = self._training_runs[run_id1]
        run2_metrics = self._training_runs[run_id2]
        
        if not run1_metrics or not run2_metrics:
            return {"error": "Insufficient data for comparison"}
        
        comparison = {}
        
        # Compare reward performance
        run1_rewards = [m.mean_reward for m in run1_metrics]
        run2_rewards = [m.mean_reward for m in run2_metrics]
        
        comparison["reward_comparison"] = {
            "run1_mean": np.mean(run1_rewards),
            "run2_mean": np.mean(run2_rewards),
            "improvement": np.mean(run2_rewards) - np.mean(run1_rewards),
            "statistical_test": stats.ttest_ind(run1_rewards, run2_rewards)._asdict()
        }
        
        # Compare safety performance
        run1_violations = [m.safety_violations for m in run1_metrics]
        run2_violations = [m.safety_violations for m in run2_metrics]
        
        comparison["safety_comparison"] = {
            "run1_violations": np.sum(run1_violations),
            "run2_violations": np.sum(run2_violations),
            "violation_reduction": np.sum(run1_violations) - np.sum(run2_violations),
            "violation_rate_change": (np.mean(run2_violations) - np.mean(run1_violations)) / max(np.mean(run1_violations), 0.001)
        }
        
        # Compare learning efficiency
        run1_consistency = [m.decision_consistency for m in run1_metrics]
        run2_consistency = [m.decision_consistency for m in run2_metrics]
        
        comparison["consistency_comparison"] = {
            "run1_consistency": np.mean(run1_consistency),
            "run2_consistency": np.mean(run2_consistency),
            "consistency_improvement": np.mean(run2_consistency) - np.mean(run1_consistency)
        }
        
        # Overall assessment
        improvements = 0
        if comparison["reward_comparison"]["improvement"] > 0:
            improvements += 1
        if comparison["safety_comparison"]["violation_reduction"] > 0:
            improvements += 1
        if comparison["consistency_comparison"]["consistency_improvement"] > 0:
            improvements += 1
        
        comparison["overall_assessment"] = {
            "improvements": improvements,
            "total_metrics": 3,
            "improvement_ratio": improvements / 3,
            "recommendation": self._generate_comparison_recommendation(comparison)
        }
        
        return comparison
    
    def get_performance_trends(self, episodes: int = None) -> Dict[str, Any]:
        """
        Get performance trends over recent episodes.
        
        Args:
            episodes: Number of episodes to analyze (uses window if None)
            
        Returns:
            Dictionary of performance trends
        """
        if episodes is None:
            episodes = self.analysis_window_episodes
        
        recent_metrics = list(self._performance_history)[-episodes:]
        
        if len(recent_metrics) < 10:
            return {"error": "Insufficient data for trend analysis"}
        
        trends = {}
        
        # Reward trend
        rewards = [m.mean_reward for m in recent_metrics]
        reward_slope, reward_intercept, reward_r, reward_p, _ = stats.linregress(
            range(len(rewards)), rewards
        )
        
        trends["reward_trend"] = {
            "slope": reward_slope,
            "r_squared": reward_r ** 2,
            "p_value": reward_p,
            "direction": "improving" if reward_slope > 0 else "declining",
            "significance": "significant" if reward_p < 0.05 else "not_significant"
        }
        
        # Safety trend
        violations = [m.safety_violations for m in recent_metrics]
        if any(v > 0 for v in violations):
            safety_slope, _, safety_r, safety_p, _ = stats.linregress(
                range(len(violations)), violations
            )
            
            trends["safety_trend"] = {
                "slope": safety_slope,
                "r_squared": safety_r ** 2,
                "p_value": safety_p,
                "direction": "improving" if safety_slope < 0 else "declining",
                "significance": "significant" if safety_p < 0.05 else "not_significant"
            }
        
        # Consistency trend
        consistency = [m.decision_consistency for m in recent_metrics]
        consistency_slope, _, consistency_r, consistency_p, _ = stats.linregress(
            range(len(consistency)), consistency
        )
        
        trends["consistency_trend"] = {
            "slope": consistency_slope,
            "r_squared": consistency_r ** 2,
            "p_value": consistency_p,
            "direction": "improving" if consistency_slope > 0 else "declining",
            "significance": "significant" if consistency_p < 0.05 else "not_significant"
        }
        
        return trends
    
    def get_pattern_summary(self) -> Dict[str, Any]:
        """Get summary of all detected patterns."""
        with self._lock:
            patterns = list(self._patterns)
        
        if not patterns:
            return {"total_patterns": 0, "patterns_by_type": {}, "recent_patterns": []}
        
        # Count patterns by type
        patterns_by_type = defaultdict(int)
        patterns_by_severity = defaultdict(int)
        
        for pattern in patterns:
            patterns_by_type[pattern.pattern_type.value] += 1
            patterns_by_severity[pattern.severity.value] += 1
        
        # Get recent patterns (last 24 hours)
        recent_cutoff = time.time() - 86400  # 24 hours
        recent_patterns = [
            p for p in patterns
            if p.timestamp >= recent_cutoff
        ]
        
        return {
            "total_patterns": len(patterns),
            "patterns_by_type": dict(patterns_by_type),
            "patterns_by_severity": dict(patterns_by_severity),
            "recent_patterns": len(recent_patterns),
            "recent_pattern_details": [p.to_dict() for p in recent_patterns[-10:]]
        }
    
    def _analyze_reward_patterns(self, metrics: List[PerformanceMetrics]) -> List[BehaviorPattern]:
        """Analyze reward-related behavioral patterns."""
        patterns = []
        
        rewards = [m.mean_reward for m in metrics]
        
        if len(rewards) < 10:
            return patterns
        
        # Check for oscillations
        oscillation_pattern = self._detect_oscillation(rewards, "reward")
        if oscillation_pattern:
            patterns.append(oscillation_pattern)
        
        # Check for convergence/divergence
        trend_pattern = self._detect_trend(rewards, "reward")
        if trend_pattern:
            patterns.append(trend_pattern)
        
        # Check for stability
        stability_pattern = self._detect_stability(rewards, "reward")
        if stability_pattern:
            patterns.append(stability_pattern)
        
        return patterns
    
    def _analyze_decision_patterns(self, metrics: List[PerformanceMetrics]) -> List[BehaviorPattern]:
        """Analyze decision quality patterns."""
        patterns = []
        
        confidence_values = [m.mean_confidence for m in metrics]
        consistency_values = [m.decision_consistency for m in metrics]
        
        # Analyze confidence patterns
        if len(confidence_values) >= 10:
            confidence_trend = self._detect_trend(confidence_values, "confidence")
            if confidence_trend:
                patterns.append(confidence_trend)
        
        # Analyze consistency patterns
        if len(consistency_values) >= 10:
            consistency_trend = self._detect_trend(consistency_values, "consistency")
            if consistency_trend:
                patterns.append(consistency_trend)
        
        return patterns
    
    def _analyze_safety_patterns(self, metrics: List[PerformanceMetrics]) -> List[BehaviorPattern]:
        """Analyze safety-related patterns."""
        patterns = []
        
        violations = [m.safety_violations for m in metrics]
        separations = [m.mean_separation for m in metrics]
        
        # Check for violation trends
        if any(v > 0 for v in violations):
            violation_trend = self._detect_trend(violations, "safety_violations")
            if violation_trend:
                patterns.append(violation_trend)
        
        # Check for separation patterns
        if len(separations) >= 10:
            separation_trend = self._detect_trend(separations, "separation")
            if separation_trend:
                patterns.append(separation_trend)
        
        return patterns
    
    def _analyze_learning_patterns(self, metrics: List[PerformanceMetrics]) -> List[BehaviorPattern]:
        """Analyze learning-related patterns."""
        patterns = []
        
        entropy_values = [m.policy_entropy for m in metrics]
        accuracy_values = [m.value_estimate_accuracy for m in metrics]
        
        # Analyze policy entropy (exploration vs exploitation)
        if len(entropy_values) >= 10:
            entropy_trend = self._detect_trend(entropy_values, "policy_entropy")
            if entropy_trend:
                patterns.append(entropy_trend)
        
        # Analyze value estimate accuracy
        if len(accuracy_values) >= 10:
            accuracy_trend = self._detect_trend(accuracy_values, "value_accuracy")
            if accuracy_trend:
                patterns.append(accuracy_trend)
        
        return patterns
    
    def _detect_oscillation(self, values: List[float], metric_name: str) -> Optional[BehaviorPattern]:
        """Detect oscillatory patterns in a metric."""
        if len(values) < 20:
            return None
        
        values_array = np.array(values)
        
        # Detrend the data
        detrended = stats.detrend(values_array)
        
        # Find peaks and troughs
        peaks, _ = find_peaks(detrended, height=np.std(detrended) * 0.5)
        troughs, _ = find_peaks(-detrended, height=np.std(detrended) * 0.5)
        
        if len(peaks) < 3 or len(troughs) < 3:
            return None
        
        # Calculate oscillation characteristics
        peak_intervals = np.diff(peaks)
        trough_intervals = np.diff(troughs)
        
        if len(peak_intervals) > 0 and len(trough_intervals) > 0:
            avg_period = np.mean(np.concatenate([peak_intervals, trough_intervals]))
            amplitude = np.std(detrended)
            relative_amplitude = amplitude / (np.mean(np.abs(values_array)) + 1e-6)
            
            if relative_amplitude > self.oscillation_threshold:
                return BehaviorPattern(
                    pattern_id=f"oscillation_{self._pattern_count}_{int(time.time() * 1000)}",
                    timestamp=time.time(),
                    pattern_type=PatternType.OSCILLATION,
                    severity=self._classify_oscillation_severity(relative_amplitude),
                    duration_seconds=len(values) * 30.0,  # Assume 30s per episode
                    frequency=1.0 / avg_period if avg_period > 0 else 0.0,
                    amplitude=amplitude,
                    confidence_score=min(relative_amplitude * 2, 1.0),
                    statistical_significance=0.05,  # Placeholder
                    effect_size=relative_amplitude,
                    affected_metrics=[metric_name],
                    episode_range=(0, len(values)),
                    decision_count=len(values),
                    description=f"Oscillatory behavior detected in {metric_name} "
                               f"(amplitude: {amplitude:.3f}, period: {avg_period:.1f})",
                    recommendations=[
                        "Consider adjusting learning rate to reduce oscillations",
                        "Check for conflicting objectives in reward function",
                        "Implement experience replay buffer smoothing"
                    ]
                )
        
        return None
    
    def _detect_trend(self, values: List[float], metric_name: str) -> Optional[BehaviorPattern]:
        """Detect trend patterns in a metric."""
        if len(values) < 10:
            return None
        
        slope, intercept, r_value, p_value, std_err = stats.linregress(
            range(len(values)), values
        )
        
        if p_value > self.trend_significance_threshold:
            return None  # Not statistically significant
        
        # Determine pattern type and severity
        if abs(slope) < std_err * 2:
            pattern_type = PatternType.STABILITY
            severity = PatternSeverity.BENIGN
        elif slope > 0:
            pattern_type = PatternType.IMPROVEMENT if "reward" in metric_name or "consistency" in metric_name else PatternType.CONVERGENCE
            severity = self._classify_trend_severity(abs(slope), std_err)
        else:
            pattern_type = PatternType.REGRESSION if "reward" in metric_name or "consistency" in metric_name else PatternType.DIVERGENCE
            severity = self._classify_trend_severity(abs(slope), std_err)
        
        return BehaviorPattern(
            pattern_id=f"trend_{self._pattern_count}_{int(time.time() * 1000)}",
            timestamp=time.time(),
            pattern_type=pattern_type,
            severity=severity,
            duration_seconds=len(values) * 30.0,  # Assume 30s per episode
            trend_slope=slope,
            confidence_score=abs(r_value),
            statistical_significance=p_value,
            effect_size=abs(slope) / std_err if std_err > 0 else 0.0,
            affected_metrics=[metric_name],
            episode_range=(0, len(values)),
            decision_count=len(values),
            description=f"{'Improving' if slope > 0 else 'Declining'} trend in {metric_name} "
                       f"(slope: {slope:.4f}, R²: {r_value**2:.3f})",
            recommendations=self._generate_trend_recommendations(metric_name, slope, pattern_type)
        )
    
    def _detect_stability(self, values: List[float], metric_name: str) -> Optional[BehaviorPattern]:
        """Detect stability patterns in a metric."""
        if len(values) < 20:
            return None
        
        # Check for low variance relative to mean
        mean_val = np.mean(values)
        std_val = np.std(values)
        
        if mean_val == 0:
            return None
        
        coefficient_of_variation = std_val / abs(mean_val)
        
        if coefficient_of_variation < 0.1:  # Low variability
            return BehaviorPattern(
                pattern_id=f"stability_{self._pattern_count}_{int(time.time() * 1000)}",
                timestamp=time.time(),
                pattern_type=PatternType.STABILITY,
                severity=PatternSeverity.BENIGN,
                duration_seconds=len(values) * 30.0,
                confidence_score=1.0 - coefficient_of_variation,
                statistical_significance=0.01,  # High confidence in stability
                effect_size=coefficient_of_variation,
                affected_metrics=[metric_name],
                episode_range=(0, len(values)),
                decision_count=len(values),
                description=f"Stable {metric_name} performance "
                           f"(CV: {coefficient_of_variation:.3f})",
                recommendations=[
                    f"Stable {metric_name} indicates good convergence",
                    "Consider increasing exploration to find better solutions",
                    "Monitor for potential local optima"
                ]
            )
        
        return None
    
    def _classify_anomaly_severity(self, z_score: float) -> PatternSeverity:
        """Classify anomaly severity based on z-score."""
        if z_score > 4.0:
            return PatternSeverity.CRITICAL
        elif z_score > 3.0:
            return PatternSeverity.CONCERNING
        elif z_score > 2.5:
            return PatternSeverity.NOTABLE
        else:
            return PatternSeverity.BENIGN
    
    def _classify_oscillation_severity(self, relative_amplitude: float) -> PatternSeverity:
        """Classify oscillation severity based on relative amplitude."""
        if relative_amplitude > 0.8:
            return PatternSeverity.CRITICAL
        elif relative_amplitude > 0.5:
            return PatternSeverity.CONCERNING
        elif relative_amplitude > 0.3:
            return PatternSeverity.NOTABLE
        else:
            return PatternSeverity.BENIGN
    
    def _classify_trend_severity(self, slope_magnitude: float, std_err: float) -> PatternSeverity:
        """Classify trend severity based on slope magnitude and standard error."""
        effect_size = slope_magnitude / max(std_err, 1e-6)
        
        if effect_size > 5.0:
            return PatternSeverity.CRITICAL
        elif effect_size > 3.0:
            return PatternSeverity.CONCERNING
        elif effect_size > 2.0:
            return PatternSeverity.NOTABLE
        else:
            return PatternSeverity.BENIGN
    
    def _generate_trend_recommendations(self, metric_name: str, slope: float, 
                                      pattern_type: PatternType) -> List[str]:
        """Generate recommendations based on trend analysis."""
        recommendations = []
        
        if pattern_type == PatternType.IMPROVEMENT:
            recommendations.extend([
                f"Positive trend in {metric_name} - continue current approach",
                "Monitor for potential plateauing",
                "Consider gradual hyperparameter adjustments to maintain progress"
            ])
        elif pattern_type == PatternType.REGRESSION:
            recommendations.extend([
                f"Declining {metric_name} - investigate potential causes",
                "Check for overfitting or catastrophic forgetting",
                "Consider reducing learning rate or adding regularization"
            ])
        elif pattern_type == PatternType.CONVERGENCE:
            recommendations.extend([
                f"Converging {metric_name} - good learning progress",
                "Monitor for convergence to local optima",
                "Consider curriculum learning for continued improvement"
            ])
        elif pattern_type == PatternType.DIVERGENCE:
            recommendations.extend([
                f"Diverging {metric_name} - potential instability",
                "Reduce learning rate or adjust network architecture",
                "Check for gradient explosion or vanishing gradients"
            ])
        
        return recommendations
    
    def _generate_comparison_recommendation(self, comparison: Dict[str, Any]) -> str:
        """Generate recommendation based on training run comparison."""
        improvement_ratio = comparison["overall_assessment"]["improvement_ratio"]
        
        if improvement_ratio >= 0.67:
            return "Second run shows significant improvement - adopt its configuration"
        elif improvement_ratio >= 0.33:
            return "Mixed results - analyze specific improvements and combine best practices"
        else:
            return "First run performed better - investigate what changed in second run"
    
    def _handle_training_iteration_event(self, event: EventData) -> None:
        """Handle training iteration events."""
        try:
            data = event.data
            
            # Create performance metrics from iteration data
            metrics = PerformanceMetrics(
                start_time=event.timestamp - 30.0,  # Approximate episode duration
                end_time=event.timestamp,
                episode_start=data.get("iteration", 0),
                episode_end=data.get("iteration", 0),
                mean_reward=data.get("episode_reward_mean", 0.0),
                reward_std=data.get("episode_reward_std", 0.0),
                reward_trend=0.0,  # Will be calculated in trend analysis
                mean_confidence=data.get("mean_confidence", 0.5),
                confidence_std=data.get("confidence_std", 0.0),
                decision_consistency=data.get("decision_consistency", 0.5),
                safety_violations=data.get("safety_violations", 0),
                mean_separation=data.get("mean_separation", 10.0),
                action_magnitude_mean=data.get("action_magnitude_mean", 0.0),
                action_changes_per_episode=data.get("action_changes_per_episode", 0.0),
                value_estimate_accuracy=data.get("value_estimate_accuracy", 0.5),
                policy_entropy=data.get("policy_entropy", 1.0)
            )
            
            # Store performance metrics
            self._performance_history.append(metrics)
            
            # Trigger pattern analysis every 10 iterations
            if data.get("iteration", 0) % 10 == 0:
                self.analyze_recent_performance(episodes=20)
            
        except Exception as e:
            print(f"Warning: Error handling training iteration event: {e}")
    
    def _handle_episode_end_event(self, event: EventData) -> None:
        """Handle episode end events."""
        # This could be used for more detailed episode-level analysis
        pass
    
    def shutdown(self) -> None:
        """Shutdown the pattern analyzer and cleanup resources."""
        if self._iteration_subscription:
            self.event_bus.unsubscribe(self._iteration_subscription)
            self._iteration_subscription = None
        
        if self._episode_subscription:
            self.event_bus.unsubscribe(self._episode_subscription)
            self._episode_subscription = None
        
        print("PatternAnalyzer shutdown complete")


# Global pattern analyzer instance
_global_pattern_analyzer: Optional[PatternAnalyzer] = None


def get_pattern_analyzer() -> PatternAnalyzer:
    """Get the global pattern analyzer instance."""
    global _global_pattern_analyzer
    if _global_pattern_analyzer is None:
        _global_pattern_analyzer = PatternAnalyzer()
    return _global_pattern_analyzer


def set_pattern_analyzer(analyzer: PatternAnalyzer) -> None:
    """Set the global pattern analyzer instance."""
    global _global_pattern_analyzer
    if _global_pattern_analyzer is not None:
        _global_pattern_analyzer.shutdown()
    _global_pattern_analyzer = analyzer


def shutdown_pattern_analyzer() -> None:
    """Shutdown the global pattern analyzer."""
    global _global_pattern_analyzer
    if _global_pattern_analyzer is not None:
        _global_pattern_analyzer.shutdown()
        _global_pattern_analyzer = None