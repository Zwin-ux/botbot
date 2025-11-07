"""Policy inspector for extracting decision information from neural networks."""

import time
import numpy as np
from typing import Dict, Any, Optional, Tuple, List
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.autograd import grad

from ..events import EventBus, get_event_bus
from ..events.event_data import PolicyDecisionEvent


class PolicyInspector:
    """
    Inspects policy networks to extract decision-making information.
    
    This class hooks into policy forward passes to capture observations,
    actions, policy outputs, and confidence scores for decision tracking.
    Enhanced with gradient-based explanations and attention weight extraction.
    """
    
    def __init__(self, event_bus: Optional[EventBus] = None, 
                 sample_rate: float = 0.1, enable_gradients: bool = True):
        """
        Initialize the policy inspector.
        
        Args:
            event_bus: Event bus instance (uses global if None)
            sample_rate: Fraction of decisions to sample (0.0 to 1.0)
            enable_gradients: Whether to compute gradient-based explanations
        """
        self.event_bus = event_bus or get_event_bus()
        self.sample_rate = sample_rate
        self.enable_gradients = enable_gradients
        self._decision_count = 0
        
        # Cache for model activations
        self._activation_cache = {}
        self._hooks = []
        
    def inspect_policy_decision(self, observation: np.ndarray, 
                              action: np.ndarray,
                              policy_output: Dict[str, Any],
                              model: Optional[nn.Module] = None) -> Dict[str, Any]:
        """
        Inspect and publish a policy decision with enhanced analysis.
        
        Args:
            observation: Input observation
            action: Selected action
            policy_output: Policy network output dictionary
            model: Policy model (optional, for advanced inspection)
            
        Returns:
            Dictionary containing inspection results
        """
        self._decision_count += 1
        
        # Sample decisions based on sample rate
        if np.random.random() > self.sample_rate:
            return {"sampled": False}
        
        # Extract policy information
        policy_logits = policy_output.get("action_logits", np.array([]))
        value_estimate = policy_output.get("vf_preds", np.array([0.0]))[0]
        
        # Calculate confidence scores
        confidence_scores = self._calculate_confidence_scores(
            policy_logits, action, policy_output
        )
        
        # Enhanced inspection with model
        inspection_results = {
            "sampled": True,
            "confidence_scores": confidence_scores,
            "policy_logits": policy_logits,
            "value_estimate": value_estimate
        }
        
        if model is not None:
            # Extract attention weights and activations
            attention_weights = self._extract_attention_weights(model, observation)
            if attention_weights is not None:
                inspection_results["attention_weights"] = attention_weights
            
            # Generate gradient-based explanations
            if self.enable_gradients:
                explanations = self._generate_gradient_explanations(
                    model, observation, action, policy_output
                )
                inspection_results.update(explanations)
            
            # Calculate uncertainty quantification
            uncertainty_scores = self._calculate_uncertainty_scores(
                model, observation, policy_output
            )
            inspection_results["uncertainty_scores"] = uncertainty_scores
        
        # Enhanced confidence scores with inspection results
        enhanced_confidence = confidence_scores.copy()
        if "uncertainty_scores" in inspection_results:
            enhanced_confidence.update(inspection_results["uncertainty_scores"])
        
        # Create and publish policy decision event
        decision_event = PolicyDecisionEvent(
            timestamp=time.time(),
            observation=observation,
            action=action,
            policy_logits=policy_logits,
            value_estimate=float(value_estimate),
            confidence_scores=enhanced_confidence
        )
        
        try:
            self.event_bus.publish_async(decision_event)
        except Exception as e:
            print(f"Warning: Failed to publish policy decision event: {e}")
        
        return inspection_results
    
    def _calculate_confidence_scores(self, policy_logits: np.ndarray,
                                   action: np.ndarray,
                                   policy_output: Dict[str, Any]) -> Dict[str, float]:
        """
        Calculate confidence scores for the policy decision.
        
        Args:
            policy_logits: Raw policy network outputs
            action: Selected action
            policy_output: Full policy output dictionary
            
        Returns:
            Dictionary of confidence scores
        """
        confidence_scores = {}
        
        try:
            if len(policy_logits) > 0:
                # For continuous actions, calculate entropy-based confidence
                if "action_dist_inputs" in policy_output:
                    # Assume Gaussian distribution for continuous actions
                    # Higher standard deviation = lower confidence
                    dist_inputs = policy_output["action_dist_inputs"]
                    if len(dist_inputs) >= 2:
                        # Assume first half is means, second half is log_stds
                        mid = len(dist_inputs) // 2
                        log_stds = dist_inputs[mid:]
                        stds = np.exp(log_stds)
                        avg_std = np.mean(stds)
                        confidence_scores["action_confidence"] = float(1.0 / (1.0 + avg_std))
                
                # Softmax probability for discrete-like interpretation
                if len(policy_logits) > 1:
                    probs = self._softmax(policy_logits)
                    max_prob = np.max(probs)
                    entropy = -np.sum(probs * np.log(probs + 1e-8))
                    confidence_scores["max_probability"] = float(max_prob)
                    confidence_scores["entropy"] = float(entropy)
                    confidence_scores["certainty"] = float(1.0 - entropy / np.log(len(probs)))
            
            # Value function confidence (if available)
            if "vf_preds" in policy_output:
                vf_preds = policy_output["vf_preds"]
                if len(vf_preds) > 0:
                    confidence_scores["value_estimate"] = float(vf_preds[0])
            
            # Add default confidence if no specific measures available
            if not confidence_scores:
                confidence_scores["default_confidence"] = 0.5
                
        except Exception as e:
            print(f"Warning: Error calculating confidence scores: {e}")
            confidence_scores["error"] = 0.0
        
        return confidence_scores
    
    def _softmax(self, x: np.ndarray) -> np.ndarray:
        """Apply softmax function to array."""
        exp_x = np.exp(x - np.max(x))  # Subtract max for numerical stability
        return exp_x / np.sum(exp_x)
    
    def set_sample_rate(self, sample_rate: float) -> None:
        """
        Update the sampling rate for decision inspection.
        
        Args:
            sample_rate: New sampling rate (0.0 to 1.0)
        """
        self.sample_rate = max(0.0, min(1.0, sample_rate))
    
    def get_decision_count(self) -> int:
        """Get total number of decisions processed."""
        return self._decision_count
    
    def reset_counters(self) -> None:
        """Reset internal counters."""
        self._decision_count = 0
    
    def _extract_attention_weights(self, model: nn.Module, 
                                 observation: np.ndarray) -> Optional[np.ndarray]:
        """
        Extract attention weights from the model if available.
        
        Args:
            model: Policy network model
            observation: Input observation
            
        Returns:
            Attention weights array or None if not available
        """
        try:
            # Clear previous hooks and cache
            self._clear_hooks()
            self._activation_cache.clear()
            
            # Register hooks for attention layers
            self._register_attention_hooks(model)
            
            # Forward pass to capture activations
            obs_tensor = torch.FloatTensor(observation).unsqueeze(0)
            with torch.no_grad():
                _ = model(obs_tensor)
            
            # Extract attention weights from cache
            attention_weights = None
            for name, activation in self._activation_cache.items():
                if "attention" in name.lower() or "attn" in name.lower():
                    if isinstance(activation, torch.Tensor):
                        attention_weights = activation.detach().cpu().numpy()
                        break
            
            return attention_weights
            
        except Exception as e:
            print(f"Warning: Failed to extract attention weights: {e}")
            return None
        finally:
            self._clear_hooks()
    
    def _generate_gradient_explanations(self, model: nn.Module, 
                                      observation: np.ndarray,
                                      action: np.ndarray,
                                      policy_output: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate gradient-based explanations for the policy decision.
        
        Args:
            model: Policy network model
            observation: Input observation
            action: Selected action
            policy_output: Policy network outputs
            
        Returns:
            Dictionary containing gradient-based explanations
        """
        explanations = {}
        
        try:
            # Convert to tensors
            obs_tensor = torch.FloatTensor(observation).unsqueeze(0)
            obs_tensor.requires_grad_(True)
            
            # Forward pass
            model_output = model(obs_tensor)
            
            # Extract action logits
            if isinstance(model_output, dict):
                action_logits = model_output.get("action_logits", model_output.get("logits"))
            else:
                action_logits = model_output
            
            if action_logits is not None:
                # Calculate gradients with respect to input
                if len(action.shape) > 0 and len(action) > 0:
                    # For continuous actions, use the actual action values
                    if len(action_logits.shape) > 1:
                        action_idx = torch.LongTensor([np.argmax(action)])
                        selected_logit = action_logits[0, action_idx]
                    else:
                        selected_logit = action_logits.mean()
                else:
                    selected_logit = action_logits.mean()
                
                # Compute gradients
                gradients = grad(selected_logit, obs_tensor, 
                               retain_graph=True, create_graph=False)[0]
                
                # Calculate input importance (saliency)
                saliency = torch.abs(gradients).squeeze().detach().cpu().numpy()
                explanations["input_saliency"] = saliency
                
                # Calculate integrated gradients (simplified version)
                integrated_grads = self._calculate_integrated_gradients(
                    model, observation, action_logits
                )
                if integrated_grads is not None:
                    explanations["integrated_gradients"] = integrated_grads
                
        except Exception as e:
            print(f"Warning: Failed to generate gradient explanations: {e}")
        
        return explanations
    
    def _calculate_integrated_gradients(self, model: nn.Module,
                                      observation: np.ndarray,
                                      target_output: torch.Tensor,
                                      steps: int = 20) -> Optional[np.ndarray]:
        """
        Calculate integrated gradients for input attribution.
        
        Args:
            model: Policy network model
            observation: Input observation
            target_output: Target output tensor
            steps: Number of integration steps
            
        Returns:
            Integrated gradients array or None if failed
        """
        try:
            baseline = np.zeros_like(observation)
            integrated_grads = np.zeros_like(observation)
            
            for i in range(steps + 1):
                # Interpolate between baseline and input
                alpha = i / steps
                interpolated_input = baseline + alpha * (observation - baseline)
                
                # Convert to tensor
                input_tensor = torch.FloatTensor(interpolated_input).unsqueeze(0)
                input_tensor.requires_grad_(True)
                
                # Forward pass
                output = model(input_tensor)
                if isinstance(output, dict):
                    output = output.get("action_logits", output.get("logits"))
                
                if output is not None:
                    # Calculate gradient
                    target_score = output.mean()  # Simplified target
                    gradient = grad(target_score, input_tensor, 
                                  retain_graph=False, create_graph=False)[0]
                    
                    # Accumulate gradients
                    integrated_grads += gradient.squeeze().detach().cpu().numpy()
            
            # Scale by input difference and average over steps
            integrated_grads = (observation - baseline) * integrated_grads / steps
            
            return integrated_grads
            
        except Exception as e:
            print(f"Warning: Failed to calculate integrated gradients: {e}")
            return None
    
    def _calculate_uncertainty_scores(self, model: nn.Module,
                                    observation: np.ndarray,
                                    policy_output: Dict[str, Any]) -> Dict[str, float]:
        """
        Calculate uncertainty quantification scores.
        
        Args:
            model: Policy network model
            observation: Input observation
            policy_output: Policy network outputs
            
        Returns:
            Dictionary of uncertainty scores
        """
        uncertainty_scores = {}
        
        try:
            # Monte Carlo Dropout uncertainty (if model has dropout)
            mc_samples = self._monte_carlo_uncertainty(model, observation)
            if mc_samples is not None:
                uncertainty_scores["mc_dropout_uncertainty"] = mc_samples
            
            # Epistemic uncertainty from ensemble disagreement
            # (simplified - would need ensemble of models in practice)
            
            # Aleatoric uncertainty from output distribution
            if "action_dist_inputs" in policy_output:
                dist_inputs = policy_output["action_dist_inputs"]
                if len(dist_inputs) >= 2:
                    # Assume Gaussian: first half means, second half log_stds
                    mid = len(dist_inputs) // 2
                    log_stds = dist_inputs[mid:]
                    stds = np.exp(log_stds)
                    aleatoric_uncertainty = np.mean(stds)
                    uncertainty_scores["aleatoric_uncertainty"] = float(aleatoric_uncertainty)
            
        except Exception as e:
            print(f"Warning: Failed to calculate uncertainty scores: {e}")
        
        return uncertainty_scores
    
    def _monte_carlo_uncertainty(self, model: nn.Module, 
                               observation: np.ndarray,
                               n_samples: int = 10) -> Optional[float]:
        """
        Calculate uncertainty using Monte Carlo dropout.
        
        Args:
            model: Policy network model
            observation: Input observation
            n_samples: Number of MC samples
            
        Returns:
            MC dropout uncertainty score or None
        """
        try:
            # Enable dropout for uncertainty estimation
            model.train()
            
            obs_tensor = torch.FloatTensor(observation).unsqueeze(0)
            predictions = []
            
            with torch.no_grad():
                for _ in range(n_samples):
                    output = model(obs_tensor)
                    if isinstance(output, dict):
                        logits = output.get("action_logits", output.get("logits"))
                    else:
                        logits = output
                    
                    if logits is not None:
                        predictions.append(logits.cpu().numpy())
            
            # Calculate variance across predictions
            if predictions:
                predictions = np.array(predictions)
                uncertainty = np.mean(np.var(predictions, axis=0))
                return float(uncertainty)
            
        except Exception as e:
            print(f"Warning: Failed to calculate MC dropout uncertainty: {e}")
        finally:
            # Reset model to eval mode
            model.eval()
        
        return None
    
    def _register_attention_hooks(self, model: nn.Module) -> None:
        """Register forward hooks to capture attention weights."""
        def hook_fn(name):
            def hook(module, input, output):
                self._activation_cache[name] = output
            return hook
        
        for name, module in model.named_modules():
            if "attention" in name.lower() or "attn" in name.lower():
                handle = module.register_forward_hook(hook_fn(name))
                self._hooks.append(handle)
    
    def _clear_hooks(self) -> None:
        """Clear all registered hooks."""
        for hook in self._hooks:
            hook.remove()
        self._hooks.clear()


# Global policy inspector instance
_global_policy_inspector: Optional[PolicyInspector] = None


def get_policy_inspector() -> PolicyInspector:
    """Get the global policy inspector instance."""
    global _global_policy_inspector
    if _global_policy_inspector is None:
        _global_policy_inspector = PolicyInspector()
    return _global_policy_inspector


def set_policy_inspector(inspector: PolicyInspector) -> None:
    """Set the global policy inspector instance."""
    global _global_policy_inspector
    _global_policy_inspector = inspector