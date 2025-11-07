"""Decision explanation text generation system."""

import time
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

from .decision_tracker import DecisionRecord, DecisionTracker, get_decision_tracker
from .pattern_analyzer import BehaviorPattern, PatternAnalyzer


@dataclass
class DecisionExplanation:
    """
    Structured explanation for an AI decision.
    """
    decision_id: str
    timestamp: float
    primary_explanation: str
    detailed_explanation: str
    confidence_assessment: str
    context_factors: List[str]
    similar_decisions: List[str]  # IDs of similar past decisions
    pattern_matches: List[str]  # Pattern IDs that match this decision
    uncertainty_notes: Optional[str] = None


class ExplanationGenerator:
    """
    Generates human-readable explanations for AI decisions.
    
    This class analyzes decision records and generates natural language
    explanations that help users understand the AI's reasoning process.
    """
    
    def __init__(self, decision_tracker: Optional[DecisionTracker] = None,
                 pattern_analyzer: Optional[PatternAnalyzer] = None):
        """
        Initialize the explanation generator.
        
        Args:
            decision_tracker: Decision tracker instance (uses global if None)
            pattern_analyzer: Pattern analyzer instance (creates new if None)
        """
        self.decision_tracker = decision_tracker or get_decision_tracker()
        self.pattern_analyzer = pattern_analyzer or PatternAnalyzer(self.decision_tracker)
        
        # Explanation templates
        self._templates = self._initialize_templates()
        
        print("ExplanationGenerator initialized")
    
    def explain_decision(self, decision_id: str) -> Optional[DecisionExplanation]:
        """
        Generate a comprehensive explanation for a specific decision.
        
        Args:
            decision_id: ID of the decision to explain
            
        Returns:
            Decision explanation or None if decision not found
        """
        # Get the decision record
        decision = self.decision_tracker.get_decision_by_id(decision_id)
        if decision is None:
            return None
        
        # Generate explanation components
        primary_explanation = self._generate_primary_explanation(decision)
        detailed_explanation = self._generate_detailed_explanation(decision)
        confidence_assessment = self._generate_confidence_assessment(decision)
        context_factors = self._extract_context_factors(decision)
        similar_decisions = self._find_similar_decisions(decision)
        pattern_matches = self._find_pattern_matches(decision)
        uncertainty_notes = self._generate_uncertainty_notes(decision)
        
        return DecisionExplanation(
            decision_id=decision_id,
            timestamp=decision.timestamp,
            primary_explanation=primary_explanation,
            detailed_explanation=detailed_explanation,
            confidence_assessment=confidence_assessment,
            context_factors=context_factors,
            similar_decisions=similar_decisions,
            pattern_matches=pattern_matches,
            uncertainty_notes=uncertainty_notes
        )
    
    def explain_recent_decisions(self, count: int = 5) -> List[DecisionExplanation]:
        """
        Generate explanations for the most recent decisions.
        
        Args:
            count: Number of recent decisions to explain
            
        Returns:
            List of decision explanations
        """
        recent_decisions = self.decision_tracker.get_decision_history(limit=count)
        explanations = []
        
        for decision in recent_decisions:
            explanation = self.explain_decision(decision.decision_id)
            if explanation:
                explanations.append(explanation)
        
        return explanations
    
    def generate_pattern_explanation(self, pattern: BehaviorPattern) -> str:
        """
        Generate an explanation for a detected behavioral pattern.
        
        Args:
            pattern: Behavioral pattern to explain
            
        Returns:
            Human-readable pattern explanation
        """
        template_key = f"pattern_{pattern.pattern_type}"
        template = self._templates.get(template_key, self._templates["pattern_generic"])
        
        # Fill template with pattern data
        explanation = template.format(
            frequency=pattern.frequency,
            confidence=pattern.confidence * 100,
            description=pattern.description,
            pattern_type=pattern.pattern_type.replace("_", " "),
            duration=self._format_duration(pattern.last_seen - pattern.first_seen)
        )
        
        return explanation
    
    def _generate_primary_explanation(self, decision: DecisionRecord) -> str:
        """Generate the primary, concise explanation."""
        try:
            # Analyze the action taken
            action_description = self._describe_action(decision.action)
            
            # Get confidence level
            confidence_level = self._get_confidence_level(decision.confidence_scores)
            
            # Basic explanation template
            if decision.reward is not None:
                if decision.reward > 0:
                    reward_context = "following a positive outcome"
                elif decision.reward < 0:
                    reward_context = "after a negative outcome"
                else:
                    reward_context = "with neutral feedback"
            else:
                reward_context = "based on current observations"
            
            explanation = f"The AI chose to {action_description} with {confidence_level} confidence, {reward_context}."
            
            return explanation
            
        except Exception as e:
            return f"Decision made at {time.strftime('%H:%M:%S', time.localtime(decision.timestamp))}"
    
    def _generate_detailed_explanation(self, decision: DecisionRecord) -> str:
        """Generate a detailed explanation with technical details."""
        try:
            details = []
            
            # Observation analysis
            if decision.observation is not None and len(decision.observation) > 0:
                obs_summary = self._summarize_observation(decision.observation)
                details.append(f"Observation analysis: {obs_summary}")
            
            # Action details
            if decision.action is not None and len(decision.action) > 0:
                action_details = self._analyze_action_details(decision.action)
                details.append(f"Action details: {action_details}")
            
            # Policy network outputs
            if len(decision.policy_logits) > 0:
                policy_analysis = self._analyze_policy_outputs(decision.policy_logits)
                details.append(f"Policy analysis: {policy_analysis}")
            
            # Value estimate
            if decision.value_estimate != 0:
                value_interpretation = self._interpret_value_estimate(decision.value_estimate)
                details.append(f"Value assessment: {value_interpretation}")
            
            return " ".join(details) if details else "Detailed analysis not available."
            
        except Exception as e:
            return "Detailed analysis encountered an error."
    
    def _generate_confidence_assessment(self, decision: DecisionRecord) -> str:
        """Generate confidence assessment text."""
        try:
            confidence_scores = decision.confidence_scores
            
            if not confidence_scores:
                return "Confidence information not available."
            
            # Primary confidence metric
            primary_confidence = None
            confidence_type = None
            
            if "action_confidence" in confidence_scores:
                primary_confidence = confidence_scores["action_confidence"]
                confidence_type = "action selection"
            elif "max_probability" in confidence_scores:
                primary_confidence = confidence_scores["max_probability"]
                confidence_type = "probability distribution"
            elif "certainty" in confidence_scores:
                primary_confidence = confidence_scores["certainty"]
                confidence_type = "decision certainty"
            
            if primary_confidence is not None:
                confidence_level = self._get_confidence_level(confidence_scores)
                confidence_percent = primary_confidence * 100
                
                assessment = f"The AI shows {confidence_level} confidence ({confidence_percent:.1f}%) in this {confidence_type}."
                
                # Add uncertainty information if available
                if "aleatoric_uncertainty" in confidence_scores:
                    uncertainty = confidence_scores["aleatoric_uncertainty"]
                    if uncertainty > 0.5:
                        assessment += " High inherent uncertainty detected in the environment."
                
                if "mc_dropout_uncertainty" in confidence_scores:
                    mc_uncertainty = confidence_scores["mc_dropout_uncertainty"]
                    if mc_uncertainty > 0.3:
                        assessment += " Model uncertainty suggests limited training data for this scenario."
                
                return assessment
            
            return "Confidence assessment based on available metrics."
            
        except Exception as e:
            return "Confidence assessment not available."
    
    def _extract_context_factors(self, decision: DecisionRecord) -> List[str]:
        """Extract contextual factors that influenced the decision."""
        factors = []
        
        try:
            # Episode context
            if decision.episode_id:
                factors.append(f"Episode: {decision.episode_id}")
            
            if decision.step_number is not None:
                factors.append(f"Step: {decision.step_number}")
            
            # Reward context
            if decision.reward is not None:
                if decision.reward > 0:
                    factors.append("Recent positive feedback")
                elif decision.reward < 0:
                    factors.append("Recent negative feedback")
            
            # Observation characteristics
            if decision.observation is not None and len(decision.observation) > 0:
                obs_stats = self._get_observation_stats(decision.observation)
                factors.extend(obs_stats)
            
            # Confidence factors
            if decision.confidence_scores:
                if any(score > 0.8 for score in decision.confidence_scores.values()):
                    factors.append("High confidence scenario")
                elif any(score < 0.3 for score in decision.confidence_scores.values()):
                    factors.append("Low confidence scenario")
            
        except Exception as e:
            factors.append("Context analysis error")
        
        return factors
    
    def _find_similar_decisions(self, decision: DecisionRecord, limit: int = 3) -> List[str]:
        """Find similar past decisions."""
        try:
            # Get recent decision history
            recent_decisions = self.decision_tracker.get_decision_history(limit=50)
            
            if len(recent_decisions) < 2:
                return []
            
            # Calculate similarity scores
            similarities = []
            
            for other_decision in recent_decisions:
                if other_decision.decision_id == decision.decision_id:
                    continue
                
                similarity = self._calculate_decision_similarity(decision, other_decision)
                if similarity > 0.7:  # High similarity threshold
                    similarities.append((other_decision.decision_id, similarity))
            
            # Sort by similarity and return top matches
            similarities.sort(key=lambda x: x[1], reverse=True)
            return [decision_id for decision_id, _ in similarities[:limit]]
            
        except Exception as e:
            return []
    
    def _find_pattern_matches(self, decision: DecisionRecord) -> List[str]:
        """Find behavioral patterns that match this decision."""
        try:
            # Get current patterns
            patterns = self.pattern_analyzer.analyze_patterns()
            
            matching_patterns = []
            
            for pattern in patterns:
                if decision.decision_id in pattern.examples:
                    matching_patterns.append(pattern.pattern_id)
            
            return matching_patterns
            
        except Exception as e:
            return []
    
    def _generate_uncertainty_notes(self, decision: DecisionRecord) -> Optional[str]:
        """Generate notes about decision uncertainty."""
        try:
            uncertainty_factors = []
            
            # Check confidence scores for uncertainty indicators
            if decision.confidence_scores:
                if "entropy" in decision.confidence_scores:
                    entropy = decision.confidence_scores["entropy"]
                    if entropy > 1.0:  # High entropy indicates uncertainty
                        uncertainty_factors.append("high decision entropy")
                
                if "aleatoric_uncertainty" in decision.confidence_scores:
                    aleatoric = decision.confidence_scores["aleatoric_uncertainty"]
                    if aleatoric > 0.5:
                        uncertainty_factors.append("environmental unpredictability")
                
                if "mc_dropout_uncertainty" in decision.confidence_scores:
                    epistemic = decision.confidence_scores["mc_dropout_uncertainty"]
                    if epistemic > 0.3:
                        uncertainty_factors.append("model knowledge limitations")
            
            if uncertainty_factors:
                return f"Uncertainty factors: {', '.join(uncertainty_factors)}"
            
            return None
            
        except Exception as e:
            return None
    
    def _describe_action(self, action: np.ndarray) -> str:
        """Generate a description of the action taken."""
        if action is None or len(action) == 0:
            return "take no action"
        
        # For air traffic control context
        if len(action) == 2:  # Assuming [heading_change, altitude_change]
            heading_change = action[0]
            altitude_change = action[1]
            
            actions = []
            if abs(heading_change) > 0.1:
                direction = "right" if heading_change > 0 else "left"
                actions.append(f"turn {direction}")
            
            if abs(altitude_change) > 0.1:
                direction = "climb" if altitude_change > 0 else "descend"
                actions.append(direction)
            
            if not actions:
                return "maintain current course"
            
            return " and ".join(actions)
        
        # Generic action description
        action_magnitude = np.linalg.norm(action)
        if action_magnitude < 0.1:
            return "make minimal adjustments"
        elif action_magnitude < 0.5:
            return "make moderate adjustments"
        else:
            return "make significant adjustments"
    
    def _get_confidence_level(self, confidence_scores: Dict[str, float]) -> str:
        """Get textual confidence level."""
        if not confidence_scores:
            return "unknown"
        
        # Get primary confidence score
        primary_score = 0.5
        if "action_confidence" in confidence_scores:
            primary_score = confidence_scores["action_confidence"]
        elif "max_probability" in confidence_scores:
            primary_score = confidence_scores["max_probability"]
        elif "certainty" in confidence_scores:
            primary_score = confidence_scores["certainty"]
        
        if primary_score >= 0.8:
            return "high"
        elif primary_score >= 0.6:
            return "moderate"
        elif primary_score >= 0.4:
            return "low"
        else:
            return "very low"
    
    def _calculate_decision_similarity(self, decision1: DecisionRecord, 
                                     decision2: DecisionRecord) -> float:
        """Calculate similarity between two decisions."""
        try:
            similarity_factors = []
            
            # Action similarity
            if (decision1.action is not None and decision2.action is not None and
                len(decision1.action) > 0 and len(decision2.action) > 0):
                action_sim = 1.0 - np.linalg.norm(decision1.action - decision2.action) / 2.0
                similarity_factors.append(max(0, action_sim))
            
            # Confidence similarity
            if decision1.confidence_scores and decision2.confidence_scores:
                conf1 = list(decision1.confidence_scores.values())
                conf2 = list(decision2.confidence_scores.values())
                if conf1 and conf2:
                    conf_sim = 1.0 - abs(np.mean(conf1) - np.mean(conf2))
                    similarity_factors.append(max(0, conf_sim))
            
            # Value estimate similarity
            value_sim = 1.0 - abs(decision1.value_estimate - decision2.value_estimate) / 10.0
            similarity_factors.append(max(0, value_sim))
            
            return np.mean(similarity_factors) if similarity_factors else 0.0
            
        except Exception as e:
            return 0.0
    
    def _initialize_templates(self) -> Dict[str, str]:
        """Initialize explanation templates."""
        return {
            "pattern_action_sequence": "Detected a recurring action sequence pattern with {frequency} occurrences ({confidence:.1f}% confidence). This pattern involves {description} and has been observed over {duration}.",
            
            "pattern_observation_cluster": "Identified a behavioral pattern where similar observations lead to consistent actions ({frequency} instances, {confidence:.1f}% confidence). This suggests the AI has learned to recognize and respond to specific scenario types.",
            
            "pattern_temporal": "Found a temporal decision pattern with {frequency} instances ({confidence:.1f}% confidence). The pattern shows {description} over {duration}.",
            
            "pattern_confidence": "Detected a confidence-related pattern with {frequency} decisions ({confidence:.1f}% confidence). This pattern indicates {description}.",
            
            "pattern_reward_response": "Identified a reward-response pattern with {frequency} occurrences ({confidence:.1f}% confidence). The AI shows {description} in response to feedback.",
            
            "pattern_generic": "Detected a {pattern_type} pattern with {frequency} instances ({confidence:.1f}% confidence): {description}"
        }
    
    def _summarize_observation(self, observation: np.ndarray) -> str:
        """Summarize observation data."""
        try:
            obs_mean = np.mean(observation)
            obs_std = np.std(observation)
            obs_max = np.max(observation)
            obs_min = np.min(observation)
            
            return f"mean={obs_mean:.2f}, std={obs_std:.2f}, range=[{obs_min:.2f}, {obs_max:.2f}]"
        except:
            return "observation data processed"
    
    def _analyze_action_details(self, action: np.ndarray) -> str:
        """Analyze action details."""
        try:
            action_norm = np.linalg.norm(action)
            return f"magnitude={action_norm:.3f}, components={action.tolist()}"
        except:
            return "action executed"
    
    def _analyze_policy_outputs(self, policy_logits: np.ndarray) -> str:
        """Analyze policy network outputs."""
        try:
            if len(policy_logits) > 1:
                max_logit = np.max(policy_logits)
                entropy = -np.sum(np.exp(policy_logits) * policy_logits)
                return f"max_logit={max_logit:.3f}, entropy={entropy:.3f}"
            else:
                return f"output={policy_logits[0]:.3f}" if len(policy_logits) > 0 else "no logits"
        except:
            return "policy outputs processed"
    
    def _interpret_value_estimate(self, value_estimate: float) -> str:
        """Interpret value function estimate."""
        if value_estimate > 1.0:
            return f"positive outlook ({value_estimate:.2f})"
        elif value_estimate < -1.0:
            return f"negative outlook ({value_estimate:.2f})"
        else:
            return f"neutral assessment ({value_estimate:.2f})"
    
    def _get_observation_stats(self, observation: np.ndarray) -> List[str]:
        """Get observation statistics as context factors."""
        try:
            stats = []
            obs_mean = np.mean(observation)
            
            if obs_mean > 0.5:
                stats.append("High activity scenario")
            elif obs_mean < -0.5:
                stats.append("Low activity scenario")
            
            obs_std = np.std(observation)
            if obs_std > 1.0:
                stats.append("High variability environment")
            
            return stats
        except:
            return []
    
    def _format_duration(self, seconds: float) -> str:
        """Format duration in human-readable form."""
        if seconds < 60:
            return f"{seconds:.1f} seconds"
        elif seconds < 3600:
            return f"{seconds/60:.1f} minutes"
        else:
            return f"{seconds/3600:.1f} hours"