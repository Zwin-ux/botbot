"""
Simple smoke test for system integration without heavy dependencies.

This test verifies basic integration functionality without requiring
Ray, RLlib, or other heavy dependencies.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))


def test_system_integration_imports():
    """Test that all integration modules can be imported."""
    print("Testing module imports...")
    
    try:
        from visualization.events import EventBus, get_event_bus, EventType
        print("✓ Event system imports")
    except Exception as e:
        print(f"✗ Event system imports failed: {e}")
        return False
    
    try:
        from visualization.server import WebSocketServer
        print("✓ WebSocket server imports")
    except Exception as e:
        print(f"✗ WebSocket server imports failed: {e}")
        return False
    
    try:
        from visualization.scenario import ScenarioVisualizer
        print("✓ Scenario visualizer imports")
    except Exception as e:
        print(f"✗ Scenario visualizer imports failed: {e}")
        return False
    
    try:
        from visualization.decision import DecisionTracker, get_decision_tracker
        print("✓ Decision tracker imports")
    except Exception as e:
        print(f"✗ Decision tracker imports failed: {e}")
        return False
    
    try:
        from visualization.reasoning import ReasoningEngine
        print("✓ Reasoning engine imports")
    except Exception as e:
        print(f"✗ Reasoning engine imports failed: {e}")
        return False
    
    try:
        from visualization.monitoring import PerformanceMonitor, get_performance_monitor
        print("✓ Performance monitor imports")
    except Exception as e:
        print(f"✗ Performance monitor imports failed: {e}")
        return False
    
    try:
        from visualization.integration.system_integration import IntegratedVisualizationSystem
        print("✓ Integrated system imports")
    except Exception as e:
        print(f"✗ Integrated system imports failed: {e}")
        return False
    
    return True


def test_event_bus_integration():
    """Test event bus basic functionality."""
    print("\nTesting event bus integration...")
    
    from visualization.events import get_event_bus, EventType
    
    event_bus = get_event_bus()
    
    # Test event publishing and subscription
    received_events = []
    
    def handler(event):
        received_events.append(event)
    
    subscription_id = event_bus.subscribe(EventType.ENV_STEP, handler)
    
    # Publish event
    event_bus.publish(EventType.ENV_STEP, {'step': 1, 'test': True})
    
    # Verify event was received
    assert len(received_events) > 0, "Event not received"
    assert received_events[0].data['step'] == 1
    
    # Cleanup
    event_bus.unsubscribe(subscription_id)
    
    print("✓ Event bus integration working")
    return True


def test_decision_tracker_integration():
    """Test decision tracker basic functionality."""
    print("\nTesting decision tracker integration...")
    
    from visualization.decision import get_decision_tracker
    import numpy as np
    
    tracker = get_decision_tracker()
    
    # Log a decision
    observation = np.array([1.0, 2.0, 3.0])
    action = np.array([0.5, -0.3])
    policy_output = {
        'action_logits': np.array([0.1, 0.2, 0.3]),
        'vf_preds': np.array([15.5]),
        'confidence_scores': {'action_confidence': 0.85}
    }
    
    decision_id = tracker.log_decision(observation, action, policy_output)
    
    # Verify decision was logged
    assert decision_id is not None
    
    history = tracker.get_decision_history(limit=1)
    assert len(history) > 0
    assert history[0].value_estimate == 15.5
    
    print("✓ Decision tracker integration working")
    return True


def test_integrated_system_creation():
    """Test that integrated system can be created."""
    print("\nTesting integrated system creation...")
    
    from visualization.integration.system_integration import IntegratedVisualizationSystem
    
    # Create system with all components disabled to avoid dependencies
    system = IntegratedVisualizationSystem(
        enable_visualization=False,
        enable_decision_tracking=False,
        enable_reasoning=False,
        enable_monitoring=False
    )
    
    assert system is not None
    assert system.event_bus is not None
    
    print("✓ Integrated system creation working")
    return True


def test_integrated_system_initialization():
    """Test that integrated system initializes correctly."""
    print("\nTesting integrated system initialization...")
    
    from visualization.integration.system_integration import IntegratedVisualizationSystem
    
    system = IntegratedVisualizationSystem(
        enable_visualization=True,
        enable_decision_tracking=True,
        enable_reasoning=True,
        enable_monitoring=True
    )
    
    system.initialize()
    
    # Verify initialization
    assert system._initialized is True
    
    # Check status
    status = system.get_status()
    assert status['initialized'] is True
    assert 'components' in status
    
    # Cleanup
    system.shutdown()
    
    print("✓ Integrated system initialization working")
    return True


def test_component_wiring():
    """Test that components are wired together via events."""
    print("\nTesting component wiring...")
    
    from visualization.integration.system_integration import IntegratedVisualizationSystem
    from visualization.events import EventType
    import numpy as np
    
    system = IntegratedVisualizationSystem(
        enable_decision_tracking=True,
        enable_visualization=False,
        enable_reasoning=False,
        enable_monitoring=False
    )
    
    system.initialize()
    
    # Publish policy decision event
    system.event_bus.publish(
        EventType.POLICY_DECISION,
        {
            'observation': [1.0, 2.0, 3.0],
            'action': [0.5, -0.3],
            'policy_logits': [0.1, 0.2, 0.3],
            'value_estimate': 15.5,
            'confidence_scores': {'action_confidence': 0.85}
        }
    )
    
    # Verify decision tracker received event
    if system.decision_tracker:
        history = system.decision_tracker.get_decision_history(limit=1)
        assert len(history) > 0, "Decision tracker did not receive event"
    
    system.shutdown()
    
    print("✓ Component wiring working")
    return True


def main():
    """Run all smoke tests."""
    print("=" * 80)
    print("SYSTEM INTEGRATION SMOKE TESTS")
    print("=" * 80)
    print()
    
    tests = [
        ("Module Imports", test_system_integration_imports),
        ("Event Bus Integration", test_event_bus_integration),
        ("Decision Tracker Integration", test_decision_tracker_integration),
        ("Integrated System Creation", test_integrated_system_creation),
        ("Integrated System Initialization", test_integrated_system_initialization),
        ("Component Wiring", test_component_wiring),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
                print(f"✗ {test_name} FAILED")
        except Exception as e:
            failed += 1
            print(f"✗ {test_name} FAILED with exception: {e}")
            import traceback
            traceback.print_exc()
    
    print()
    print("=" * 80)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 80)
    
    return failed == 0


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
