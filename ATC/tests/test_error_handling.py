"""
Test error handling and graceful degradation of the integrated system.

This test suite verifies that the system handles errors gracefully:
- Component failures don't crash the system
- Missing data is handled properly
- Network errors are recovered from
- Resource constraints are managed
"""

import asyncio
import pytest
import numpy as np
from unittest.mock import Mock, patch

from visualization.integration.system_integration import IntegratedVisualizationSystem
from visualization.events import EventType


class TestErrorHandling:
    """Test suite for error handling and graceful degradation."""
    
    def test_initialization_with_missing_components(self):
        """Test system initializes even if some components fail."""
        system = IntegratedVisualizationSystem(
            enable_visualization=False,
            enable_reasoning=False
        )
        
        system.initialize()
        
        # System should still initialize
        assert system._initialized is True
        
        # Disabled components should be None
        assert system.scenario_visualizer is None
        assert system.reasoning_engine is None
        
        # Enabled components should work
        assert system.decision_tracker is not None
        assert system.performance_monitor is not None
        
        system.shutdown()
    
    def test_event_handling_with_malformed_data(self):
        """Test that malformed event data doesn't crash the system."""
        system = IntegratedVisualizationSystem()
        system.initialize()
        
        event_bus = system.event_bus
        
        # Publish events with malformed data
        malformed_events = [
            (EventType.ENV_STEP, {}),  # Missing required fields
            (EventType.ENV_STEP, {'aircraft_states': None}),  # None value
            (EventType.POLICY_DECISION, {'action': 'invalid'}),  # Wrong type
            (EventType.SAFETY_VIOLATION, {'severity': 'invalid_severity'}),  # Invalid enum
        ]
        
        # System should handle all without crashing
        for event_type, data in malformed_events:
            try:
                event_bus.publish(event_type, data)
            except Exception as e:
                pytest.fail(f"System crashed on malformed data: {e}")
        
        system.shutdown()
    
    def test_visualization_failure_doesnt_stop_training(self):
        """Test that visualization failures don't affect training."""
        system = IntegratedVisualizationSystem(enable_visualization=True)
        system.initialize()
        
        # Simulate visualization failure by setting to None
        system.scenario_visualizer = None
        
        # Publish environment events - should not crash
        event_bus = system.event_bus
        event_bus.publish(
            EventType.ENV_STEP,
            {
                'aircraft_states': [{'id': 'AC001', 'position': [10, 20]}],
                'step': 1
            }
        )
        
        # System should continue working
        assert system._initialized is True
        
        system.shutdown()
    
    def test_decision_tracker_buffer_overflow(self):
        """Test that decision tracker handles buffer overflow correctly."""
        system = IntegratedVisualizationSystem(
            enable_decision_tracking=True,
            max_decision_history=10  # Small buffer
        )
        system.initialize()
        
        event_bus = system.event_bus
        
        # Publish more decisions than buffer can hold
        for i in range(20):
            event_bus.publish(
                EventType.POLICY_DECISION,
                {
                    'observation': [float(i)] * 10,
                    'action': [0.0, 0.0],
                    'policy_logits': [0.0] * 5,
                    'value_estimate': float(i),
                    'confidence_scores': {}
                }
            )
        
        # Buffer should contain only last 10 decisions
        decision_tracker = system.decision_tracker
        history = decision_tracker.get_decision_history()
        
        assert len(history) <= 10
        
        # Most recent decision should have highest value
        assert history[0].value_estimate >= 10.0
        
        system.shutdown()
    
    @pytest.mark.asyncio
    async def test_websocket_disconnection_recovery(self):
        """Test that system handles WebSocket disconnections gracefully."""
        system = IntegratedVisualizationSystem(websocket_port=8765)
        system.initialize()
        await system.start()
        
        # Simulate client disconnection by stopping server
        await system.websocket_server.stop()
        
        # Publish events - should not crash even without WebSocket
        event_bus = system.event_bus
        event_bus.publish(EventType.ENV_STEP, {'step': 1})
        
        await asyncio.sleep(0.1)
        
        # System should still be initialized
        assert system._initialized is True
        
        await system.stop()
        system.shutdown()
    
    def test_safety_analyzer_with_no_decisions(self):
        """Test safety analyzer handles violations with no decision history."""
        system = IntegratedVisualizationSystem(
            enable_reasoning=True,
            enable_decision_tracking=True
        )
        system.initialize()
        
        # Publish safety violation without any prior decisions
        event_bus = system.event_bus
        event_bus.publish(
            EventType.SAFETY_VIOLATION,
            {
                'violation_type': 'loss_of_separation',
                'severity': 'high',
                'aircraft_involved': ['AC001', 'AC002'],
                'separation_distance': 2.0,
                'minimum_separation': 5.0,
                'altitude_separation': 500.0
            }
        )
        
        # Should not crash - analyzer should handle missing decision context
        safety_analyzer = system.reasoning_engine.safety_analyzer
        violations = safety_analyzer.get_violation_history()
        
        assert len(violations) > 0
        violation = violations[0]
        assert violation.root_causes is not None  # Should have some analysis
        
        system.shutdown()
    
    def test_performance_monitor_with_invalid_metrics(self):
        """Test performance monitor handles invalid metric values."""
        system = IntegratedVisualizationSystem(enable_monitoring=True)
        system.initialize()
        
        event_bus = system.event_bus
        
        # Publish training iteration with invalid/missing metrics
        invalid_metrics = [
            {},  # Empty
            {'episode_reward_mean': float('nan')},  # NaN value
            {'episode_reward_mean': float('inf')},  # Infinite value
            {'episode_reward_mean': None},  # None value
        ]
        
        for metrics in invalid_metrics:
            event_bus.publish(EventType.TRAINING_ITERATION, metrics)
        
        # System should handle all gracefully
        performance_monitor = system.performance_monitor
        stats = performance_monitor.get_statistics()
        
        # Should have some stats even with invalid data
        assert stats is not None
        
        system.shutdown()
    
    def test_concurrent_shutdown(self):
        """Test that concurrent shutdown calls don't cause issues."""
        system = IntegratedVisualizationSystem()
        system.initialize()
        
        # Call shutdown multiple times
        system.shutdown()
        system.shutdown()  # Should not crash
        system.shutdown()  # Should not crash
        
        assert system._initialized is False
    
    def test_event_bus_with_failing_subscriber(self):
        """Test that one failing subscriber doesn't affect others."""
        system = IntegratedVisualizationSystem()
        system.initialize()
        
        event_bus = system.event_bus
        
        # Add a subscriber that always fails
        def failing_handler(event):
            raise Exception("Subscriber failure")
        
        event_bus.subscribe(EventType.ENV_STEP, failing_handler)
        
        # Add a working subscriber
        received_events = []
        def working_handler(event):
            received_events.append(event)
        
        event_bus.subscribe(EventType.ENV_STEP, working_handler)
        
        # Publish event
        event_bus.publish(EventType.ENV_STEP, {'step': 1})
        
        # Working subscriber should still receive event
        assert len(received_events) > 0
        
        system.shutdown()
    
    @pytest.mark.asyncio
    async def test_memory_pressure_handling(self):
        """Test system behavior under memory pressure."""
        system = IntegratedVisualizationSystem(
            max_decision_history=1000  # Large buffer
        )
        system.initialize()
        
        event_bus = system.event_bus
        
        # Generate many events to simulate memory pressure
        for i in range(500):
            event_bus.publish(
                EventType.POLICY_DECISION,
                {
                    'observation': np.random.rand(100).tolist(),  # Large observation
                    'action': [0.0, 0.0],
                    'policy_logits': np.random.rand(50).tolist(),
                    'value_estimate': 0.0,
                    'confidence_scores': {}
                }
            )
            
            if i % 100 == 0:
                await asyncio.sleep(0.01)  # Small delay
        
        # System should still be functional
        assert system._initialized is True
        
        # Decision tracker should have limited buffer
        decision_tracker = system.decision_tracker
        history = decision_tracker.get_decision_history()
        assert len(history) <= 1000  # Respects max limit
        
        system.shutdown()
    
    def test_environment_wrapper_with_failing_env(self):
        """Test that environment wrapper handles base environment failures."""
        system = IntegratedVisualizationSystem()
        system.initialize()
        
        # Create mock environment that fails
        mock_env = Mock()
        mock_env.reset.side_effect = Exception("Environment reset failed")
        mock_env.step.side_effect = Exception("Environment step failed")
        
        # Wrap environment
        wrapped_env = system.wrap_environment(mock_env)
        
        # Wrapper should propagate exceptions but not crash system
        with pytest.raises(Exception):
            wrapped_env.reset()
        
        with pytest.raises(Exception):
            wrapped_env.step([0, 0])
        
        # System should still be functional
        assert system._initialized is True
        
        system.shutdown()


def test_error_handling_smoke():
    """Quick smoke test for error handling."""
    # Test basic error scenarios
    system = IntegratedVisualizationSystem()
    system.initialize()
    
    # Publish malformed event
    system.event_bus.publish(EventType.ENV_STEP, {})
    
    # Multiple shutdowns
    system.shutdown()
    system.shutdown()
    
    print("✓ Error handling smoke test passed")


if __name__ == "__main__":
    # Run smoke test
    test_error_handling_smoke()
    
    print("\nRun full test suite with: pytest tests/test_error_handling.py -v")
