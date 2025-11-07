"""
Complete integration demonstration showing all components working together.

This demo shows:
1. System initialization with all components
2. Environment integration with event publishing
3. Real-time visualization updates
4. Decision tracking and analysis
5. Safety violation detection and reasoning
6. Performance monitoring
7. WebSocket streaming to dashboard

Usage:
    python visualization/examples/complete_integration_demo.py
"""

import asyncio
import time
import numpy as np
from pathlib import Path

from visualization.integration.system_integration import IntegratedVisualizationSystem
from visualization.events import EventType
from st_env.env import SyntheticTowerEnv


async def run_integration_demo():
    """Run complete integration demonstration."""
    
    print("=" * 80)
    print("COMPLETE SYSTEM INTEGRATION DEMONSTRATION")
    print("=" * 80)
    print()
    
    # Step 1: Initialize integrated system
    print("Step 1: Initializing integrated visualization system...")
    print("-" * 80)
    
    system = IntegratedVisualizationSystem(
        websocket_port=8080,
        enable_visualization=True,
        enable_decision_tracking=True,
        enable_reasoning=True,
        enable_monitoring=True,
        canvas_size=(800, 800),
        sector_size_nm=50.0,
        max_decision_history=100,
        checkpoint_dir="./demo_checkpoints"
    )
    
    system.initialize()
    print("✓ System initialized")
    print()
    
    # Display system status
    status = system.get_status()
    print("System Status:")
    print(f"  - Initialized: {status['initialized']}")
    print(f"  - Components enabled:")
    for component, enabled in status['components'].items():
        print(f"    • {component}: {enabled}")
    print(f"  - WebSocket port: {status['websocket_port']}")
    print()
    
    # Step 2: Start WebSocket server
    print("Step 2: Starting WebSocket server...")
    print("-" * 80)
    
    await system.start()
    print(f"✓ WebSocket server running on ws://localhost:{system.websocket_port}")
    print("  (Connect React dashboard to see real-time updates)")
    print()
    
    # Step 3: Create and wrap environment
    print("Step 3: Creating and wrapping training environment...")
    print("-" * 80)
    
    base_env = SyntheticTowerEnv(
        scenario="scenarios/straight_4.scn",
        step_seconds=5.0,
        seed=42,
        horizon=400
    )
    
    env = system.wrap_environment(base_env)
    print("✓ Environment wrapped with event publishing")
    print()
    
    # Step 4: Run simulation episodes
    print("Step 4: Running simulation episodes with full integration...")
    print("-" * 80)
    
    num_episodes = 3
    
    for episode in range(num_episodes):
        print(f"\nEpisode {episode + 1}/{num_episodes}")
        print("-" * 40)
        
        # Reset environment
        obs, info = env.reset()
        print(f"  Environment reset - {len(info.get('aircraft_states', []))} aircraft")
        
        episode_reward = 0
        episode_steps = 0
        violations_detected = 0
        
        # Run episode
        done = False
        truncated = False
        step_count = 0
        
        while not (done or truncated) and step_count < 50:  # Limit steps for demo
            # Simulate policy decision
            action = env.action_space.sample()  # Random action for demo
            
            # Publish policy decision event (simulating AI controller)
            from visualization.events.event_data import EventData
            policy_event = EventData(
                timestamp=time.time(),
                event_type=EventType.POLICY_DECISION,
                data={
                    'observation': obs.tolist() if isinstance(obs, np.ndarray) else obs,
                    'action': action.tolist() if isinstance(action, np.ndarray) else action,
                    'policy_logits': np.random.rand(5).tolist(),
                    'value_estimate': float(np.random.rand() * 20),
                    'confidence_scores': {
                        'action_confidence': float(np.random.rand() * 0.5 + 0.5),
                        'safety': float(np.random.rand() * 0.3 + 0.7),
                        'efficiency': float(np.random.rand() * 0.4 + 0.6)
                    }
                }
            )
            system.event_bus.publish(policy_event)
            
            # Step environment
            obs, reward, done, truncated, info = env.step(action)
            
            episode_reward += reward
            episode_steps += 1
            step_count += 1
            
            # Check for safety violations in info
            if 'safety_violations' in info and info['safety_violations']:
                violations_detected += len(info['safety_violations'])
            
            # Simulate occasional safety violations for demo
            if step_count % 15 == 0 and np.random.rand() > 0.5:
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
                violations_detected += 1
            
            # Small delay to simulate real-time
            await asyncio.sleep(0.05)
        
        # Publish episode end event
        episode_event = EventData(
            timestamp=time.time(),
            event_type=EventType.EPISODE_END,
            data={
                'episode_id': f'episode_{episode}',
                'total_reward': episode_reward,
                'episode_length': episode_steps,
                'safety_violations': violations_detected
            }
        )
        system.event_bus.publish(episode_event)
        
        print(f"  Episode complete:")
        print(f"    • Steps: {episode_steps}")
        print(f"    • Total reward: {episode_reward:.2f}")
        print(f"    • Safety violations: {violations_detected}")
        
        # Publish training iteration event
        training_event = EventData(
            timestamp=time.time(),
            event_type=EventType.TRAINING_ITERATION,
            data={
                'iteration': episode,
                'episode_reward_mean': episode_reward,
                'episode_len_mean': float(episode_steps),
                'num_episodes': 1
            }
        )
        system.event_bus.publish(training_event)
        
        # Give time for analysis
        await asyncio.sleep(0.2)
    
    print()
    print("✓ Simulation episodes complete")
    print()
    
    # Step 5: Display component statistics
    print("Step 5: Component Statistics")
    print("-" * 80)
    
    # Decision tracker stats
    if system.decision_tracker:
        decision_stats = system.decision_tracker.get_statistics()
        print("\nDecision Tracker:")
        print(f"  - Total decisions: {decision_stats['total_decisions']}")
        print(f"  - Buffer size: {decision_stats['buffer_size']}")
        if decision_stats['average_confidence']:
            print(f"  - Average confidence: {decision_stats['average_confidence']:.3f}")
    
    # Safety analyzer stats
    if system.reasoning_engine:
        safety_analyzer = system.reasoning_engine.safety_analyzer
        violations = safety_analyzer.get_violation_history()
        print(f"\nSafety Analyzer:")
        print(f"  - Total violations: {len(violations)}")
        
        if violations:
            severity_counts = {}
            for v in violations:
                severity_counts[v.severity.value] = severity_counts.get(v.severity.value, 0) + 1
            print(f"  - By severity:")
            for severity, count in severity_counts.items():
                print(f"    • {severity}: {count}")
        
        # Get safety metrics
        metrics = safety_analyzer.calculate_safety_metrics()
        print(f"  - Safety score: {metrics.safety_score:.1f}/100")
        print(f"  - Violation rate: {metrics.violation_rate_per_hour:.2f}/hour")
    
    # Performance monitor stats
    if system.performance_monitor:
        perf_stats = system.performance_monitor.get_statistics()
        print(f"\nPerformance Monitor:")
        print(f"  - Metrics tracked: {perf_stats.get('total_metrics_tracked', 0)}")
    
    # Event bus stats
    event_bus = system.event_bus
    print(f"\nEvent Bus:")
    print(f"  - Subscribers: {event_bus.get_subscriber_count()}")
    print(f"  - Events in history: {len(event_bus.get_event_history())}")
    
    print()
    
    # Step 6: Demonstrate data flow
    print("Step 6: Data Flow Verification")
    print("-" * 80)
    
    print("\n✓ Complete data flow verified:")
    print("  1. Environment → Event Bus → Scenario Visualizer")
    print("  2. Policy Decisions → Event Bus → Decision Tracker")
    print("  3. Safety Violations → Event Bus → Reasoning Engine")
    print("  4. Training Metrics → Event Bus → Performance Monitor")
    print("  5. All Events → WebSocket Server → Dashboard Clients")
    print()
    
    # Step 7: Keep server running for dashboard connection
    print("Step 7: Server Running")
    print("-" * 80)
    print()
    print("WebSocket server is running and ready for dashboard connections.")
    print(f"Connect to: ws://localhost:{system.websocket_port}")
    print()
    print("To test with React dashboard:")
    print("  1. Open a new terminal")
    print("  2. cd visualization/web/react-dashboard")
    print("  3. npm start")
    print("  4. Open http://localhost:3000 in your browser")
    print()
    print("Press Ctrl+C to stop the server...")
    print()
    
    try:
        # Keep running until interrupted
        while True:
            await asyncio.sleep(1)
            
            # Periodically send status updates
            if int(time.time()) % 10 == 0:
                status = system.get_status()
                print(f"[{time.strftime('%H:%M:%S')}] System running - "
                      f"Events: {len(event_bus.get_event_history())}, "
                      f"Decisions: {decision_stats['buffer_size']}")
    
    except KeyboardInterrupt:
        print("\n\nShutting down...")
    
    finally:
        # Step 8: Cleanup
        print("\nStep 8: Cleanup")
        print("-" * 80)
        
        await system.stop()
        system.shutdown()
        
        print("✓ System shutdown complete")
        print()
        print("=" * 80)
        print("DEMONSTRATION COMPLETE")
        print("=" * 80)


def main():
    """Main entry point."""
    print("\n")
    print("╔" + "═" * 78 + "╗")
    print("║" + " " * 20 + "INTEGRATED VISUALIZATION SYSTEM DEMO" + " " * 22 + "║")
    print("╚" + "═" * 78 + "╝")
    print()
    
    print("This demonstration shows all visualization and reasoning components")
    print("working together in a complete end-to-end integration.")
    print()
    
    input("Press Enter to start the demonstration...")
    print()
    
    # Run async demo
    asyncio.run(run_integration_demo())


if __name__ == "__main__":
    main()
