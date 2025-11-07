"""
Automated report generation with recommendations and alerting.

This module provides structured analysis reports, recommendation engines based on
performance analysis, and alert systems for performance degradation detection.
"""

import time
import json
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional, Tuple, Set
from enum import Enum
import numpy as np
import threading
from datetime import datetime, timedelta
from collections import defaultdict

from .safety_analyzer import SafetyAnalyzer, SafetyMetrics, SafetyViolation, get_safety_analyzer
from .pattern_analyzer import PatternAnalyzer, BehaviorPattern, PerformanceMetrics, get_pattern_analyzer
from ..events import EventBus, get_event_bus
from ..events.event_data import EventData, EventType


class ReportType(str, Enum):
    """Types of analysis reports."""
    
    DAILY_SUMMARY = "daily_summary"
    PERFORMANCE_ANALYSIS = "performance_analysis"
    SAFETY_ASSESSMENT = "safety_assessment"
    PATTERN_ANALYSIS = "pattern_analysis"
    COMPARATIVE_ANALYSIS = "comparative_analysis"
    INCIDENT_REPORT = "incident_report"


class AlertLevel(str, Enum):
    """Alert severity levels."""
    
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


@dataclass
class Recommendation:
    """A specific recommendation with priority and rationale."""
    
    recommendation_id: str
    title: str
    description: str
    priority: str  # "high", "medium", "low"
    category: str  # "safety", "performance", "training", "configuration"
    rationale: str
    expected_impact: str
    implementation_effort: str  # "low", "medium", "high"
    
    # Supporting evidence
    supporting_patterns: Optional[List[str]] = None
    supporting_metrics: Optional[Dict[str, float]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return asdict(self)


@dataclass
class Alert:
    """Performance degradation or safety alert."""
    
    alert_id: str
    timestamp: float
    alert_level: AlertLevel
    title: str
    description: str
    category: str
    
    # Alert details
    affected_metrics: List[str]
    threshold_values: Dict[str, float]
    current_values: Dict[str, float]
    
    # Status
    acknowledged: bool = False
    resolved: bool = False
    
    # Context
    related_patterns: Optional[List[str]] = None
    related_violations: Optional[List[str]] = None
    resolution_notes: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return asdict(self)


@dataclass
class AnalysisReport:
    """Comprehensive analysis report with findings and recommendations."""
    
    # Report metadata
    report_id: str
    report_type: ReportType
    timestamp: float
    analysis_period: Tuple[float, float]  # start_time, end_time
    
    # Executive summary
    executive_summary: str
    key_findings: List[str]
    overall_assessment: str  # "excellent", "good", "concerning", "critical"
    
    # Detailed analysis
    safety_metrics: Optional[SafetyMetrics] = None
    performance_patterns: Optional[List[BehaviorPattern]] = None
    detected_anomalies: Optional[List[BehaviorPattern]] = None
    
    # Recommendations and alerts
    recommendations: Optional[List[Recommendation]] = None
    alerts: Optional[List[Alert]] = None
    
    # Supporting data
    raw_metrics: Optional[Dict[str, Any]] = None
    statistical_analysis: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        result = asdict(self)
        # Convert patterns and other complex objects
        if self.performance_patterns:
            result["performance_patterns"] = [p.to_dict() for p in self.performance_patterns]
        if self.detected_anomalies:
            result["detected_anomalies"] = [a.to_dict() for a in self.detected_anomalies]
        if self.recommendations:
            result["recommendations"] = [r.to_dict() for r in self.recommendations]
        if self.alerts:
            result["alerts"] = [a.to_dict() for a in self.alerts]
        return result
    
    def to_json(self) -> str:
        """Convert to JSON string."""
        return json.dumps(self.to_dict(), indent=2)


class ReportGenerator:
    """
    Generates automated analysis reports with recommendations and alerts.
    
    This class combines data from safety analyzer and pattern analyzer to create
    comprehensive reports, generate actionable recommendations, and trigger alerts
    for performance degradation or safety issues.
    """
    
    def __init__(self, safety_analyzer: Optional[SafetyAnalyzer] = None,
                 pattern_analyzer: Optional[PatternAnalyzer] = None,
                 event_bus: Optional[EventBus] = None):
        """
        Initialize the report generator.
        
        Args:
            safety_analyzer: Safety analyzer instance (uses global if None)
            pattern_analyzer: Pattern analyzer instance (uses global if None)
            event_bus: Event bus instance (uses global if None)
        """
        self.safety_analyzer = safety_analyzer or get_safety_analyzer()
        self.pattern_analyzer = pattern_analyzer or get_pattern_analyzer()
        self.event_bus = event_bus or get_event_bus()
        
        # Report storage
        self._reports: List[AnalysisReport] = []
        self._alerts: List[Alert] = []
        self._report_count = 0
        self._alert_count = 0
        self._lock = threading.RLock()
        
        # Alert thresholds
        self.alert_thresholds = {
            "safety_score": {"warning": 80.0, "critical": 60.0},
            "violation_rate": {"warning": 0.5, "critical": 1.0},  # per hour
            "reward_decline": {"warning": -0.1, "critical": -0.2},  # relative change
            "pattern_severity": {"warning": "concerning", "critical": "critical"}
        }
        
        # Recommendation templates
        self._recommendation_templates = self._initialize_recommendation_templates()
        
        print("ReportGenerator initialized")
    
    def generate_daily_summary(self, date: Optional[datetime] = None) -> AnalysisReport:
        """
        Generate daily summary report.
        
        Args:
            date: Date for the report (defaults to yesterday)
            
        Returns:
            Daily summary analysis report
        """
        if date is None:
            date = datetime.now() - timedelta(days=1)
        
        # Define analysis period (24 hours)
        start_time = date.replace(hour=0, minute=0, second=0, microsecond=0).timestamp()
        end_time = start_time + 86400  # 24 hours
        
        # Gather data from analyzers
        safety_metrics = self.safety_analyzer.calculate_safety_metrics(start_time, end_time)
        recent_patterns = self.pattern_analyzer.analyze_recent_performance(episodes=100)
        performance_trends = self.pattern_analyzer.get_performance_trends(episodes=100)
        
        # Generate executive summary
        executive_summary = self._generate_executive_summary(
            safety_metrics, recent_patterns, performance_trends
        )
        
        # Extract key findings
        key_findings = self._extract_key_findings(
            safety_metrics, recent_patterns, performance_trends
        )
        
        # Determine overall assessment
        overall_assessment = self._determine_overall_assessment(
            safety_metrics, recent_patterns
        )
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            safety_metrics, recent_patterns, performance_trends
        )
        
        # Check for alerts
        alerts = self._check_for_alerts(safety_metrics, recent_patterns)
        
        # Create report
        report = AnalysisReport(
            report_id=f"daily_{date.strftime('%Y%m%d')}_{self._report_count}",
            report_type=ReportType.DAILY_SUMMARY,
            timestamp=time.time(),
            analysis_period=(start_time, end_time),
            executive_summary=executive_summary,
            key_findings=key_findings,
            overall_assessment=overall_assessment,
            safety_metrics=safety_metrics,
            performance_patterns=recent_patterns,
            recommendations=recommendations,
            alerts=alerts,
            raw_metrics={
                "performance_trends": performance_trends,
                "pattern_summary": self.pattern_analyzer.get_pattern_summary()
            }
        )
        
        # Store report
        with self._lock:
            self._reports.append(report)
            self._report_count += 1
            
            # Store alerts
            for alert in alerts:
                self._alerts.append(alert)
        
        return report
    
    def generate_performance_analysis(self, episodes: int = 200) -> AnalysisReport:
        """
        Generate detailed performance analysis report.
        
        Args:
            episodes: Number of recent episodes to analyze
            
        Returns:
            Performance analysis report
        """
        end_time = time.time()
        start_time = end_time - (episodes * 30.0)  # Assume 30s per episode
        
        # Analyze patterns and trends
        patterns = self.pattern_analyzer.analyze_recent_performance(episodes)
        trends = self.pattern_analyzer.get_performance_trends(episodes)
        anomalies = []
        
        # Check for anomalies in key metrics
        for metric in ["mean_reward", "decision_consistency", "safety_violations"]:
            metric_anomalies = self.pattern_analyzer.detect_anomalies(metric, episodes)
            anomalies.extend(metric_anomalies)
        
        # Generate analysis
        executive_summary = f"Performance analysis over {episodes} episodes reveals " + \
                          f"{len(patterns)} behavioral patterns and {len(anomalies)} anomalies."
        
        key_findings = []
        if trends.get("reward_trend", {}).get("direction") == "improving":
            key_findings.append("Reward performance is improving over time")
        elif trends.get("reward_trend", {}).get("direction") == "declining":
            key_findings.append("Reward performance is declining - investigation needed")
        
        if anomalies:
            key_findings.append(f"Detected {len(anomalies)} performance anomalies")
        
        # Generate recommendations
        recommendations = self._generate_performance_recommendations(patterns, trends, anomalies)
        
        # Create report
        report = AnalysisReport(
            report_id=f"performance_{int(time.time())}_{self._report_count}",
            report_type=ReportType.PERFORMANCE_ANALYSIS,
            timestamp=time.time(),
            analysis_period=(start_time, end_time),
            executive_summary=executive_summary,
            key_findings=key_findings,
            overall_assessment=self._assess_performance_health(patterns, trends, anomalies),
            performance_patterns=patterns,
            detected_anomalies=anomalies,
            recommendations=recommendations,
            raw_metrics={"trends": trends}
        )
        
        with self._lock:
            self._reports.append(report)
            self._report_count += 1
        
        return report
    
    def generate_safety_assessment(self, hours: float = 24.0) -> AnalysisReport:
        """
        Generate safety assessment report.
        
        Args:
            hours: Number of hours to analyze
            
        Returns:
            Safety assessment report
        """
        end_time = time.time()
        start_time = end_time - (hours * 3600)
        
        # Get safety data
        safety_metrics = self.safety_analyzer.calculate_safety_metrics(start_time, end_time)
        violations = self.safety_analyzer.get_violation_history(limit=50)
        patterns = self.safety_analyzer.get_violation_patterns()
        
        # Generate summary
        executive_summary = f"Safety assessment over {hours} hours: " + \
                          f"{safety_metrics.total_violations} violations, " + \
                          f"safety score {safety_metrics.safety_score:.1f}/100"
        
        key_findings = []
        if safety_metrics.safety_score < 70:
            key_findings.append("Safety score below acceptable threshold")
        if safety_metrics.near_misses > 0:
            key_findings.append(f"Recorded {safety_metrics.near_misses} near-miss events")
        if patterns.get("insights"):
            key_findings.extend(patterns["insights"][:3])  # Top 3 insights
        
        # Generate safety recommendations
        recommendations = self._generate_safety_recommendations(safety_metrics, violations, patterns)
        
        # Check for safety alerts
        alerts = self._check_safety_alerts(safety_metrics, violations)
        
        # Create report
        report = AnalysisReport(
            report_id=f"safety_{int(time.time())}_{self._report_count}",
            report_type=ReportType.SAFETY_ASSESSMENT,
            timestamp=time.time(),
            analysis_period=(start_time, end_time),
            executive_summary=executive_summary,
            key_findings=key_findings,
            overall_assessment=self._assess_safety_level(safety_metrics),
            safety_metrics=safety_metrics,
            recommendations=recommendations,
            alerts=alerts,
            raw_metrics={"violation_patterns": patterns}
        )
        
        with self._lock:
            self._reports.append(report)
            self._report_count += 1
            
            for alert in alerts:
                self._alerts.append(alert)
        
        return report
    
    def get_active_alerts(self) -> List[Alert]:
        """Get all active (unresolved) alerts."""
        with self._lock:
            return [alert for alert in self._alerts if not alert.resolved]
    
    def acknowledge_alert(self, alert_id: str) -> bool:
        """
        Acknowledge an alert.
        
        Args:
            alert_id: ID of the alert to acknowledge
            
        Returns:
            True if alert was found and acknowledged
        """
        with self._lock:
            for alert in self._alerts:
                if alert.alert_id == alert_id:
                    alert.acknowledged = True
                    return True
            return False
    
    def resolve_alert(self, alert_id: str, resolution_notes: str = "") -> bool:
        """
        Resolve an alert.
        
        Args:
            alert_id: ID of the alert to resolve
            resolution_notes: Notes about the resolution
            
        Returns:
            True if alert was found and resolved
        """
        with self._lock:
            for alert in self._alerts:
                if alert.alert_id == alert_id:
                    alert.resolved = True
                    alert.resolution_notes = resolution_notes
                    return True
            return False
    
    def get_reports(self, report_type: Optional[ReportType] = None, 
                   limit: Optional[int] = None) -> List[AnalysisReport]:
        """
        Get analysis reports.
        
        Args:
            report_type: Filter by report type (optional)
            limit: Maximum number of reports to return
            
        Returns:
            List of analysis reports (most recent first)
        """
        with self._lock:
            reports = list(reversed(self._reports))
            
            if report_type:
                reports = [r for r in reports if r.report_type == report_type]
            
            if limit:
                reports = reports[:limit]
            
            return reports
    
    def _generate_executive_summary(self, safety_metrics: SafetyMetrics,
                                  patterns: List[BehaviorPattern],
                                  trends: Dict[str, Any]) -> str:
        """Generate executive summary for daily report."""
        summary_parts = []
        
        # Safety summary
        if safety_metrics.safety_score >= 90:
            summary_parts.append("Excellent safety performance")
        elif safety_metrics.safety_score >= 80:
            summary_parts.append("Good safety performance")
        elif safety_metrics.safety_score >= 70:
            summary_parts.append("Acceptable safety performance")
        else:
            summary_parts.append("Safety performance needs attention")
        
        # Pattern summary
        critical_patterns = [p for p in patterns if p.severity.value == "critical"]
        if critical_patterns:
            summary_parts.append(f"{len(critical_patterns)} critical behavioral patterns detected")
        elif patterns:
            summary_parts.append(f"{len(patterns)} behavioral patterns identified")
        
        # Trend summary
        reward_trend = trends.get("reward_trend", {})
        if reward_trend.get("direction") == "improving":
            summary_parts.append("performance is improving")
        elif reward_trend.get("direction") == "declining":
            summary_parts.append("performance is declining")
        else:
            summary_parts.append("performance is stable")
        
        return ". ".join(summary_parts) + "."
    
    def _extract_key_findings(self, safety_metrics: SafetyMetrics,
                            patterns: List[BehaviorPattern],
                            trends: Dict[str, Any]) -> List[str]:
        """Extract key findings from analysis data."""
        findings = []
        
        # Safety findings
        if safety_metrics.total_violations > 0:
            findings.append(f"Recorded {safety_metrics.total_violations} safety violations")
        
        if safety_metrics.violation_trend == "degrading":
            findings.append("Safety violations are increasing over time")
        elif safety_metrics.violation_trend == "improving":
            findings.append("Safety violations are decreasing over time")
        
        # Pattern findings
        oscillation_patterns = [p for p in patterns if p.pattern_type.value == "oscillation"]
        if oscillation_patterns:
            findings.append(f"Detected {len(oscillation_patterns)} oscillatory behaviors")
        
        anomaly_patterns = [p for p in patterns if p.pattern_type.value == "anomaly"]
        if anomaly_patterns:
            findings.append(f"Identified {len(anomaly_patterns)} performance anomalies")
        
        # Trend findings
        for metric, trend_data in trends.items():
            if trend_data.get("significance") == "significant":
                direction = trend_data.get("direction", "unknown")
                findings.append(f"{metric.replace('_', ' ').title()} is {direction} significantly")
        
        return findings[:5]  # Limit to top 5 findings
    
    def _determine_overall_assessment(self, safety_metrics: SafetyMetrics,
                                    patterns: List[BehaviorPattern]) -> str:
        """Determine overall system assessment."""
        # Start with safety score
        if safety_metrics.safety_score >= 90:
            base_assessment = "excellent"
        elif safety_metrics.safety_score >= 80:
            base_assessment = "good"
        elif safety_metrics.safety_score >= 70:
            base_assessment = "concerning"
        else:
            base_assessment = "critical"
        
        # Adjust based on patterns
        critical_patterns = [p for p in patterns if p.severity.value == "critical"]
        concerning_patterns = [p for p in patterns if p.severity.value == "concerning"]
        
        if critical_patterns:
            if base_assessment in ["excellent", "good"]:
                base_assessment = "concerning"
            elif base_assessment == "concerning":
                base_assessment = "critical"
        elif concerning_patterns and base_assessment == "excellent":
            base_assessment = "good"
        
        return base_assessment
    
    def _generate_recommendations(self, safety_metrics: SafetyMetrics,
                                patterns: List[BehaviorPattern],
                                trends: Dict[str, Any]) -> List[Recommendation]:
        """Generate recommendations based on analysis."""
        recommendations = []
        rec_id_counter = 0
        
        # Safety recommendations
        if safety_metrics.safety_score < 80:
            rec_id_counter += 1
            recommendations.append(Recommendation(
                recommendation_id=f"safety_{rec_id_counter}",
                title="Improve Safety Performance",
                description="Safety score is below target threshold. Focus on reducing violations.",
                priority="high",
                category="safety",
                rationale=f"Current safety score: {safety_metrics.safety_score:.1f}/100",
                expected_impact="Reduce safety violations by 30-50%",
                implementation_effort="medium",
                supporting_metrics={"safety_score": safety_metrics.safety_score}
            ))
        
        # Pattern-based recommendations
        for pattern in patterns:
            if pattern.severity.value in ["critical", "concerning"]:
                rec_id_counter += 1
                recommendations.append(Recommendation(
                    recommendation_id=f"pattern_{rec_id_counter}",
                    title=f"Address {pattern.pattern_type.value.title()} Pattern",
                    description=pattern.description,
                    priority="high" if pattern.severity.value == "critical" else "medium",
                    category="performance",
                    rationale=f"Detected {pattern.pattern_type.value} with {pattern.severity.value} severity",
                    expected_impact="Improve training stability and performance",
                    implementation_effort="medium",
                    supporting_patterns=[pattern.pattern_id]
                ))
        
        # Trend-based recommendations
        reward_trend = trends.get("reward_trend", {})
        if (reward_trend.get("direction") == "declining" and 
            reward_trend.get("significance") == "significant"):
            rec_id_counter += 1
            recommendations.append(Recommendation(
                recommendation_id=f"trend_{rec_id_counter}",
                title="Address Declining Reward Performance",
                description="Reward performance is declining significantly over time.",
                priority="high",
                category="training",
                rationale=f"Reward trend slope: {reward_trend.get('slope', 0):.4f}",
                expected_impact="Stabilize and improve reward performance",
                implementation_effort="high",
                supporting_metrics={"reward_slope": reward_trend.get("slope", 0)}
            ))
        
        return recommendations
    
    def _generate_performance_recommendations(self, patterns: List[BehaviorPattern],
                                           trends: Dict[str, Any],
                                           anomalies: List[BehaviorPattern]) -> List[Recommendation]:
        """Generate performance-specific recommendations."""
        recommendations = []
        
        # Add pattern-based recommendations
        for pattern in patterns:
            if pattern.recommendations:
                for i, rec_text in enumerate(pattern.recommendations):
                    recommendations.append(Recommendation(
                        recommendation_id=f"perf_{pattern.pattern_id}_{i}",
                        title=f"Pattern-Based: {rec_text[:50]}...",
                        description=rec_text,
                        priority="medium",
                        category="performance",
                        rationale=f"Based on {pattern.pattern_type.value} pattern analysis",
                        expected_impact="Improve specific performance aspect",
                        implementation_effort="medium",
                        supporting_patterns=[pattern.pattern_id]
                    ))
        
        return recommendations[:10]  # Limit to top 10
    
    def _generate_safety_recommendations(self, safety_metrics: SafetyMetrics,
                                       violations: List[SafetyViolation],
                                       patterns: Dict[str, Any]) -> List[Recommendation]:
        """Generate safety-specific recommendations."""
        recommendations = []
        
        if safety_metrics.violation_rate_per_hour > 0.5:
            recommendations.append(Recommendation(
                recommendation_id="safety_rate_1",
                title="Reduce Violation Rate",
                description="Violation rate is above acceptable threshold. Implement additional safety constraints.",
                priority="high",
                category="safety",
                rationale=f"Current rate: {safety_metrics.violation_rate_per_hour:.2f} violations/hour",
                expected_impact="Reduce violation rate by 50%",
                implementation_effort="medium"
            ))
        
        return recommendations
    
    def _check_for_alerts(self, safety_metrics: SafetyMetrics,
                         patterns: List[BehaviorPattern]) -> List[Alert]:
        """Check for conditions that should trigger alerts."""
        alerts = []
        
        # Safety score alert
        if safety_metrics.safety_score < self.alert_thresholds["safety_score"]["critical"]:
            alerts.append(Alert(
                alert_id=f"safety_critical_{int(time.time())}",
                timestamp=time.time(),
                alert_level=AlertLevel.CRITICAL,
                title="Critical Safety Score",
                description=f"Safety score ({safety_metrics.safety_score:.1f}) below critical threshold",
                category="safety",
                affected_metrics=["safety_score"],
                threshold_values={"safety_score": self.alert_thresholds["safety_score"]["critical"]},
                current_values={"safety_score": safety_metrics.safety_score}
            ))
        elif safety_metrics.safety_score < self.alert_thresholds["safety_score"]["warning"]:
            alerts.append(Alert(
                alert_id=f"safety_warning_{int(time.time())}",
                timestamp=time.time(),
                alert_level=AlertLevel.WARNING,
                title="Low Safety Score",
                description=f"Safety score ({safety_metrics.safety_score:.1f}) below warning threshold",
                category="safety",
                affected_metrics=["safety_score"],
                threshold_values={"safety_score": self.alert_thresholds["safety_score"]["warning"]},
                current_values={"safety_score": safety_metrics.safety_score}
            ))
        
        # Pattern severity alerts
        critical_patterns = [p for p in patterns if p.severity.value == "critical"]
        if critical_patterns:
            alerts.append(Alert(
                alert_id=f"pattern_critical_{int(time.time())}",
                timestamp=time.time(),
                alert_level=AlertLevel.CRITICAL,
                title="Critical Performance Patterns",
                description=f"Detected {len(critical_patterns)} critical performance patterns",
                category="performance",
                affected_metrics=["pattern_severity"],
                threshold_values={"critical_patterns": 0},
                current_values={"critical_patterns": len(critical_patterns)},
                related_patterns=[p.pattern_id for p in critical_patterns]
            ))
        
        return alerts
    
    def _check_safety_alerts(self, safety_metrics: SafetyMetrics,
                           violations: List[SafetyViolation]) -> List[Alert]:
        """Check for safety-specific alerts."""
        alerts = []
        
        # High violation rate
        if safety_metrics.violation_rate_per_hour > self.alert_thresholds["violation_rate"]["critical"]:
            alerts.append(Alert(
                alert_id=f"violation_rate_{int(time.time())}",
                timestamp=time.time(),
                alert_level=AlertLevel.CRITICAL,
                title="High Violation Rate",
                description=f"Violation rate ({safety_metrics.violation_rate_per_hour:.2f}/hour) exceeds threshold",
                category="safety",
                affected_metrics=["violation_rate"],
                threshold_values={"violation_rate": self.alert_thresholds["violation_rate"]["critical"]},
                current_values={"violation_rate": safety_metrics.violation_rate_per_hour}
            ))
        
        return alerts
    
    def _assess_performance_health(self, patterns: List[BehaviorPattern],
                                 trends: Dict[str, Any],
                                 anomalies: List[BehaviorPattern]) -> str:
        """Assess overall performance health."""
        health_score = 100
        
        # Deduct for critical patterns
        critical_patterns = [p for p in patterns if p.severity.value == "critical"]
        health_score -= len(critical_patterns) * 20
        
        # Deduct for concerning patterns
        concerning_patterns = [p for p in patterns if p.severity.value == "concerning"]
        health_score -= len(concerning_patterns) * 10
        
        # Deduct for anomalies
        health_score -= len(anomalies) * 5
        
        # Adjust for trends
        reward_trend = trends.get("reward_trend", {})
        if reward_trend.get("direction") == "declining":
            health_score -= 15
        elif reward_trend.get("direction") == "improving":
            health_score += 5
        
        # Classify health
        if health_score >= 90:
            return "excellent"
        elif health_score >= 75:
            return "good"
        elif health_score >= 60:
            return "concerning"
        else:
            return "critical"
    
    def _assess_safety_level(self, safety_metrics: SafetyMetrics) -> str:
        """Assess safety level based on metrics."""
        if safety_metrics.safety_score >= 95:
            return "excellent"
        elif safety_metrics.safety_score >= 85:
            return "good"
        elif safety_metrics.safety_score >= 70:
            return "concerning"
        else:
            return "critical"
    
    def _initialize_recommendation_templates(self) -> Dict[str, Dict[str, str]]:
        """Initialize recommendation templates."""
        return {
            "oscillation": {
                "title": "Reduce Training Oscillations",
                "description": "Implement learning rate scheduling or experience replay smoothing",
                "category": "training"
            },
            "anomaly": {
                "title": "Investigate Performance Anomaly",
                "description": "Check for environmental changes or training instabilities",
                "category": "performance"
            },
            "safety_violation": {
                "title": "Enhance Safety Constraints",
                "description": "Implement additional safety penalties or constraints",
                "category": "safety"
            }
        }


# Global report generator instance
_global_report_generator: Optional[ReportGenerator] = None


def get_report_generator() -> ReportGenerator:
    """Get the global report generator instance."""
    global _global_report_generator
    if _global_report_generator is None:
        _global_report_generator = ReportGenerator()
    return _global_report_generator


def set_report_generator(generator: ReportGenerator) -> None:
    """Set the global report generator instance."""
    global _global_report_generator
    _global_report_generator = generator


def shutdown_report_generator() -> None:
    """Shutdown the global report generator."""
    global _global_report_generator
    if _global_report_generator is not None:
        _global_report_generator = None