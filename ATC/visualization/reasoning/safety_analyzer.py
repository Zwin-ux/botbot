"""
Safety violation analysis with root cause identification.

This module provides automated analysis of safety violations including loss of
separation events, root cause analysis using decision history, and safety metrics.
"""

import time
import math
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional, Tuple, Set
from enum import Enum
import numpy as np
import threading
from collections import defaultdict, deque

from ..events import EventBus, get_event_bus
from ..events.event_data import EventData, EventType, SafetyViolationEvent
from ..decision.decision_tracker import DecisionTracker, DecisionRecord, get_decision_tracker


class ViolationType(str, Enum):
    """Types of safety violations."""
    
    LOSS_OF_SEPARATION = "loss_of_separation"
    NEAR_MISS = "near_miss"
    ALTITUDE_DEVIATION = "altitude_deviation"
    SECTOR_BOUNDARY_VIOLATION = "sector_boundary_violation"


class ViolationSeverity(str, Enum):
    """Severity levels for safety violations."""
    
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class SafetyViolation:
    """Record of a safety violation with context and analysis."""
    
    # Basic violation information
    violation_id: str
    timestamp: float
    violation_type: ViolationType
    severity: ViolationSeverity
    
    # Aircraft involved
    aircraft_involved: List[str]
    separation_distance: float  # NM
    minimum_separation: float  # NM
    altitude_separation: float  # feet
    
    # Analysis metrics
    time_to_violation: float = 0.0  # seconds from first warning
    preventability_score: float = 0.0  # 0-1 scale
    controller_response_time: float = 0.0  # seconds
    
    # Context information
    episode_id: Optional[str] = None
    step_number: Optional[int] = None
    
    # Root cause analysis (populated by analyzer)
    contributing_decisions: Optional[List[str]] = None  # Decision IDs
    root_causes: Optional[List[str]] = None
    environmental_factors: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return asdict(self)


@dataclass
class SafetyMetrics:
    """Safety performance metrics for a time period."""
    
    # Time period
    start_time: float
    end_time: float
    duration_hours: float
    
    # Violation counts
    total_violations: int
    violations_by_type: Dict[str, int]
    violations_by_severity: Dict[str, int]
    
    # Separation metrics
    minimum_separation_achieved: float  # NM
    average_separation: float  # NM
    separation_violations: int
    near_misses: int
    
    # Performance indicators
    safety_score: float  # 0-100 scale
    violation_rate_per_hour: float
    mean_time_between_violations: float  # hours
    
    # Trend analysis
    violation_trend: str  # "improving", "stable", "degrading"
    trend_confidence: float  # 0-1 scale


