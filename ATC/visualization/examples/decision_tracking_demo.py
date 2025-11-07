"""
Demo script showing decision tracking and explanation system usage.

This script demonstrates how to use the decision tracking system to capture,
analyze, and explain AI decision-making processes.
"""

import time
import numpy as np
from typing import Dict, Any

from ..decision import (
    DecisionTracker, 
    PatternAnalyzer, 
    ExplanationGenerator,
    get_decision_tracker
)
from ..events import get_event_bus
from ..integration.policy_inspector import get_policy_inspector


def simulate_training_decisions(num_decisions: int = 20) -> None:
    """
    Simulate a series of training decisions for demonstration.
    
    Args:
        num_decisions: Number of decisions to simulate
    """
    print(f"Simulating {num_decisions} training decisions...")
    
    # Get decision tracker
    decision_tracker = get_decision_tracker()
    policy_inspector = get_policy_inspector()
    
    # Simulate decisions with varying patterns
    for i in range(num_decisions):
        # Create synthetic observation (air traffic scenario)
        observation = np.random.randn(10)  # 10-dimensional observation
        
        # Create synthetic action (heading and altitude changes)
        if i % 3 == 0:
            # Pattern: conservative actions
            action = np.array([0.1, 0.05]) * np.random.randn(2)
        elif i % 3 == 1:
            # Pattern: aggressive maneuvers
            action = np.array([0.8, 0.6]) * np.random.randn(2)
        else:
            # Pattern: moderate adjustments
            action = np.array([0.3, 0.2]) * np.random.randn(2)
        
        # Create synthetic policy output
        policy_logits = np.random.randn(4)  # 4 possible discrete actions
        value_estimate = np.random.uniform(-2, 2)
        
        # Calculate confidence scores
        action_confidence = np.random.uniform(0.3, 0.9)
        max_probability = np.exp(np.max(policy_logits)) / np.sum(np.exp(policy_logits))
        
        confidence_scores = {
            "action_confidence": action_confidence,
            "max_probability": max_probability,
            "certainty": 1.0 - np.std(policy_logits) / np.mean(np.abs(policy_logits))
        }
        
        # Create policy output dictionary
        policy_output = {
            "action_logits": policy_logits,
            "vf_preds": np.array([value_estimate]),
            "confidence_scores": confidence_scores,
            "action_dist_inputs": np.concatenate([action, np.log([0.1, 0.1])])  # means + log_stds
        }
        
        # Create context
        context = {
            "episode_id": f"episode_{i // 5}",
            "step_number": i % 5,
            "reward": np.random.uniform(-1, 1) if i > 0 else None
        }
        
        # Log the decision
        decision_id = decision_tracker.log_decision(
            observation=observation,
            action=action,
            policy_output=policy_output,
            context=context
        )
        
        # Simulate policy inspection
        inspection_results = policy_inspector.inspect_policy_decision(
            observation=observation,
            action=action,
            policy_output=policy_output,
            model=None  # No actual model for demo
        )
        
        # Add small delay to simulate real training
        time.sleep(0.1)
        
        if (i + 1) % 5 == 0:
            print(f"  Logged {i + 1} decisions...")
    
    print("Decision simulation complete!")


