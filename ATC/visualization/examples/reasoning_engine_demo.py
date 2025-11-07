"""
Demonstration of the automated reasoning engine capabilities.

This script shows how to use the SafetyAnalyzer, PatternAnalyzer, and ReportGenerator
to analyze AI controller performance and generate automated reports.
"""

import time
import numpy as np
from datetime import datetime, timedelta

from ..reasoning import SafetyAnalyzer, PatternAnalyzer, ReportGenerator
from ..reasoning.safety_analyzer import SafetyViolation, ViolationType, ViolationSeverity
from ..reasoning.pattern_analyzer import PerformanceMetrics
from ..events import get_event_bus
from ..events.event_data import SafetyViolationEvent, TrainingIterationEvent


def create_sample_safety_violation():
    """Create a sample safety violation for demonstration."""
    return SafetyViolation(
        violation_id="demo_violation_1",
        timestamp=time.time(),
        violation_type=ViolationType.LOSS_OF_SEPARATION,
        severity=ViolationSeverity.HIGH,
        aircraft_involved=["AC001", "AC002"],
        separation_distance=2.5,  # NM
        minimum_separation=5.0,   # NM
        altitude_separation=500.0,  # feet
        episode_id="episode_123",
        step_number=45
    )


def create_sample_performance_metrics():
    """Create sample performance metrics for demonstration."""
    return PerformanceMetrics(
        start_time=time.time() - 30.0,
        end_time=time.time(),
        episode_start=100,
        episode_end=100,
        mean_reward=15.5,
        reward_std=3.2,
        reward_trend=0.1,
        mean_confidence=0.75,
        confidence_std=0.15,
        decision_consistency=0.82,
        safety_violations=1,
        mean_separation=7.2,
        action_magnitude_mean=0.3,
        action_changes_per_episode=12.0,
        value_estimate_accuracy=0.68,
        policy_entropy=0.85
    )


def simulate_training_data(safety_analyzer, pattern_analyzer):
    """Simulate some training data for analysis."""
    print("Simulating training data...")
    
    # Simulate some safety violations
    event_bus = get_event_bus()
    
    for i in range(3):
        violation_event = SafetyViolationEvent(
            timestamp=time.time() - (i * 100),
            violation_type="loss_of_separation",
            aircraft_involved=[f"AC{i:03d}", f"AC{i+1:03d}"],
            separation_distance=2.0 + i * 0.5,
            minimum_separation=5.0,
            severity="high" if i == 0 else "medium"
        )
        event_bus.publish(violation_event.event_type, violation_event.data)
        time.sleep(0.1)  # Small delay to ensure different timestamps
    
    # Simulate training iterations
    for i in range(10):
        iteration_event = TrainingIterationEvent(
            timestamp=time.time() - (i * 30),
            iteration=100 - i,
            episode_reward_mean=15.0 + np.random.normal(0, 2),
            episode_len_mean=50.0 + np.random.normal(0, 5),
            metrics={
                "mean_confidence": 0.7 + np.random.normal(0, 0.1),
                "decision_consistency": 0.8 + np.random.normal(0, 0.05),
                "safety_violations": np.random.poisson(0.5),
                "mean_separation": 8.0 + np.random.normal(0, 1),
                "policy_entropy": 1.0 + np.random.normal(0, 0.2)
            }
        )
        event_bus.publish(iteration_event.event_type, iteration_event.data)
        time.sleep(0.1)


def demo_safety_analyzer():
    """Demonstrate SafetyAnalyzer capabilities."""
    print("\n=== Safety Analyzer Demo ===")
    
    safety_analyzer = SafetyAnalyzer()
    
    # Create and analyze a sample violation
    violation = create_sample_safety_violation()
    analyzed_violation = safety_analyzer.analyze_violation(violation)
    
    print(f"Analyzed violation: {analyzed_violation.violation_id}")
    print(f"Root causes: {analyzed_violation.root_causes}")
    print(f"Preventability score: {analyzed_violation.preventability_score:.2f}")
    
    # Calculate safety metrics
    safety_metrics = safety_analyzer.calculate_safety_metrics()
    print(f"\nSafety Metrics:")
    print(f"  Safety score: {safety_metrics.safety_score:.1f}/100")
    print(f"  Total violations: {safety_metrics.total_violations}")
    print(f"  Violation rate: {safety_metrics.violation_rate_per_hour:.2f}/hour")
    print(f"  Trend: {safety_metrics.violation_trend}")
    
    # Get violation patterns
    patterns = safety_analyzer.get_violation_patterns()
    print(f"\nViolation Patterns:")
    print(f"  Detected patterns: {len(patterns.get('patterns', []))}")
    print(f"  Key insights: {patterns.get('insights', [])[:2]}")
    
    return safety_analyzer


