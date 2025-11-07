"""
Visualization and reasoning components for the Synthetic Tower AI ATC Controller.

This package provides real-time visualization, decision tracking, and automated
reasoning capabilities for the training environment.
"""

__version__ = "0.1.0"

from .callbacks import VisualizationCallback, SimpleLogger
from .viz_server import VisualizationServer
from .replay import EpisodeRecorder, EpisodePlayer, EpisodeBrowser
from .integration import (
    VisualizationManager,
    setup_visualization,
    wrap_env_with_viz,
    with_visualization,
    EnvWrapper,
    TrainingProgressCallback,
    make_rllib_env_with_viz
)

__all__ = [
    # Core components
    'VisualizationCallback',
    'VisualizationServer',
    'SimpleLogger',

    # Replay system
    'EpisodeRecorder',
    'EpisodePlayer',
    'EpisodeBrowser',

    # Integration helpers
    'VisualizationManager',
    'setup_visualization',
    'wrap_env_with_viz',
    'with_visualization',
    'EnvWrapper',
    'TrainingProgressCallback',
    'make_rllib_env_with_viz'
]