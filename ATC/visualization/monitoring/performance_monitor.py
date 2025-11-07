"""
Performance monitoring system for continuous metric tracking and system health.

This module provides the PerformanceMonitor class for tracking training metrics,
system resource utilization, and maintaining historical performance data.
"""

import time
import psutil
import threading
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional, Tuple
from collections import deque, defaultdict
from datetime import datetime, timedelta
import json
import os

from ..events import EventBus, get_event_bus
from ..events.event_data import EventData, EventType


@dataclass
class MetricSnapshot:
    """Snapshot of metrics at a specific point in time."""
    
    timestamp: float
    metrics: Dict[str, float]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return asdict(self)


@dataclass
class SystemHealth:
    """System resource utilization snapshot."""
    
    timestamp: float
    cpu_percent: float
    memory_percent: float
    memory_used_gb: float
    memory_available_gb: float
    disk_usage_percent: float
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return asdict(self)


@dataclass
class TrendData:
    """Trend analysis data for a metric."""
    
    metric_name: str
    start_time: float
    end_time: float
    values: List[float]
    timestamps: List[float]
    
    # Trend statistics
    mean: float
    std: float
    min_value: float
    max_value: float
    trend_direction: str  # "increasing", "decreasing", "stable"
    trend_strength: float  # 0-1 scale
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return asdict(self)


