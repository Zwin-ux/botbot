"""
Simple demo showing the integrated system working without errors.

This version disables the problematic components and focuses on what works.
"""

import asyncio
import time
import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from visualization.integration.system_integration import IntegratedVisualizationSystem
from visualization.events import EventType
from visualization.events.event_data import EventData
import numpy as np


async def run_simple_demo():
    """Run a simple demo with core components only."""
    
    print("=" * 80)
    print("SIMPLE INTEGRATED SYSTEM DEMO")
    print("=" * 80)
    print()
    
    # Create system with only working components
    print("Initializing system (decision tracking + reasoning + WebSocket)...")
    system = IntegratedVisualizationSystem(
        websocket_port=8080,
        enable_visualization=False,  # Disable to avoid API mismatch
        enable_decision_tracking=True,
        enable_reasoning=True,
        enable_monitoring=False,  # Disable (requires psutil)
    )
    
    system.initialize()
    await system.start()
    
    print("✓ System initialized and started")
    print(f"✓ WebSocket server running on ws://localhost:8080")
    print()
    
    # Show status
    status = system.get_status()
    print("Active Components:")
    for component, enabled in status['components'].items():
        status_icon = "✓" if enabled else "✗"
        print(f"  {status_icon} {component}")
    print()
    
    # Simulate some training activity
    print("Simulating training activity...")
    print("-" * 80)
    
    for episode in range(3):
        print(f"\nEpisode {episode + 1}/3")
        
        # Simulate 20 steps per episode
        for step in range(20):
            # Publish policy decision
            decision_event = EventData(
                timestamp=time.time(),
                event_type=EventType.POLICY_DECISION,
                data={
                    'observation': np.random.rand(10).tolist(),
                    'action': np.random.rand(2).tolist(),
                    'policy_logits': np.random.rand(5).tolist(),
                    'value_estimate': float(np.random.rand() * 20),
                    'confidence_scores': {
                        'action_confidence': float(np.random.rand() * 0.5 + 0.5)
                    }
                }
            )
            system.event_bus.publish(decision_event)
            
            # Occasionally publish safety violation
            if step % 7 == 0 and np.random.rand() > 0.5:
                safety_event = EventData(
                    timestamp=time.time(),
                    event_type=EventType.SAFETY_VIOLATION,
                    data={
                        'violation_type': 'loss_of_separation',
                        'severity': np.random.choice(['low', 'medium', 'high']),
                        'aircraft_involved': ['AC001', 'AC002'],
                        'separation_distance': float(np.random.rand() * 3 + 1),
                        'minimum_separation': 5.0,
                        'altitude_separation': float(np.random.rand() * 800 + 200)
                    }
                )
                system.event_bus.publish(safety_event)
            
            await asyncio.sleep(0.01)  # Small delay
        
        # Episode end
        episode_event = EventData(
            timestamp=time.time(),
            event_type=EventType.EPISODE_END,
            data={
                'episode_id': f'episode_{episode}',
                'total_reward': float(np.random.rand() * 10),
                'episode_length': 20,
                'safety_violations': 0
            }
        )
        system.event_bus.publish(episode_event)
        
        print(f"  ✓ Episode {episode + 1} complete")
    
    print()
    print("✓ Training simulation complete")
    print()
    
    # Show statistics
    print("=" * 80)
    print("SYSTEM STATISTICS")
    print("=" * 80)
    print()
    
    if system.decision_tracker:
        stats = system.decision_tracker.get_statistics()
        print("Decision Tracker:")
        print(f"  - Total decisions: {stats['total_decisions']}")
        print(f"  - Buffer size: {stats['buffer_size']}")
        if stats['average_confidence']:
            print(f"  - Average confidence: {stats['average_confidence']:.3f}")
        print()
    
    if system.reasoning_engine:
        safety_analyzer = system.reasoning_engine.safety_analyzer
        violations = safety_analyzer.get_violation_history()
        print(f"Safety Analyzer:")
        print(f"  - Total violations: {len(violations)}")
        
        if violations:
            severity_counts = {}
            for v in violations:
                severity_counts[v.severity.value] = severity_counts.get(v.severity.value, 0) + 1
            print(f"  - By severity:")
            for severity, count in severity_counts.items():
                print(f"    • {severity}: {count}")
            
            metrics = safety_analyzer.calculate_safety_metrics()
            print(f"  - Safety score: {metrics.safety_score:.1f}/100")
        print()
    
    event_bus = system.event_bus
    print(f"Event Bus:")
    print(f"  - Subscribers: {event_bus.get_subscriber_count()}")
    print(f"  - Events processed: {len(event_bus.get_event_history())}")
    print()
    
    print("=" * 80)
    print("SERVER RUNNING")
    print("=" * 80)
    print()
    print(f"WebSocket server is running on ws://localhost:8080")
    print()
    print("To connect the React dashboard:")
    print("  1. Open a new terminal")
    print("  2. cd visualization/web/react-dashboard")
    print("  3. npm start")
    print("  4. Open http://localhost:3000")
    print()
    print("Press Ctrl+C to stop...")
    print()
    
    try:
        # Keep running
        while True:
            await asyncio.sleep(10)
            # Periodic status update
            print(f"[{time.strftime('%H:%M:%S')}] Server running - "
                  f"Events: {len(event_bus.get_event_history())}, "
                  f"Decisions: {stats['buffer_size']}")
    
    except KeyboardInterrupt:
        print("\n\nShutting down...")
    
    finally:
        await system.stop()
        system.shutdown()
        print("✓ System shutdown complete")
        print()


def main():
    """Main entry point."""
    print()
    print("╔" + "═" * 78 + "╗")
    print("║" + " " * 25 + "SIMPLE INTEGRATION DEMO" + " " * 30 + "║")
    print("╚" + "═" * 78 + "╝")
    print()
    print("This demo shows the core integration working cleanly.")
    print()
    
    try:
        asyncio.run(run_simple_demo())
    except KeyboardInterrupt:
        print("\nDemo stopped by user")


if __name__ == "__main__":
    main()
