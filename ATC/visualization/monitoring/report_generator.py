"""
Automated report generation system for training progress and performance analysis.

This module provides daily report generation with trend analysis, performance summaries,
and optional email notification capabilities.
"""

import time
import threading
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict
import json
import os

from .performance_monitor import PerformanceMonitor, get_performance_monitor
from ..reasoning.safety_analyzer import SafetyAnalyzer, get_safety_analyzer
from ..reasoning.pattern_analyzer import PatternAnalyzer, get_pattern_analyzer


@dataclass
class DailyReport:
    """Daily training progress and performance report."""
    
    # Report metadata
    report_id: str
    generation_time: float
    report_date: str
    period_start: float
    period_end: float
    
    # Training summary
    total_iterations: int
    total_episodes: int
    training_hours: float
    
    # Performance metrics
    mean_reward: float
    reward_trend: str  # "improving", "stable", "declining"
    reward_change_percent: float
    
    # Safety metrics
    total_violations: int
    violation_rate_per_hour: float
    safety_score: float
    safety_trend: str
    
    # System health
    avg_cpu_percent: float
    avg_memory_percent: float
    max_memory_used_gb: float
    
    # Detected patterns
    patterns_detected: int
    critical_patterns: int
    pattern_summary: List[Dict[str, Any]]
    
    # Recommendations
    recommendations: List[str]
    alerts: List[str]
    
    # Detailed sections
    metric_summaries: Dict[str, Dict[str, float]]
    trend_analysis: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return asdict(self)
    
    def to_text(self) -> str:
        """Generate human-readable text report."""
        lines = []
        lines.append("=" * 80)
        lines.append(f"DAILY TRAINING REPORT - {self.report_date}")
        lines.append("=" * 80)
        lines.append("")
        
        # Training Summary
        lines.append("TRAINING SUMMARY")
        lines.append("-" * 80)
        lines.append(f"  Training Duration: {self.training_hours:.2f} hours")
        lines.append(f"  Total Iterations: {self.total_iterations}")
        lines.append(f"  Total Episodes: {self.total_episodes}")
        lines.append("")
        
        # Performance Metrics
        lines.append("PERFORMANCE METRICS")
        lines.append("-" * 80)
        lines.append(f"  Mean Reward: {self.mean_reward:.3f}")
        lines.append(f"  Reward Trend: {self.reward_trend.upper()} ({self.reward_change_percent:+.1f}%)")
        lines.append("")
        
        # Safety Metrics
        lines.append("SAFETY METRICS")
        lines.append("-" * 80)
        lines.append(f"  Total Violations: {self.total_violations}")
        lines.append(f"  Violation Rate: {self.violation_rate_per_hour:.2f} per hour")
        lines.append(f"  Safety Score: {self.safety_score:.1f}/100")
        lines.append(f"  Safety Trend: {self.safety_trend.upper()}")
        lines.append("")
        
        # System Health
        lines.append("SYSTEM HEALTH")
        lines.append("-" * 80)
        lines.append(f"  Average CPU Usage: {self.avg_cpu_percent:.1f}%")
        lines.append(f"  Average Memory Usage: {self.avg_memory_percent:.1f}%")
        lines.append(f"  Peak Memory Used: {self.max_memory_used_gb:.2f} GB")
        lines.append("")
        
        # Patterns
        if self.patterns_detected > 0:
            lines.append("DETECTED PATTERNS")
            lines.append("-" * 80)
            lines.append(f"  Total Patterns: {self.patterns_detected}")
            lines.append(f"  Critical Patterns: {self.critical_patterns}")
            
            if self.pattern_summary:
                lines.append("")
                lines.append("  Key Patterns:")
                for pattern in self.pattern_summary[:5]:  # Top 5 patterns
                    lines.append(f"    - {pattern.get('type', 'unknown')}: {pattern.get('description', 'N/A')}")
            lines.append("")
        
        # Alerts
        if self.alerts:
            lines.append("ALERTS")
            lines.append("-" * 80)
            for alert in self.alerts:
                lines.append(f"  ⚠ {alert}")
            lines.append("")
        
        # Recommendations
        if self.recommendations:
            lines.append("RECOMMENDATIONS")
            lines.append("-" * 80)
            for i, rec in enumerate(self.recommendations, 1):
                lines.append(f"  {i}. {rec}")
            lines.append("")
        
        lines.append("=" * 80)
        lines.append(f"Report generated at {datetime.fromtimestamp(self.generation_time).strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("=" * 80)
        
        return "\n".join(lines)


class ReportGenerator:
    """
    Automated report generation system for training progress and analysis.
    
    This class generates daily reports with training summaries, trend analysis,
    and performance recommendations.
    """
    
    def __init__(self, performance_monitor: Optional[PerformanceMonitor] = None,
                 safety_analyzer: Optional[SafetyAnalyzer] = None,
                 pattern_analyzer: Optional[PatternAnalyzer] = None,
                 report_storage_path: Optional[str] = None):
        """
        Initialize the report generator.
        
        Args:
            performance_monitor: Performance monitor instance
            safety_analyzer: Safety analyzer instance
            pattern_analyzer: Pattern analyzer instance
            report_storage_path: Path for storing generated reports
        """
        self.performance_monitor = performance_monitor or get_performance_monitor()
        self.safety_analyzer = safety_analyzer or get_safety_analyzer()
        self.pattern_analyzer = pattern_analyzer or get_pattern_analyzer()
        
        self.report_storage_path = report_storage_path or "./reports"
        os.makedirs(self.report_storage_path, exist_ok=True)
        
        # Report generation state
        self._report_count = 0
        self._last_report_time: Optional[float] = None
        self._scheduled_reports: List[Tuple[float, str]] = []
        
        # Automated scheduling
        self._scheduler_active = False
        self._scheduler_thread: Optional[threading.Thread] = None
        self._shutdown_event = threading.Event()
        
        print(f"ReportGenerator initialized with storage at {self.report_storage_path}")
    
    def generate_daily_report(self, date: Optional[datetime] = None) -> DailyReport:
        """
        Generate a daily training report.
        
        Args:
            date: Date for the report (defaults to today)
            
        Returns:
            Generated daily report
        """
        if date is None:
            date = datetime.now()
        
        # Calculate time period (24 hours ending at report time)
        period_end = time.time()
        period_start = period_end - 86400  # 24 hours
        
        report_date_str = date.strftime("%Y-%m-%d")
        
        print(f"Generating daily report for {report_date_str}...")
        
        # Collect training metrics
        training_summary = self._collect_training_summary(period_start, period_end)
        
        # Collect performance metrics
        performance_summary = self._collect_performance_summary(period_start, period_end)
        
        # Collect safety metrics
        safety_summary = self._collect_safety_summary(period_start, period_end)
        
        # Collect system health
        health_summary = self._collect_health_summary(period_start, period_end)
        
        # Analyze patterns
        pattern_summary = self._collect_pattern_summary()
        
        # Generate recommendations and alerts
        recommendations = self._generate_recommendations(
            training_summary, performance_summary, safety_summary, pattern_summary
        )
        alerts = self._generate_alerts(
            training_summary, performance_summary, safety_summary, health_summary
        )
        
        # Create report
        report = DailyReport(
            report_id=f"daily_{report_date_str}_{int(time.time())}",
            generation_time=time.time(),
            report_date=report_date_str,
            period_start=period_start,
            period_end=period_end,
            total_iterations=training_summary.get("total_iterations", 0),
            total_episodes=training_summary.get("total_episodes", 0),
            training_hours=training_summary.get("training_hours", 0.0),
            mean_reward=performance_summary.get("mean_reward", 0.0),
            reward_trend=performance_summary.get("reward_trend", "unknown"),
            reward_change_percent=performance_summary.get("reward_change_percent", 0.0),
            total_violations=safety_summary.get("total_violations", 0),
            violation_rate_per_hour=safety_summary.get("violation_rate_per_hour", 0.0),
            safety_score=safety_summary.get("safety_score", 100.0),
            safety_trend=safety_summary.get("safety_trend", "unknown"),
            avg_cpu_percent=health_summary.get("avg_cpu_percent", 0.0),
            avg_memory_percent=health_summary.get("avg_memory_percent", 0.0),
            max_memory_used_gb=health_summary.get("max_memory_used_gb", 0.0),
            patterns_detected=pattern_summary.get("total_patterns", 0),
            critical_patterns=pattern_summary.get("critical_patterns", 0),
            pattern_summary=pattern_summary.get("pattern_details", []),
            recommendations=recommendations,
            alerts=alerts,
            metric_summaries=performance_summary.get("metric_summaries", {}),
            trend_analysis=performance_summary.get("trend_analysis", {})
        )
        
        # Save report
        self._save_report(report)
        
        self._report_count += 1
        self._last_report_time = time.time()
        
        print(f"Daily report generated: {report.report_id}")
        
        return report
    
    def schedule_daily_reports(self, hour: int = 0, minute: int = 0) -> None:
        """
        Schedule automatic daily report generation.
        
        Args:
            hour: Hour of day for report generation (0-23)
            minute: Minute of hour for report generation (0-59)
        """
        if self._scheduler_active:
            print("Report scheduler already active")
            return
        
        self._scheduler_active = True
        self._shutdown_event.clear()
        
        def scheduler_loop():
            while not self._shutdown_event.is_set():
                try:
                    # Calculate next report time
                    now = datetime.now()
                    next_report = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
                    
                    # If time has passed today, schedule for tomorrow
                    if next_report <= now:
                        next_report += timedelta(days=1)
                    
                    # Wait until next report time
                    wait_seconds = (next_report - datetime.now()).total_seconds()
                    
                    print(f"Next daily report scheduled for {next_report.strftime('%Y-%m-%d %H:%M:%S')}")
                    
                    if self._shutdown_event.wait(wait_seconds):
                        break  # Shutdown requested
                    
                    # Generate report
                    try:
                        report = self.generate_daily_report()
                        print(f"Scheduled daily report generated: {report.report_id}")
                    except Exception as e:
                        print(f"Error generating scheduled report: {e}")
                
                except Exception as e:
                    print(f"Error in report scheduler: {e}")
                    self._shutdown_event.wait(3600)  # Wait 1 hour before retry
        
        self._scheduler_thread = threading.Thread(target=scheduler_loop, daemon=True)
        self._scheduler_thread.start()
        
        print(f"Daily report scheduler started (time: {hour:02d}:{minute:02d})")
    
    def stop_scheduler(self) -> None:
        """Stop the automated report scheduler."""
        if not self._scheduler_active:
            return
        
        self._scheduler_active = False
        self._shutdown_event.set()
        
        if self._scheduler_thread:
            self._scheduler_thread.join(timeout=5.0)
            self._scheduler_thread = None
        
        print("Report scheduler stopped")
    
    def get_report_history(self, days: int = 7) -> List[DailyReport]:
        """
        Get historical reports.
        
        Args:
            days: Number of days of history to retrieve
            
        Returns:
            List of daily reports
        """
        reports = []
        cutoff_date = datetime.now() - timedelta(days=days)
        
        try:
            for filename in os.listdir(self.report_storage_path):
                if filename.startswith("daily_") and filename.endswith(".json"):
                    filepath = os.path.join(self.report_storage_path, filename)
                    
                    # Check file date
                    file_time = os.path.getmtime(filepath)
                    if datetime.fromtimestamp(file_time) < cutoff_date:
                        continue
                    
                    # Load report
                    with open(filepath, 'r') as f:
                        report_data = json.load(f)
                        # Reconstruct DailyReport (simplified)
                        reports.append(report_data)
        
        except Exception as e:
            print(f"Warning: Error loading report history: {e}")
        
        return reports
    
    def _collect_training_summary(self, start_time: float, end_time: float) -> Dict[str, Any]:
        """Collect training summary metrics."""
        summary = {}
        
        # Get iteration count from performance monitor
        iteration_history = self.performance_monitor.get_metric_history("iteration", start_time, end_time)
        
        if iteration_history:
            iterations = [value for _, value in iteration_history]
            summary["total_iterations"] = int(max(iterations) - min(iterations)) if len(iterations) > 1 else len(iterations)
            summary["total_episodes"] = len(iterations)
        else:
            summary["total_iterations"] = 0
            summary["total_episodes"] = 0
        
        summary["training_hours"] = (end_time - start_time) / 3600.0
        
        return summary
    
    def _collect_performance_summary(self, start_time: float, end_time: float) -> Dict[str, Any]:
        """Collect performance summary metrics."""
        summary = {}
        
        # Get reward metrics
        reward_history = self.performance_monitor.get_metric_history("episode_reward_mean", start_time, end_time)
        
        if reward_history:
            rewards = [value for _, value in reward_history]
            summary["mean_reward"] = sum(rewards) / len(rewards)
            
            # Calculate trend
            if len(rewards) > 10:
                first_half = rewards[:len(rewards)//2]
                second_half = rewards[len(rewards)//2:]
                
                first_mean = sum(first_half) / len(first_half)
                second_mean = sum(second_half) / len(second_half)
                
                change = second_mean - first_mean
                change_percent = (change / abs(first_mean)) * 100 if first_mean != 0 else 0.0
                
                summary["reward_change_percent"] = change_percent
                
                if change_percent > 5:
                    summary["reward_trend"] = "improving"
                elif change_percent < -5:
                    summary["reward_trend"] = "declining"
                else:
                    summary["reward_trend"] = "stable"
            else:
                summary["reward_trend"] = "insufficient_data"
                summary["reward_change_percent"] = 0.0
        else:
            summary["mean_reward"] = 0.0
            summary["reward_trend"] = "no_data"
            summary["reward_change_percent"] = 0.0
        
        # Get metric summaries
        summary["metric_summaries"] = self.performance_monitor.get_summary_statistics(hours=24)
        
        # Get trend analysis for key metrics
        summary["trend_analysis"] = {}
        for metric_name in ["episode_reward_mean", "episode_len_mean"]:
            try:
                trend = self.performance_monitor.get_trend_analysis(metric_name, days=1)
                summary["trend_analysis"][metric_name] = trend.to_dict()
            except:
                pass
        
        return summary
    
    def _collect_safety_summary(self, start_time: float, end_time: float) -> Dict[str, Any]:
        """Collect safety summary metrics."""
        summary = {}
        
        # Get safety metrics from safety analyzer
        safety_metrics = self.safety_analyzer.calculate_safety_metrics(start_time, end_time)
        
        summary["total_violations"] = safety_metrics.total_violations
        summary["violation_rate_per_hour"] = safety_metrics.violation_rate_per_hour
        summary["safety_score"] = safety_metrics.safety_score
        summary["safety_trend"] = safety_metrics.violation_trend
        
        return summary
    
    def _collect_health_summary(self, start_time: float, end_time: float) -> Dict[str, Any]:
        """Collect system health summary."""
        summary = {}
        
        # Get system health history
        health_history = self.performance_monitor.get_system_health_history(hours=24)
        
        if health_history:
            cpu_values = [h.cpu_percent for h in health_history]
            memory_values = [h.memory_percent for h in health_history]
            memory_used = [h.memory_used_gb for h in health_history]
            
            summary["avg_cpu_percent"] = sum(cpu_values) / len(cpu_values)
            summary["avg_memory_percent"] = sum(memory_values) / len(memory_values)
            summary["max_memory_used_gb"] = max(memory_used)
        else:
            summary["avg_cpu_percent"] = 0.0
            summary["avg_memory_percent"] = 0.0
            summary["max_memory_used_gb"] = 0.0
        
        return summary
    
    def _collect_pattern_summary(self) -> Dict[str, Any]:
        """Collect pattern analysis summary."""
        pattern_summary = self.pattern_analyzer.get_pattern_summary()
        
        # Count critical patterns
        critical_count = pattern_summary.get("patterns_by_severity", {}).get("critical", 0)
        
        return {
            "total_patterns": pattern_summary.get("total_patterns", 0),
            "critical_patterns": critical_count,
            "pattern_details": pattern_summary.get("recent_pattern_details", [])
        }
    
    def _generate_recommendations(self, training_summary: Dict, performance_summary: Dict,
                                 safety_summary: Dict, pattern_summary: Dict) -> List[str]:
        """Generate recommendations based on analysis."""
        recommendations = []
        
        # Performance recommendations
        if performance_summary.get("reward_trend") == "declining":
            recommendations.append("Reward is declining - consider reducing learning rate or adjusting reward function")
        elif performance_summary.get("reward_trend") == "stable" and training_summary.get("total_iterations", 0) > 100:
            recommendations.append("Reward has plateaued - consider curriculum learning or exploration adjustments")
        
        # Safety recommendations
        if safety_summary.get("violation_rate_per_hour", 0) > 1.0:
            recommendations.append("High violation rate - increase safety penalty weights in reward function")
        
        if safety_summary.get("safety_score", 100) < 70:
            recommendations.append("Low safety score - review controller behavior and increase safety constraints")
        
        # Pattern-based recommendations
        if pattern_summary.get("critical_patterns", 0) > 0:
            recommendations.append("Critical behavioral patterns detected - review pattern analysis for details")
        
        # Default recommendation if none generated
        if not recommendations:
            recommendations.append("Training progressing normally - continue monitoring performance")
        
        return recommendations
    
    def _generate_alerts(self, training_summary: Dict, performance_summary: Dict,
                        safety_summary: Dict, health_summary: Dict) -> List[str]:
        """Generate alerts for critical issues."""
        alerts = []
        
        # Performance alerts
        if performance_summary.get("reward_change_percent", 0) < -20:
            alerts.append("CRITICAL: Reward has dropped by more than 20%")
        
        # Safety alerts
        if safety_summary.get("safety_score", 100) < 50:
            alerts.append("CRITICAL: Safety score below 50 - immediate attention required")
        
        if safety_summary.get("violation_rate_per_hour", 0) > 5.0:
            alerts.append("WARNING: High violation rate detected")
        
        # System health alerts
        if health_summary.get("avg_memory_percent", 0) > 90:
            alerts.append("WARNING: High memory usage - consider reducing batch size or worker count")
        
        if health_summary.get("avg_cpu_percent", 0) > 95:
            alerts.append("WARNING: High CPU usage - system may be overloaded")
        
        return alerts
    
    def _save_report(self, report: DailyReport) -> None:
        """Save report to storage."""
        try:
            # Save JSON version
            json_path = os.path.join(self.report_storage_path, f"{report.report_id}.json")
            with open(json_path, 'w') as f:
                json.dump(report.to_dict(), f, indent=2)
            
            # Save text version
            text_path = os.path.join(self.report_storage_path, f"{report.report_id}.txt")
            with open(text_path, 'w') as f:
                f.write(report.to_text())
            
            print(f"Report saved to {self.report_storage_path}")
        
        except Exception as e:
            print(f"Warning: Error saving report: {e}")
    
    def shutdown(self) -> None:
        """Shutdown the report generator."""
        self.stop_scheduler()
        print("ReportGenerator shutdown complete")


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
    if _global_report_generator is not None:
        _global_report_generator.shutdown()
    _global_report_generator = generator


def shutdown_report_generator() -> None:
    """Shutdown the global report generator."""
    global _global_report_generator
    if _global_report_generator is not None:
        _global_report_generator.shutdown()
        _global_report_generator = None