class PerformanceMonitor:
    """
    Continuous performance monitoring system for training metrics and system health.
    
    This class tracks training metrics, system resource utilization, and provides
    historical data storage with trend analysis capabilities.
    """
    
    def __init__(self, event_bus: Optional[EventBus] = None,
                 storage_path: Optional[str] = None,
                 retention_days: int = 30):
        """
        Initialize the performance monitor.
        
        Args:
            event_bus: Event bus instance (uses global if None)
            storage_path: Path for metric storage (defaults to ./monitoring_data)
            retention_days: Number of days to retain historical data
        """
        self.event_bus = event_bus or get_event_bus()
        self.storage_path = storage_path or "./monitoring_data"
        self.retention_days = retention_days
        
        # Create storage directory
        os.makedirs(self.storage_path, exist_ok=True)
        
        # Metric storage
        self._metrics: deque = deque(maxlen=10000)  # Keep last 10000 metric snapshots
        self._system_health: deque = deque(maxlen=1000)  # Keep last 1000 health snapshots
        self._lock = threading.RLock()
        
        # Metric aggregation
        self._current_episode_metrics: Dict[str, List[float]] = defaultdict(list)
        self._episode_count = 0
        
        # Monitoring state
        self._monitoring_active = False
        self._monitor_thread: Optional[threading.Thread] = None
        self._shutdown_event = threading.Event()
        
        # Subscribe to training events
        self._iteration_subscription = self.event_bus.subscribe(
            EventType.TRAINING_ITERATION,
            self._handle_training_iteration
        )
        
        self._step_subscription = self.event_bus.subscribe(
            EventType.ENV_STEP,
            self._handle_env_step
        )
        
        print(f"PerformanceMonitor initialized with storage at {self.storage_path}")
    
    def start_monitoring(self, interval_seconds: float = 60.0) -> None:
        """
        Start continuous system health monitoring.
        
        Args:
            interval_seconds: Interval between health checks
        """
        if self._monitoring_active:
            print("Monitoring already active")
            return
        
        self._monitoring_active = True
        self._shutdown_event.clear()
        
        def monitor_loop():
            while not self._shutdown_event.is_set():
                try:
                    self._collect_system_health()
                except Exception as e:
                    print(f"Warning: Error collecting system health: {e}")
                
                # Wait for interval or shutdown
                self._shutdown_event.wait(interval_seconds)
        
        self._monitor_thread = threading.Thread(target=monitor_loop, daemon=True)
        self._monitor_thread.start()
        
        print(f"System health monitoring started (interval: {interval_seconds}s)")
    
    def stop_monitoring(self) -> None:
        """Stop continuous system health monitoring."""
        if not self._monitoring_active:
            return
        
        self._monitoring_active = False
        self._shutdown_event.set()
        
        if self._monitor_thread:
            self._monitor_thread.join(timeout=5.0)
            self._monitor_thread = None
        
        print("System health monitoring stopped")
    
    def track_metrics(self, metrics: Dict[str, float]) -> None:
        """
        Track a set of performance metrics.
        
        Args:
            metrics: Dictionary of metric name to value
        """
        timestamp = time.time()
        
        snapshot = MetricSnapshot(
            timestamp=timestamp,
            metrics=metrics.copy()
        )
        
        with self._lock:
            self._metrics.append(snapshot)
            
            # Add to current episode aggregation
            for metric_name, value in metrics.items():
                self._current_episode_metrics[metric_name].append(value)
        
        # Persist to storage periodically
        if len(self._metrics) % 100 == 0:
            self._persist_metrics()
    
    def get_current_metrics(self) -> Dict[str, float]:
        """
        Get the most recent metric values.
        
        Returns:
            Dictionary of current metric values
        """
        with self._lock:
            if not self._metrics:
                return {}
            
            return self._metrics[-1].metrics.copy()
    
    def get_metric_history(self, metric_name: str, 
                          start_time: Optional[float] = None,
                          end_time: Optional[float] = None) -> List[Tuple[float, float]]:
        """
        Get historical values for a specific metric.
        
        Args:
            metric_name: Name of the metric
            start_time: Start timestamp (optional)
            end_time: End timestamp (optional)
            
        Returns:
            List of (timestamp, value) tuples
        """
        with self._lock:
            history = []
            
            for snapshot in self._metrics:
                # Filter by time range
                if start_time and snapshot.timestamp < start_time:
                    continue
                if end_time and snapshot.timestamp > end_time:
                    continue
                
                # Get metric value if present
                if metric_name in snapshot.metrics:
                    history.append((snapshot.timestamp, snapshot.metrics[metric_name]))
            
            return history
    
    def get_trend_analysis(self, metric_name: str, days: int = 7) -> TrendData:
        """
        Get trend analysis for a specific metric.
        
        Args:
            metric_name: Name of the metric to analyze
            days: Number of days to analyze
            
        Returns:
            Trend analysis data
        """
        end_time = time.time()
        start_time = end_time - (days * 86400)  # Convert days to seconds
        
        # Get metric history
        history = self.get_metric_history(metric_name, start_time, end_time)
        
        if not history:
            return TrendData(
                metric_name=metric_name,
                start_time=start_time,
                end_time=end_time,
                values=[],
                timestamps=[],
                mean=0.0,
                std=0.0,
                min_value=0.0,
                max_value=0.0,
                trend_direction="unknown",
                trend_strength=0.0
            )
        
        timestamps, values = zip(*history)
        timestamps = list(timestamps)
        values = list(values)
        
        # Calculate statistics
        import numpy as np
        values_array = np.array(values)
        
        mean_val = float(np.mean(values_array))
        std_val = float(np.std(values_array))
        min_val = float(np.min(values_array))
        max_val = float(np.max(values_array))
        
        # Calculate trend
        if len(values) > 1:
            # Simple linear regression
            x = np.arange(len(values))
            coeffs = np.polyfit(x, values_array, 1)
            slope = coeffs[0]
            
            # Normalize slope by value range
            value_range = max_val - min_val
            if value_range > 0:
                normalized_slope = abs(slope * len(values)) / value_range
                trend_strength = min(normalized_slope, 1.0)
            else:
                trend_strength = 0.0
            
            # Determine direction
            if abs(slope) < std_val * 0.1:  # Slope is small relative to noise
                trend_direction = "stable"
            elif slope > 0:
                trend_direction = "increasing"
            else:
                trend_direction = "decreasing"
        else:
            trend_direction = "stable"
            trend_strength = 0.0
        
        return TrendData(
            metric_name=metric_name,
            start_time=start_time,
            end_time=end_time,
            values=values,
            timestamps=timestamps,
            mean=mean_val,
            std=std_val,
            min_value=min_val,
            max_value=max_val,
            trend_direction=trend_direction,
            trend_strength=trend_strength
        )
    
    def get_system_health(self) -> SystemHealth:
        """
        Get current system health status.
        
        Returns:
            Current system health snapshot
        """
        return self._collect_system_health()
    
    def get_system_health_history(self, hours: int = 24) -> List[SystemHealth]:
        """
        Get system health history.
        
        Args:
            hours: Number of hours of history to retrieve
            
        Returns:
            List of system health snapshots
        """
        cutoff_time = time.time() - (hours * 3600)
        
        with self._lock:
            return [
                health for health in self._system_health
                if health.timestamp >= cutoff_time
            ]
    
    def get_all_metric_names(self) -> List[str]:
        """
        Get list of all tracked metric names.
        
        Returns:
            List of metric names
        """
        with self._lock:
            metric_names = set()
            
            for snapshot in self._metrics:
                metric_names.update(snapshot.metrics.keys())
            
            return sorted(list(metric_names))
    
    def get_summary_statistics(self, hours: int = 24) -> Dict[str, Dict[str, float]]:
        """
        Get summary statistics for all metrics over a time period.
        
        Args:
            hours: Number of hours to summarize
            
        Returns:
            Dictionary mapping metric names to their statistics
        """
        cutoff_time = time.time() - (hours * 3600)
        
        # Collect metrics by name
        metrics_by_name: Dict[str, List[float]] = defaultdict(list)
        
        with self._lock:
            for snapshot in self._metrics:
                if snapshot.timestamp >= cutoff_time:
                    for metric_name, value in snapshot.metrics.items():
                        metrics_by_name[metric_name].append(value)
        
        # Calculate statistics
        import numpy as np
        summary = {}
        
        for metric_name, values in metrics_by_name.items():
            if values:
                values_array = np.array(values)
                summary[metric_name] = {
                    "mean": float(np.mean(values_array)),
                    "std": float(np.std(values_array)),
                    "min": float(np.min(values_array)),
                    "max": float(np.max(values_array)),
                    "median": float(np.median(values_array)),
                    "count": len(values)
                }
        
        return summary
    
    def export_metrics(self, filepath: str, 
                      start_time: Optional[float] = None,
                      end_time: Optional[float] = None) -> None:
        """
        Export metrics to a JSON file.
        
        Args:
            filepath: Path to export file
            start_time: Start timestamp (optional)
            end_time: End timestamp (optional)
        """
        with self._lock:
            # Filter metrics by time range
            filtered_metrics = []
            
            for snapshot in self._metrics:
                if start_time and snapshot.timestamp < start_time:
                    continue
                if end_time and snapshot.timestamp > end_time:
                    continue
                
                filtered_metrics.append(snapshot.to_dict())
        
        # Write to file
        with open(filepath, 'w') as f:
            json.dump({
                "export_time": time.time(),
                "start_time": start_time,
                "end_time": end_time,
                "metric_count": len(filtered_metrics),
                "metrics": filtered_metrics
            }, f, indent=2)
        
        print(f"Exported {len(filtered_metrics)} metric snapshots to {filepath}")
    
    def cleanup_old_data(self) -> None:
        """Remove data older than retention period."""
        cutoff_time = time.time() - (self.retention_days * 86400)
        
        with self._lock:
            # Metrics are already limited by deque maxlen
            # Just clean up persisted files
            self._cleanup_old_files(cutoff_time)
        
        print(f"Cleaned up data older than {self.retention_days} days")
    
    def _collect_system_health(self) -> SystemHealth:
        """Collect current system health metrics."""
        try:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            health = SystemHealth(
                timestamp=time.time(),
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                memory_used_gb=memory.used / (1024 ** 3),
                memory_available_gb=memory.available / (1024 ** 3),
                disk_usage_percent=disk.percent
            )
            
            with self._lock:
                self._system_health.append(health)
            
            return health
            
        except Exception as e:
            print(f"Warning: Error collecting system health: {e}")
            return SystemHealth(
                timestamp=time.time(),
                cpu_percent=0.0,
                memory_percent=0.0,
                memory_used_gb=0.0,
                memory_available_gb=0.0,
                disk_usage_percent=0.0
            )
    
    def _persist_metrics(self) -> None:
        """Persist metrics to storage."""
        try:
            # Create daily file
            date_str = datetime.now().strftime("%Y-%m-%d")
            filepath = os.path.join(self.storage_path, f"metrics_{date_str}.json")
            
            # Append to daily file
            with self._lock:
                recent_metrics = list(self._metrics)[-100:]  # Last 100 snapshots
            
            data_to_write = [m.to_dict() for m in recent_metrics]
            
            # Read existing data if file exists
            existing_data = []
            if os.path.exists(filepath):
                try:
                    with open(filepath, 'r') as f:
                        file_data = json.load(f)
                        existing_data = file_data.get("metrics", [])
                except:
                    pass
            
            # Merge and write
            all_data = existing_data + data_to_write
            
            with open(filepath, 'w') as f:
                json.dump({
                    "date": date_str,
                    "last_updated": time.time(),
                    "metric_count": len(all_data),
                    "metrics": all_data
                }, f)
            
        except Exception as e:
            print(f"Warning: Error persisting metrics: {e}")
    
    def _cleanup_old_files(self, cutoff_time: float) -> None:
        """Clean up old metric files."""
        try:
            cutoff_date = datetime.fromtimestamp(cutoff_time)
            
            for filename in os.listdir(self.storage_path):
                if filename.startswith("metrics_") and filename.endswith(".json"):
                    filepath = os.path.join(self.storage_path, filename)
                    
                    # Get file modification time
                    file_time = os.path.getmtime(filepath)
                    
                    if file_time < cutoff_time:
                        os.remove(filepath)
                        print(f"Removed old metric file: {filename}")
        
        except Exception as e:
            print(f"Warning: Error cleaning up old files: {e}")
    
    def _handle_training_iteration(self, event: EventData) -> None:
        """Handle training iteration events."""
        try:
            data = event.data
            metrics = data.get("metrics", {})
            
            # Add standard iteration metrics
            iteration_metrics = {
                "iteration": data.get("iteration", 0),
                "episode_reward_mean": data.get("episode_reward_mean", 0.0),
                "episode_len_mean": data.get("episode_len_mean", 0.0),
            }
            
            # Merge with additional metrics
            iteration_metrics.update(metrics)
            
            # Track metrics
            self.track_metrics(iteration_metrics)
            
            self._episode_count += 1
            
        except Exception as e:
            print(f"Warning: Error handling training iteration: {e}")
    
    def _handle_env_step(self, event: EventData) -> None:
        """Handle environment step events for detailed tracking."""
        try:
            data = event.data
            
            # Track step-level metrics
            step_metrics = {
                "step_reward": data.get("reward", 0.0),
                "step_done": 1.0 if data.get("done", False) else 0.0,
            }
            
            # Add info metrics if available
            info = data.get("info", {})
            for key, value in info.items():
                if isinstance(value, (int, float)):
                    step_metrics[f"info_{key}"] = float(value)
            
            # Track metrics (but don't persist every step)
            with self._lock:
                for metric_name, value in step_metrics.items():
                    self._current_episode_metrics[metric_name].append(value)
        
        except Exception as e:
            print(f"Warning: Error handling env step: {e}")
    
    def shutdown(self) -> None:
        """Shutdown the performance monitor and cleanup resources."""
        self.stop_monitoring()
        
        # Persist remaining metrics
        self._persist_metrics()
        
        # Unsubscribe from events
        if self._iteration_subscription:
            self.event_bus.unsubscribe(self._iteration_subscription)
            self._iteration_subscription = None
        
        if self._step_subscription:
            self.event_bus.unsubscribe(self._step_subscription)
            self._step_subscription = None
        
        print("PerformanceMonitor shutdown complete")


# Global performance monitor instance
_global_performance_monitor: Optional[PerformanceMonitor] = None


def get_performance_monitor() -> PerformanceMonitor:
    """Get the global performance monitor instance."""
    global _global_performance_monitor
    if _global_performance_monitor is None:
        _global_performance_monitor = PerformanceMonitor()
    return _global_performance_monitor


def set_performance_monitor(monitor: PerformanceMonitor) -> None:
    """Set the global performance monitor instance."""
    global _global_performance_monitor
    if _global_performance_monitor is not None:
        _global_performance_monitor.shutdown()
    _global_performance_monitor = monitor


def shutdown_performance_monitor() -> None:
    """Shutdown the global performance monitor."""
    global _global_performance_monitor
    if _global_performance_monitor is not None:
        _global_performance_monitor.shutdown()
        _global_performance_monitor = None