class SafetyAnalyzer:
    """
    Analyzes safety violations and provides root cause identification.
    
    This class monitors safety events, analyzes violations using decision history,
    calculates safety metrics, and provides trend analysis.
    """
    
    def __init__(self, decision_tracker: Optional[DecisionTracker] = None,
                 event_bus: Optional[EventBus] = None,
                 analysis_window_hours: float = 24.0):
        """
        Initialize the safety analyzer.
        
        Args:
            decision_tracker: Decision tracker instance (uses global if None)
            event_bus: Event bus instance (uses global if None)
            analysis_window_hours: Time window for trend analysis
        """
        self.decision_tracker = decision_tracker or get_decision_tracker()
        self.event_bus = event_bus or get_event_bus()
        self.analysis_window_hours = analysis_window_hours
        
        # Violation storage
        self._violations: deque = deque(maxlen=1000)  # Keep last 1000 violations
        self._violation_count = 0
        self._lock = threading.RLock()
        
        # Safety thresholds
        self.minimum_separation_nm = 5.0
        self.near_miss_threshold_nm = 3.0
        self.critical_separation_nm = 1.0
        self.vertical_separation_ft = 1000.0
        
        # Analysis configuration
        self.lookback_seconds = 300.0  # Look back 5 minutes for root cause analysis
        self.decision_correlation_threshold = 0.7
        
        # Subscribe to safety violation events
        self._subscription_id = self.event_bus.subscribe(
            EventType.SAFETY_VIOLATION,
            self._handle_safety_violation_event
        )
        
        print(f"SafetyAnalyzer initialized with analysis_window={analysis_window_hours}h")
    
    def analyze_violation(self, violation: SafetyViolation) -> SafetyViolation:
        """
        Perform detailed analysis of a safety violation.
        
        Args:
            violation: Safety violation to analyze
            
        Returns:
            Updated violation with root cause analysis
        """
        # Get relevant decision history
        relevant_decisions = self._get_relevant_decisions(violation)
        
        # Perform root cause analysis
        root_causes = self._identify_root_causes(violation, relevant_decisions)
        
        # Calculate preventability score
        preventability = self._calculate_preventability(violation, relevant_decisions)
        
        # Analyze controller response
        response_time = self._analyze_controller_response(violation, relevant_decisions)
        
        # Update violation with analysis results
        violation.contributing_decisions = [d.decision_id for d in relevant_decisions]
        violation.root_causes = root_causes
        violation.preventability_score = preventability
        violation.controller_response_time = response_time
        violation.environmental_factors = self._analyze_environmental_factors(violation)
        
        return violation
    
    def calculate_safety_metrics(self, start_time: Optional[float] = None,
                               end_time: Optional[float] = None) -> SafetyMetrics:
        """
        Calculate safety metrics for a time period.
        
        Args:
            start_time: Start timestamp (defaults to analysis window ago)
            end_time: End timestamp (defaults to now)
            
        Returns:
            Safety metrics for the specified period
        """
        if end_time is None:
            end_time = time.time()
        if start_time is None:
            start_time = end_time - (self.analysis_window_hours * 3600)
        
        duration_hours = (end_time - start_time) / 3600.0
        
        # Filter violations to time period
        period_violations = [
            v for v in self._violations
            if start_time <= v.timestamp <= end_time
        ]
        
        # Count violations by type and severity
        violations_by_type = defaultdict(int)
        violations_by_severity = defaultdict(int)
        
        separation_distances = []
        separation_violations = 0
        near_misses = 0
        
        for violation in period_violations:
            violations_by_type[violation.violation_type.value] += 1
            violations_by_severity[violation.severity.value] += 1
            
            if violation.violation_type == ViolationType.LOSS_OF_SEPARATION:
                separation_violations += 1
                separation_distances.append(violation.separation_distance)
                
                if violation.separation_distance <= self.near_miss_threshold_nm:
                    near_misses += 1
        
        # Calculate separation metrics
        min_separation = min(separation_distances) if separation_distances else float('inf')
        avg_separation = np.mean(separation_distances) if separation_distances else float('inf')
        
        # Calculate safety score (0-100 scale)
        safety_score = self._calculate_safety_score(period_violations, duration_hours)
        
        # Calculate violation rate
        violation_rate = len(period_violations) / max(duration_hours, 0.001)
        
        # Calculate mean time between violations
        if len(period_violations) > 1:
            violation_times = [v.timestamp for v in period_violations]
            time_diffs = np.diff(sorted(violation_times))
            mean_time_between = np.mean(time_diffs) / 3600.0  # Convert to hours
        else:
            mean_time_between = duration_hours
        
        # Analyze trend
        trend, trend_confidence = self._analyze_safety_trend(end_time)
        
        return SafetyMetrics(
            start_time=start_time,
            end_time=end_time,
            duration_hours=duration_hours,
            total_violations=len(period_violations),
            violations_by_type=dict(violations_by_type),
            violations_by_severity=dict(violations_by_severity),
            minimum_separation_achieved=min_separation,
            average_separation=avg_separation,
            separation_violations=separation_violations,
            near_misses=near_misses,
            safety_score=safety_score,
            violation_rate_per_hour=violation_rate,
            mean_time_between_violations=mean_time_between,
            violation_trend=trend,
            trend_confidence=trend_confidence
        )
    
    def get_violation_history(self, limit: Optional[int] = None) -> List[SafetyViolation]:
        """
        Get violation history.
        
        Args:
            limit: Maximum number of violations to return
            
        Returns:
            List of safety violations (most recent first)
        """
        with self._lock:
            violations = list(reversed(self._violations))
            
            if limit is not None:
                violations = violations[:limit]
            
            return violations
    
    def get_violations_by_aircraft(self, aircraft_id: str) -> List[SafetyViolation]:
        """Get all violations involving a specific aircraft."""
        with self._lock:
            return [
                v for v in self._violations
                if aircraft_id in v.aircraft_involved
            ]
    
    def get_violation_patterns(self) -> Dict[str, Any]:
        """
        Analyze patterns in safety violations.
        
        Returns:
            Dictionary of violation patterns and insights
        """
        with self._lock:
            violations = list(self._violations)
        
        if not violations:
            return {"patterns": [], "insights": []}
        
        patterns = []
        insights = []
        
        # Analyze temporal patterns
        violation_times = [v.timestamp for v in violations]
        if len(violation_times) > 5:
            # Check for clustering in time
            time_diffs = np.diff(sorted(violation_times))
            avg_diff = np.mean(time_diffs)
            
            clusters = []
            current_cluster = [violation_times[0]]
            
            for i, diff in enumerate(time_diffs):
                if diff < avg_diff * 0.5:  # Violations close in time
                    current_cluster.append(violation_times[i + 1])
                else:
                    if len(current_cluster) > 2:
                        clusters.append(current_cluster)
                    current_cluster = [violation_times[i + 1]]
            
            if len(current_cluster) > 2:
                clusters.append(current_cluster)
            
            if clusters:
                patterns.append({
                    "type": "temporal_clustering",
                    "description": f"Found {len(clusters)} clusters of violations",
                    "clusters": len(clusters)
                })
                insights.append("Violations tend to occur in clusters, suggesting systemic issues")
        
        # Analyze aircraft involvement patterns
        aircraft_violations = defaultdict(int)
        for violation in violations:
            for aircraft_id in violation.aircraft_involved:
                aircraft_violations[aircraft_id] += 1
        
        if aircraft_violations:
            max_violations = max(aircraft_violations.values())
            high_risk_aircraft = [
                aircraft_id for aircraft_id, count in aircraft_violations.items()
                if count > max_violations * 0.7
            ]
            
            if high_risk_aircraft:
                patterns.append({
                    "type": "high_risk_aircraft",
                    "description": f"Aircraft with frequent violations: {high_risk_aircraft}",
                    "aircraft": high_risk_aircraft
                })
                insights.append("Some aircraft are involved in violations more frequently")
        
        # Analyze severity progression
        recent_violations = violations[-20:] if len(violations) > 20 else violations
        severity_scores = {
            ViolationSeverity.LOW: 1,
            ViolationSeverity.MEDIUM: 2,
            ViolationSeverity.HIGH: 3,
            ViolationSeverity.CRITICAL: 4
        }
        
        if len(recent_violations) > 5:
            severity_trend = [severity_scores[v.severity] for v in recent_violations]
            if len(severity_trend) > 1:
                trend_slope = np.polyfit(range(len(severity_trend)), severity_trend, 1)[0]
                
                if trend_slope > 0.1:
                    patterns.append({
                        "type": "escalating_severity",
                        "description": "Violation severity is increasing over time",
                        "trend_slope": trend_slope
                    })
                    insights.append("Recent violations are becoming more severe")
                elif trend_slope < -0.1:
                    patterns.append({
                        "type": "improving_severity",
                        "description": "Violation severity is decreasing over time",
                        "trend_slope": trend_slope
                    })
                    insights.append("Recent violations are becoming less severe")
        
        return {
            "patterns": patterns,
            "insights": insights,
            "total_violations_analyzed": len(violations)
        }
    
    def _get_relevant_decisions(self, violation: SafetyViolation) -> List[DecisionRecord]:
        """Get decision records relevant to a safety violation."""
        # Get decisions from the lookback period before the violation
        lookback_start = violation.timestamp - self.lookback_seconds
        
        # Get all decisions in the time window
        all_decisions = self.decision_tracker.get_decision_history()
        
        relevant_decisions = [
            decision for decision in all_decisions
            if lookback_start <= decision.timestamp <= violation.timestamp
        ]
        
        # Sort by timestamp (oldest first)
        relevant_decisions.sort(key=lambda d: d.timestamp)
        
        return relevant_decisions
    
    def _identify_root_causes(self, violation: SafetyViolation,
                            decisions: List[DecisionRecord]) -> List[str]:
        """Identify root causes of a safety violation."""
        root_causes = []
        
        if not decisions:
            root_causes.append("Insufficient decision history for analysis")
            return root_causes
        
        # Analyze decision patterns leading to violation
        recent_decisions = decisions[-10:]  # Last 10 decisions
        
        # Check for erratic control behavior
        if len(recent_decisions) > 3:
            actions = [d.action for d in recent_decisions]
            action_changes = []
            
            for i in range(1, len(actions)):
                change = np.linalg.norm(actions[i] - actions[i-1])
                action_changes.append(change)
            
            if action_changes:
                avg_change = np.mean(action_changes)
                std_change = np.std(action_changes)
                
                if std_change > avg_change * 0.8:
                    root_causes.append("Erratic control behavior - high action variability")
        
        # Check for low confidence decisions
        low_confidence_count = 0
        for decision in recent_decisions:
            if "action_confidence" in decision.confidence_scores:
                if decision.confidence_scores["action_confidence"] < 0.5:
                    low_confidence_count += 1
        
        if low_confidence_count > len(recent_decisions) * 0.5:
            root_causes.append("Multiple low-confidence decisions preceding violation")
        
        # Check for delayed response to warnings
        warning_decisions = [
            d for d in decisions
            if d.reward is not None and d.reward < -0.5  # Negative reward indicates warning
        ]
        
        if warning_decisions and len(warning_decisions) > 2:
            root_causes.append("Delayed response to safety warnings")
        
        # Check for conflicting objectives
        if len(recent_decisions) > 1:
            value_estimates = [d.value_estimate for d in recent_decisions]
            if len(value_estimates) > 1:
                value_variance = np.var(value_estimates)
                if value_variance > 1.0:  # High variance in value estimates
                    root_causes.append("Conflicting objective priorities")
        
        # Default if no specific causes identified
        if not root_causes:
            root_causes.append("Complex multi-factor scenario requiring further analysis")
        
        return root_causes
    
    def _calculate_preventability(self, violation: SafetyViolation,
                                decisions: List[DecisionRecord]) -> float:
        """Calculate how preventable a violation was (0-1 scale)."""
        if not decisions:
            return 0.0
        
        preventability_factors = []
        
        # Factor 1: Time available for correction
        if violation.time_to_violation > 0:
            time_factor = min(violation.time_to_violation / 60.0, 1.0)  # Normalize to 1 minute
            preventability_factors.append(time_factor)
        
        # Factor 2: Decision confidence levels
        recent_decisions = decisions[-5:]
        if recent_decisions:
            confidences = []
            for decision in recent_decisions:
                if "action_confidence" in decision.confidence_scores:
                    confidences.append(decision.confidence_scores["action_confidence"])
            
            if confidences:
                avg_confidence = np.mean(confidences)
                preventability_factors.append(avg_confidence)
        
        # Factor 3: Controller response consistency
        if len(decisions) > 3:
            actions = [d.action for d in decisions[-5:]]
            action_consistency = 1.0 - min(np.std([np.linalg.norm(a) for a in actions]) / 2.0, 1.0)
            preventability_factors.append(action_consistency)
        
        # Factor 4: Warning response
        warning_responses = 0
        total_warnings = 0
        for decision in decisions:
            if decision.reward is not None and decision.reward < -0.3:  # Warning signal
                total_warnings += 1
                if np.linalg.norm(decision.action) > 0.1:  # Controller took action
                    warning_responses += 1
        
        if total_warnings > 0:
            warning_response_rate = warning_responses / total_warnings
            preventability_factors.append(warning_response_rate)
        
        # Calculate overall preventability
        if preventability_factors:
            return np.mean(preventability_factors)
        else:
            return 0.5  # Default moderate preventability
    
    def _analyze_controller_response(self, violation: SafetyViolation,
                                   decisions: List[DecisionRecord]) -> float:
        """Analyze controller response time to safety warnings."""
        if not decisions:
            return 0.0
        
        # Find first warning signal
        first_warning_time = None
        first_response_time = None
        
        for decision in decisions:
            if decision.reward is not None and decision.reward < -0.5:  # Strong warning
                if first_warning_time is None:
                    first_warning_time = decision.timestamp
                
                # Look for significant control action after warning
                if (first_warning_time is not None and 
                    np.linalg.norm(decision.action) > 0.2 and
                    first_response_time is None):
                    first_response_time = decision.timestamp
                    break
        
        if first_warning_time is not None and first_response_time is not None:
            return first_response_time - first_warning_time
        else:
            return 0.0  # No clear warning-response pattern
    
    def _analyze_environmental_factors(self, violation: SafetyViolation) -> Dict[str, Any]:
        """Analyze environmental factors contributing to violation."""
        factors = {}
        
        # Aircraft density factor
        factors["aircraft_count"] = len(violation.aircraft_involved)
        
        # Separation criticality
        if violation.separation_distance > 0:
            criticality = max(0.0, 1.0 - (violation.separation_distance / self.minimum_separation_nm))
            factors["separation_criticality"] = criticality
        
        # Altitude factor
        if violation.altitude_separation < self.vertical_separation_ft:
            factors["vertical_separation_insufficient"] = True
            factors["altitude_separation_ratio"] = violation.altitude_separation / self.vertical_separation_ft
        
        return factors
    
    def _calculate_safety_score(self, violations: List[SafetyViolation], 
                              duration_hours: float) -> float:
        """Calculate overall safety score (0-100 scale)."""
        if duration_hours <= 0:
            return 100.0
        
        # Base score
        base_score = 100.0
        
        # Penalty for violations
        violation_penalty = 0.0
        for violation in violations:
            if violation.severity == ViolationSeverity.CRITICAL:
                violation_penalty += 20.0
            elif violation.severity == ViolationSeverity.HIGH:
                violation_penalty += 10.0
            elif violation.severity == ViolationSeverity.MEDIUM:
                violation_penalty += 5.0
            else:  # LOW
                violation_penalty += 2.0
        
        # Normalize penalty by time period
        normalized_penalty = violation_penalty / max(duration_hours, 1.0)
        
        # Calculate final score
        safety_score = max(0.0, base_score - normalized_penalty)
        
        return safety_score
    
    def _analyze_safety_trend(self, end_time: float) -> Tuple[str, float]:
        """Analyze safety trend over recent periods."""
        # Compare last two periods
        period_duration = self.analysis_window_hours * 3600 / 2  # Half the analysis window
        
        recent_start = end_time - period_duration
        previous_start = recent_start - period_duration
        
        # Get violations for each period
        recent_violations = [
            v for v in self._violations
            if recent_start <= v.timestamp <= end_time
        ]
        
        previous_violations = [
            v for v in self._violations
            if previous_start <= v.timestamp < recent_start
        ]
        
        recent_count = len(recent_violations)
        previous_count = len(previous_violations)
        
        # Calculate trend
        if previous_count == 0:
            if recent_count == 0:
                return "stable", 1.0
            else:
                return "degrading", 0.8
        
        change_ratio = recent_count / previous_count
        
        if change_ratio < 0.8:
            return "improving", min(0.9, 1.0 - change_ratio + 0.8)
        elif change_ratio > 1.2:
            return "degrading", min(0.9, change_ratio - 1.2 + 0.7)
        else:
            return "stable", 0.9
    
    def _handle_safety_violation_event(self, event: EventData) -> None:
        """Handle safety violation events from the event bus."""
        try:
            data = event.data
            
            # Create safety violation record
            violation = SafetyViolation(
                violation_id=f"violation_{self._violation_count}_{int(event.timestamp * 1000)}",
                timestamp=event.timestamp,
                violation_type=ViolationType(data.get("violation_type", "loss_of_separation")),
                severity=ViolationSeverity(data.get("severity", "medium")),
                aircraft_involved=data.get("aircraft_involved", []),
                separation_distance=data.get("separation_distance", 0.0),
                minimum_separation=data.get("minimum_separation", self.minimum_separation_nm),
                altitude_separation=data.get("altitude_separation", 0.0),
                contributing_decisions=[],
                root_causes=[],
                environmental_factors={}
            )
            
            # Perform analysis
            analyzed_violation = self.analyze_violation(violation)
            
            # Store violation
            with self._lock:
                self._violations.append(analyzed_violation)
                self._violation_count += 1
            
            print(f"Safety violation analyzed: {analyzed_violation.violation_id}")
            
        except Exception as e:
            print(f"Warning: Error handling safety violation event: {e}")
    
    def shutdown(self) -> None:
        """Shutdown the safety analyzer and cleanup resources."""
        if self._subscription_id:
            self.event_bus.unsubscribe(self._subscription_id)
            self._subscription_id = None
        
        print("SafetyAnalyzer shutdown complete")


# Global safety analyzer instance
_global_safety_analyzer: Optional[SafetyAnalyzer] = None


def get_safety_analyzer() -> SafetyAnalyzer:
    """Get the global safety analyzer instance."""
    global _global_safety_analyzer
    if _global_safety_analyzer is None:
        _global_safety_analyzer = SafetyAnalyzer()
    return _global_safety_analyzer


def set_safety_analyzer(analyzer: SafetyAnalyzer) -> None:
    """Set the global safety analyzer instance."""
    global _global_safety_analyzer
    if _global_safety_analyzer is not None:
        _global_safety_analyzer.shutdown()
    _global_safety_analyzer = analyzer


def shutdown_safety_analyzer() -> None:
    """Shutdown the global safety analyzer."""
    global _global_safety_analyzer
    if _global_safety_analyzer is not None:
        _global_safety_analyzer.shutdown()
        _global_safety_analyzer = None