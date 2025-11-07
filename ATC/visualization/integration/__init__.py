"""Integration components for connecting event bus with training pipeline."""

from .env_wrapper import EventPublishingEnvWrapper
from .policy_inspector import PolicyInspector

# Lazy import for training callbacks to avoid Ray dependency
def get_training_callback():
    """Get training callback class (requires Ray/RLlib)."""
    from .training_callbacks import TrainingEventCallback
    return TrainingEventCallback

__all__ = ["EventPublishingEnvWrapper", "PolicyInspector", "get_training_callback"]