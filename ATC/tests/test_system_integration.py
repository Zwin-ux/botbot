"""
End-to-end integration tests for the complete visualization system.

This test suite verifies that all components work together correctly:
- Event bus communication
- WebSocket server integration
- Visualization components
- Decision tracking
- Reasoning engine
- Performance monitoring
"""

import asyncio
import time
import pytest
import numpy as np
from typing import List, Dict, Any

from visualization.integration.system_integration import IntegratedVisualizationSystem
from visualization.events import EventType, get_event_bus
from visualization.server.message_router import Message, MessageType


class TestSystemIntegration:
    """Test suite for integrated visualization system."""
    
    @pytest.fixture
    async def integrated_system(self):
        """Create and initialize integrated system for testing."""
        system = IntegratedVisualizationSystem(
            websocket_port=8765,
            enable_visualization=True,
            enable_decision_tracking=True,
            enable_reasoning=True,
            enable_monitoring=True
        )
        
        system.initialize()
        await system.start()
        
        yield system
        
        await system.stop()
        system.shutdown()
    
    @pytest.mark.asyncio
    async def test_system_initialization(self):
        """Test that system initializes all components correctly."""
        system = IntegratedVisualizationSystem()
        system.initialize()
        
        # Verify all components are created
        assert system.event_bus is not None
        assert system.websocket_server is not None
        assert system.scenario_visualizer is not None
        assert system.decision_tracker is not None
        assert system.reasoning_engine is not None
        assert system.performance_monitor is not None
        assert system.policy_inspector is not None
        
        # Verify initialization flag
        assert system._initialized is True
        
        system.shutdown()
    
    @pytest.mark.asyncio
    async def test_event_flow_to_visualization(self, integrated_system):
        """Test that environment events flow to visualization component."""
        event_bus = integrated_system.event_bus
        
        # Publish environment step event
        aircraft_states = [
            {
                'id': 'AC001',
                'position': [10.0, 20.0],
                'velocity': 250.0,
                'heading': 1.57,
                'altitude': 10000.0,
                'goalPosition': [30.0, 40.0],
                'alive': True,
                'intent': 'departure'
            }
        ]
        
        event_bus.publish(
            EventType.ENV_STEP,
            {
                'aircraft_states': aircraft_states,
                'conflicts': [],
                'step': 1
            }
        )
        
        # Give time for event processing
        await asyncio.sleep(0.1)
        
        # Verify visualizer received update
        assert integrated_system.scenario_visualizer is not None
        # Visualizer should have aircraft data
        canvas_data = integrated_system.scenario_visualizer.get_canvas_data()
        assert 'aircraft' in canvas_data
        assert len(canvas_data['aircraft']) > 0
    
    @pytest.mark.asyncio
    async def test_decision_tracking_integration(self, integrated_system):
        """Test that policy decisions are tracked correctly."""
        event_bus = integrated_system.event_bus
        
        # Publish policy decision event
        event_bus.publish(
            EventType.POLICY_DECISION,
            {
                'observation': np.random.rand(10).tolist(),
                'action': np.array([0.5, -0.3]).tolist(),
                'policy_logits': np.random.rand(5).tolist(),
                'value_estimate': 15.5,
                'confidence_scores': {
                    'action_confidence': 0.85
                }
            }
        )
        
        # Give time for event processing
        await asyncio.sleep(0.1)
        
        # Verify decision was tracked
        decision_tracker = integrated_system.decision_tracker
        assert decision_tracker is not None
        
        history = decision_tracker.get_decision_history(limit=1)
        assert len(history) > 0
        
        decision = history[0]
        assert decision.value_estimate == 15.5
        assert 'action_confidence' in decision.confidence_scores
    
    @pytest.mark.asyncio
    async def test_safety_violation_analysis(self, integrated_system):
        """Test that safety violations are analyzed by reasoning engine."""
        event_bus = integrated_system.event_bus
        
        # Publish safety violation event
        event_bus.publish(
            EventType.SAFETY_VIOLATION,
            {
                'violation_type': 'loss_of_separation',
                'severity': 'high',
                'aircraft_involved': ['AC001', 'AC002'],
                'separation_distance': 2.5,
                'minimum_separation': 5.0,
                'altitude_separation': 500.0
            }
        )
        
        # Give time for event processing and analysis
        await asyncio.sleep(0.2)
        
        # Verify violation was analyzed
        reasoning_engine = integrated_system.reasoning_engine
        assert reasoning_engine is not None
        
        # Check safety analyzer has violations
        safety_analyzer = reasoning_engine.safety_analyzer
        violations = safety_analyzer.get_violation_history(limit=1)
        assert len(violations) > 0
        
        violation = violations[0]
        assert violation.violation_type.value == 'loss_of_separation'
        assert violation.severity.value == 'high'
        assert len(violation.aircraft_involved) == 2
    
    @pytest.mark.asyncio
    async def test_performance_monitoring(self, integrated_system):
        """Test that performance metrics are tracked."""
        event_bus = integrated_system.event_bus
        
        # Publish training iteration event
        event_bus.publish(
            EventType.TRAINING_ITERATION,
            {
                'iteration': 1,
                'episode_reward_mean': 25.5,
                'episode_len_mean': 150.0,
                'num_episodes': 10
            }
        )
        
        # Give time for event processing
        await asyncio.sleep(0.1)
        
        # Verify metrics were tracked
        performance_monitor = integrated_system.performance_monitor
        assert performance_monitor is not None
        
        stats = performance_monitor.get_statistics()
        assert 'total_metrics_tracked' in stats
    
    @pytest.mark.asyncio
    async def test_websocket_broadcasting(self, integrated_system):
        """Test that events are broadcast to WebSocket clients."""
        # This is a basic test - full WebSocket testing requires client connection
        
        # Verify WebSocket server is running
        assert integrated_system.websocket_server is not None
        assert integrated_system._running is True
        
        # Publish an event
        event_bus = integrated_system.event_bus
        event_bus.publish(
            EventType.ENV_STEP,
            {
                'aircraft_states': [],
                'step': 1
            }
        )
        
        # Give time for broadcasting
        await asyncio.sleep(0.1)
        
        # If no errors, broadcasting is working
        # (Full test would require WebSocket client connection)
    
    @pytest.mark.asyncio
    async def test_system_status(self, integrated_system):
        """Test that system status reporting works."""
        status = integrated_system.get_status()
        
        # Verify status structure
        assert 'initialized' in status
        assert 'running' in status
        assert 'components' in status
        assert 'websocket_port' in status
        
        # Verify component status
        components = status['components']
        assert components['visualization'] is True
        assert components['decision_tracking'] is True
        assert components['reasoning'] is True
        assert components['monitoring'] is True
        assert components['websocket'] is True
        
        # Verify statistics are included
        assert 'decision_tracker_stats' in status
        assert 'performance_stats' in status
        assert 'event_bus_stats' in status
    
    @pytest.mark.asyncio
    async def test_graceful_degradation(self):
        """Test that system handles component failures gracefully."""
        # Create system with some components disabled
        system = IntegratedVisualizationSystem(
            enable_visualization=False,
            enable_reasoning=False
        )
        
        system.initialize()
        
        # Verify disabled components are None
        assert system.scenario_visualizer is None
        assert system.reasoning_engine is None
        
        # Verify enabled components still work
        assert system.decision_tracker is not None
        assert system.performance_monitor is not None
        
        # Publish events - should not crash
        event_bus = system.event_bus
        event_bus.publish(EventType.ENV_STEP, {'step': 1})
        event_bus.publish(EventType.POLICY_DECISION, {'action': [0, 0]})
        
        await asyncio.sleep(0.1)
        
        system.shutdown()
    
    @pytest.mark.asyncio
    async def test_environment_wrapping(self):
        """Test that environments can be wrapped with event publishing."""
        from st_env.env import SyntheticTowerEnv
        
        system = IntegratedVisualizationSystem()
        system.initialize()
        
        # Create base environment
        base_env = SyntheticTowerEnv(
            scenario="scenarios/straight_4.scn",
            step_seconds=5.0
        )
        
        # Wrap environment
        wrapped_env = system.wrap_environment(base_env)
        
        # Verify wrapper
        assert wrapped_env is not None
        assert hasattr(wrapped_env, 'reset')
        assert hasattr(wrapped_env, 'step')
        
        # Test that wrapped env publishes events
        wrapped_env.reset()
        
        # Give time for event publishing
        await asyncio.sleep(0.1)
        
        # Verify events were published
        event_history = system.event_bus.get_event_history()
        assert len(event_history) > 0
        
        system.shutdown()
    
    @pytest.mark.asyncio
    async def test_concurrent_event_processing(self, integrated_system):
        """Test that system handles concurrent events correctly."""
        event_bus = integrated_system.event_bus
        
        # Publish multiple events concurrently
        events_to_publish = [
            (EventType.ENV_STEP, {'step': i, 'aircraft_states': []})
            for i in range(10)
        ]
        
        for event_type, data in events_to_publish:
            event_bus.publish(event_type, data)
        
        # Give time for all events to process
        await asyncio.sleep(0.2)
        
        # Verify system is still stable
        status = integrated_system.get_status()
        assert status['running'] is True
        
        # Verify events were processed
        event_history = event_bus.get_event_history()
        assert len(event_history) >= 10


def test_system_integration_smoke():
    """Quick smoke test for system integration."""
    system = IntegratedVisualizationSystem()
    system.initialize()
    
    # Verify basic functionality
    assert system._initialized is True
    status = system.get_status()
    assert status['initialized'] is True
    
    system.shutdown()
    print("✓ System integration smoke test passed")


if __name__ == "__main__":
    # Run smoke test
    test_system_integration_smoke()
    
    print("\nRun full test suite with: pytest tests/test_system_integration.py -v")
