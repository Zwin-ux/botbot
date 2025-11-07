"""
Reasoning engine that coordinates all reasoning components.

This module provides a unified interface for automated reasoning capabilities,
coordinating safety analysis, pattern detection, and report generation.
"""

import time
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict

from ..events import EventBus, get_event_bus
from .safety_analyzer import SafetyAnalyzer, SafetyMetrics, get_safety_analyzer
from .pattern_analyzer import PatternAnalyzer, get_pattern_analyzer
from .report_generator import ReportGenerator, AnalysisReport, get_report_generator


class ReasoningEngine:
    """
    Unified reasoning engine coordinating all analysis components.
    
    This class provides a high-level interface for automated reasoning,
    coordinating safety analysis, pattern detection, and report generation.
    """
    
    def __init__(self, decision_tracker=None, event_bus: Optional[EventBus] = None):
        """
        Initialize the reasoning engine.
        
        Args:
            decision_tracker: Decision tracker instance (optional)
            event_bus: Event bus instance (uses global if None)
        """
        self.event_bus = event_bus or get_event_bus()
        
        # Initialize reasoning components
        self.safety_analyzer = get_safety_analyzer()
        self.pattern_analyzer = get_pattern_analyzer()
        self.report_generator = get_report_generator()
        
        print("ReasoningEngine initialized")
    
    def analyze_episode(self, episode_data: Dict[str, Any]) -> AnalysisReport:
        """
        Perform comprehensive analysis of an episode.
        
        Args:
            episode_data: Episode data including rewards, violations, etc.
            
        Returns:
            Analysis report with findings and recommendations
        """
        episode_id = episode_data.get('episode_id', 'unknown')
        
        # Analyze safety metrics
        safety_metrics = self.safety_analyzer.calculate_safety_metrics()
        
        # Detect patterns
        patterns = self.pattern_analyzer.detect_patterns()
        
        # Generate report
        report = self.report_generator.generate_episode_report(
            episode_id=episode_id,
            episode_data=episode_data,
            safety_metrics=safety_metrics,
            patterns=patterns
        )
        
        return report
    
    def get_safety_metrics(self) -> Dict[str, Any]:
        """
        Get current safety metrics.
        
        Returns:
            Dictionary of safety metrics
        """
        metrics = self.safety_analyzer.calculate_safety_metrics()
        return asdict(metrics)
    
    def get_performance_patterns(self) -> Dict[str, Any]:
        """
        Get detected performance patterns.
        
        Returns:
            Dictionary of performance patterns
        """
        return self.pattern_analyzer.get_pattern_summary()
    
    def generate_recommendations(self) -> List[str]:
        """
        Generate recommendations based on current analysis.
        
        Returns:
            List of recommendation strings
        """
        # Get safety metrics
        safety_metrics = self.safety_analyzer.calculate_safety_metrics()
        
        # Get patterns
        patterns = self.pattern_analyzer.detect_patterns()
        
        # Generate recommendations
        recommendations = self.report_generator.generate_recommendations(
            safety_metrics=safety_metrics,
            patterns=patterns
        )
        
        return [rec.description for rec in recommendations]
    
    def shutdown(self) -> None:
        """Shutdown the reasoning engine and cleanup resources."""
        if self.safety_analyzer:
            self.safety_analyzer.shutdown()
        
        print("ReasoningEngine shutdown complete")


# Global reasoning engine instance
_global_reasoning_engine: Optional[ReasoningEngine] = None


def get_reasoning_engine() -> ReasoningEngine:
    """Get the global reasoning engine instance."""
    global _global_reasoning_engine
    if _global_reasoning_engine is None:
        _global_reasoning_engine = ReasoningEngine()
    return _global_reasoning_engine


def set_reasoning_engine(engine: ReasoningEngine) -> None:
    """Set the global reasoning engine instance."""
    global _global_reasoning_engine
    if _global_reasoning_engine is not None:
        _global_reasoning_engine.shutdown()
    _global_reasoning_engine = engine


def shutdown_reasoning_engine() -> None:
    """Shutdown the global reasoning engine."""
    global _global_reasoning_engine
    if _global_reasoning_engine is not None:
        _global_reasoning_engine.shutdown()
        _global_reasoning_engine = None