def demo_pattern_analyzer():
    """Demonstrate PatternAnalyzer capabilities."""
    print("\n=== Pattern Analyzer Demo ===")
    
    pattern_analyzer = PatternAnalyzer()
    
    # Analyze recent performance
    patterns = pattern_analyzer.analyze_recent_performance(episodes=50)
    print(f"Detected {len(patterns)} behavioral patterns")
    
    for pattern in patterns[:3]:  # Show first 3 patterns
        print(f"  - {pattern.pattern_type.value}: {pattern.description}")
        print(f"    Severity: {pattern.severity.value}, Confidence: {pattern.confidence_score:.2f}")
    
    # Get performance trends
    trends = pattern_analyzer.get_performance_trends(episodes=50)
    print(f"\nPerformance Trends:")
    for trend_name, trend_data in trends.items():
        if isinstance(trend_data, dict) and 'direction' in trend_data:
            print(f"  {trend_name}: {trend_data['direction']} "
                  f"(R²: {trend_data.get('r_squared', 0):.3f})")
    
    # Detect anomalies
    anomalies = pattern_analyzer.detect_anomalies("mean_reward", lookback_episodes=30)
    print(f"\nDetected {len(anomalies)} anomalies in reward performance")
    
    # Get pattern summary
    summary = pattern_analyzer.get_pattern_summary()
    print(f"\nPattern Summary:")
    print(f"  Total patterns: {summary['total_patterns']}")
    print(f"  Recent patterns: {summary['recent_patterns']}")
    
    return pattern_analyzer


def demo_report_generator(safety_analyzer, pattern_analyzer):
    """Demonstrate ReportGenerator capabilities."""
    print("\n=== Report Generator Demo ===")
    
    report_generator = ReportGenerator(safety_analyzer, pattern_analyzer)
    
    # Generate daily summary report
    daily_report = report_generator.generate_daily_summary()
    print(f"Generated daily report: {daily_report.report_id}")
    print(f"Overall assessment: {daily_report.overall_assessment}")
    print(f"Executive summary: {daily_report.executive_summary}")
    
    print(f"\nKey findings ({len(daily_report.key_findings)}):")
    for finding in daily_report.key_findings:
        print(f"  - {finding}")
    
    print(f"\nRecommendations ({len(daily_report.recommendations)}):")
    for rec in daily_report.recommendations[:3]:  # Show first 3
        print(f"  - {rec.title} ({rec.priority} priority)")
        print(f"    {rec.description}")
    
    # Generate performance analysis
    perf_report = report_generator.generate_performance_analysis(episodes=100)
    print(f"\nGenerated performance report: {perf_report.report_id}")
    print(f"Assessment: {perf_report.overall_assessment}")
    
    # Generate safety assessment
    safety_report = report_generator.generate_safety_assessment(hours=24)
    print(f"\nGenerated safety report: {safety_report.report_id}")
    print(f"Assessment: {safety_report.overall_assessment}")
    
    # Check for alerts
    alerts = report_generator.get_active_alerts()
    print(f"\nActive alerts: {len(alerts)}")
    for alert in alerts:
        print(f"  - {alert.alert_level.value.upper()}: {alert.title}")
        print(f"    {alert.description}")
    
    return report_generator


def main():
    """Main demonstration function."""
    print("Automated Reasoning Engine Demonstration")
    print("=" * 50)
    
    try:
        # Initialize analyzers
        safety_analyzer = demo_safety_analyzer()
        pattern_analyzer = demo_pattern_analyzer()
        
        # Simulate some training data
        simulate_training_data(safety_analyzer, pattern_analyzer)
        
        # Wait a moment for events to be processed
        time.sleep(1.0)
        
        # Demonstrate report generation
        report_generator = demo_report_generator(safety_analyzer, pattern_analyzer)
        
        print("\n=== Demo Complete ===")
        print("The reasoning engine successfully:")
        print("  ✓ Analyzed safety violations and identified root causes")
        print("  ✓ Detected behavioral patterns and performance trends")
        print("  ✓ Generated automated reports with recommendations")
        print("  ✓ Created alerts for performance degradation")
        
        # Cleanup
        safety_analyzer.shutdown()
        pattern_analyzer.shutdown()
        
    except Exception as e:
        print(f"Demo error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()