def demonstrate_pattern_analysis() -> None:
    """Demonstrate pattern analysis capabilities."""
    print("\n=== Pattern Analysis Demo ===")
    
    # Get decision tracker and create pattern analyzer
    decision_tracker = get_decision_tracker()
    pattern_analyzer = PatternAnalyzer(decision_tracker)
    
    # Analyze patterns
    print("Analyzing decision patterns...")
    patterns = pattern_analyzer.analyze_patterns()
    
    print(f"Found {len(patterns)} behavioral patterns:")
    
    for pattern in patterns:
        print(f"\nPattern: {pattern.pattern_id}")
        print(f"  Type: {pattern.pattern_type}")
        print(f"  Frequency: {pattern.frequency}")
        print(f"  Confidence: {pattern.confidence:.2f}")
        print(f"  Description: {pattern.description}")
        print(f"  Examples: {pattern.examples[:3]}")
    
    # Get pattern summary
    summary = pattern_analyzer.get_pattern_summary()
    print(f"\nPattern Summary:")
    print(f"  Total patterns: {summary['total_patterns']}")
    print(f"  Pattern types: {summary['pattern_types']}")
    print(f"  Average confidence: {summary['average_confidence']:.2f}")
    
    if summary['most_frequent_pattern']:
        mfp = summary['most_frequent_pattern']
        print(f"  Most frequent: {mfp['type']} ({mfp['frequency']} occurrences)")


def demonstrate_decision_explanation() -> None:
    """Demonstrate decision explanation generation."""
    print("\n=== Decision Explanation Demo ===")
    
    # Get decision tracker and create explanation generator
    decision_tracker = get_decision_tracker()
    explanation_generator = ExplanationGenerator(decision_tracker)
    
    # Get recent decisions
    recent_decisions = decision_tracker.get_decision_history(limit=3)
    
    if not recent_decisions:
        print("No decisions available for explanation.")
        return
    
    print(f"Generating explanations for {len(recent_decisions)} recent decisions:")
    
    for i, decision in enumerate(recent_decisions):
        print(f"\n--- Decision {i + 1}: {decision.decision_id} ---")
        
        # Generate explanation
        explanation = explanation_generator.explain_decision(decision.decision_id)
        
        if explanation:
            print(f"Primary: {explanation.primary_explanation}")
            print(f"Detailed: {explanation.detailed_explanation}")
            print(f"Confidence: {explanation.confidence_assessment}")
            
            if explanation.context_factors:
                print(f"Context: {', '.join(explanation.context_factors)}")
            
            if explanation.similar_decisions:
                print(f"Similar decisions: {explanation.similar_decisions}")
            
            if explanation.pattern_matches:
                print(f"Pattern matches: {explanation.pattern_matches}")
            
            if explanation.uncertainty_notes:
                print(f"Uncertainty: {explanation.uncertainty_notes}")
        else:
            print("Could not generate explanation for this decision.")


def demonstrate_statistics() -> None:
    """Demonstrate decision tracking statistics."""
    print("\n=== Decision Tracking Statistics ===")
    
    decision_tracker = get_decision_tracker()
    stats = decision_tracker.get_statistics()
    
    print(f"Total decisions tracked: {stats['total_decisions']}")
    print(f"Current buffer size: {stats['buffer_size']}")
    
    if stats['time_range']:
        duration = stats['time_range']['duration']
        print(f"Time range: {duration:.1f} seconds")
        print(f"Decision rate: {stats['buffer_size'] / max(duration, 1):.2f} decisions/second")
    
    if stats['average_confidence']:
        print(f"Average confidence: {stats['average_confidence']:.3f} ± {stats['confidence_std']:.3f}")


def main():
    """Main demo function."""
    print("Decision Tracking and Explanation System Demo")
    print("=" * 50)
    
    try:
        # Simulate training decisions
        simulate_training_decisions(20)
        
        # Show statistics
        demonstrate_statistics()
        
        # Demonstrate pattern analysis
        demonstrate_pattern_analysis()
        
        # Demonstrate decision explanation
        demonstrate_decision_explanation()
        
        print("\n=== Demo Complete ===")
        print("The decision tracking system has successfully:")
        print("1. Captured and stored decision records")
        print("2. Detected behavioral patterns")
        print("3. Generated human-readable explanations")
        print("4. Provided statistical insights")
        
    except Exception as e:
        print(f"Demo error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Cleanup
        from ..decision import shutdown_decision_tracker
        from ..events import shutdown_event_bus
        
        shutdown_decision_tracker()
        shutdown_event_bus()


if __name__ == "__main__":
    main()