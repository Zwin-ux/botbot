"""
Custom neural network models for ATC training.

Future enhancement: Add attention-based model for per-aircraft features.
"""
from typing import Dict, List
import gymnasium as gym
import numpy as np

from ray.rllib.models.torch.torch_modelv2 import TorchModelV2
from ray.rllib.models.torch.misc import SlimFC
from ray.rllib.utils.annotations import override
from ray.rllib.utils.typing import ModelConfigDict, TensorType

import torch
import torch.nn as nn


class AttentionATCModel(TorchModelV2, nn.Module):
    """
    Custom model with attention mechanism for per-aircraft features.

    Architecture:
    1. Separate per-aircraft features from global features
    2. Process per-aircraft features with self-attention
    3. Pool attended features
    4. Concatenate with global features
    5. Feed through policy and value heads
    """

    def __init__(
        self,
        obs_space: gym.spaces.Space,
        action_space: gym.spaces.Space,
        num_outputs: int,
        model_config: ModelConfigDict,
        name: str,
        max_ac: int = 16,
        per_ac_feats: int = 18,
        hidden_dim: int = 128,
        num_heads: int = 4
    ):
        """
        Initialize attention-based ATC model.

        Args:
            obs_space: Observation space
            action_space: Action space
            num_outputs: Number of action outputs
            model_config: Model configuration dict
            name: Model name
            max_ac: Maximum number of aircraft
            per_ac_feats: Features per aircraft
            hidden_dim: Hidden layer dimension
            num_heads: Number of attention heads
        """
        TorchModelV2.__init__(
            self, obs_space, action_space, num_outputs, model_config, name
        )
        nn.Module.__init__(self)

        self.max_ac = max_ac
        self.per_ac_feats = per_ac_feats
        self.hidden_dim = hidden_dim

        # Per-aircraft feature embedding
        self.ac_embed = nn.Linear(per_ac_feats, hidden_dim)

        # Self-attention over aircraft
        self.attention = nn.MultiheadAttention(
            embed_dim=hidden_dim,
            num_heads=num_heads,
            batch_first=True
        )

        # Global feature processing
        self.global_embed = nn.Linear(8, hidden_dim)

        # Combined processing
        self.fc1 = nn.Linear(hidden_dim * 2, hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, hidden_dim)

        # Policy head
        self.policy_head = nn.Linear(hidden_dim, num_outputs)

        # Value head
        self.value_head = nn.Linear(hidden_dim, 1)

        self._value_out = None

    @override(TorchModelV2)
    def forward(
        self,
        input_dict: Dict[str, TensorType],
        state: List[TensorType],
        seq_lens: TensorType
    ) -> tuple:
        """
        Forward pass.

        Args:
            input_dict: Input dictionary with 'obs' key
            state: RNN state (unused)
            seq_lens: Sequence lengths (unused)

        Returns:
            Tuple of (policy_logits, state)
        """
        obs = input_dict["obs"].float()
        batch_size = obs.shape[0]

        # Split observation into per-aircraft and global features
        per_ac_size = self.max_ac * self.per_ac_feats
        per_ac_feats = obs[:, :per_ac_size].reshape(
            batch_size, self.max_ac, self.per_ac_feats
        )
        global_feats = obs[:, per_ac_size:]

        # Embed per-aircraft features
        ac_embedded = torch.relu(self.ac_embed(per_ac_feats))

        # Self-attention (batch_first=True)
        ac_attended, _ = self.attention(
            ac_embedded, ac_embedded, ac_embedded
        )

        # Pool attended features (mean pooling)
        ac_pooled = torch.mean(ac_attended, dim=1)

        # Embed global features
        global_embedded = torch.relu(self.global_embed(global_feats))

        # Concatenate
        combined = torch.cat([ac_pooled, global_embedded], dim=-1)

        # Shared layers
        x = torch.relu(self.fc1(combined))
        x = torch.relu(self.fc2(x))

        # Policy output
        policy_out = self.policy_head(x)

        # Value output (store for value_function call)
        self._value_out = self.value_head(x).squeeze(-1)

        return policy_out, state

    @override(TorchModelV2)
    def value_function(self) -> TensorType:
        """Return value function output from last forward pass."""
        assert self._value_out is not None, "Must call forward() first"
        return self._value_out
