"""
Episode replay system for ATC visualization.

Provides functionality to save, load, and replay training episodes
with full control over playback speed and navigation.
"""
import json
import gzip
import os
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime


class EpisodeRecorder:
    """
    Records episodes to disk for later replay and analysis.

    Episodes are saved as compressed JSON files with metadata.
    """

    def __init__(self, output_dir: str = "./logs/episodes"):
        """
        Initialize episode recorder.

        Args:
            output_dir: Directory to save episode files
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.current_episode: List[Dict[str, Any]] = []
        self.episode_count = 0

    def record_step(self, step_data: Dict[str, Any]):
        """
        Record a single step.

        Args:
            step_data: Step data dictionary
        """
        self.current_episode.append(step_data)

    def save_episode(
        self,
        metadata: Dict[str, Any],
        compress: bool = True
    ) -> str:
        """
        Save the current episode to disk.

        Args:
            metadata: Episode metadata (reward, length, etc.)
            compress: Whether to gzip compress the file

        Returns:
            Path to saved file
        """
        self.episode_count += 1

        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"episode_{self.episode_count:06d}_{timestamp}"

        # Create episode data
        episode_data = {
            "metadata": {
                **metadata,
                "episode_id": self.episode_count,
                "timestamp": timestamp,
                "num_steps": len(self.current_episode)
            },
            "steps": self.current_episode
        }

        # Save to file
        if compress:
            filepath = self.output_dir / f"{filename}.json.gz"
            with gzip.open(filepath, 'wt', encoding='utf-8') as f:
                json.dump(episode_data, f, indent=2)
        else:
            filepath = self.output_dir / f"{filename}.json"
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(episode_data, f, indent=2)

        # Clear current episode
        self.current_episode = []

        return str(filepath)

    def reset_episode(self):
        """Clear current episode buffer."""
        self.current_episode = []


class EpisodePlayer:
    """
    Plays back recorded episodes with speed control.

    Supports seeking, speed adjustment, and step-by-step playback.
    """

    def __init__(self):
        """Initialize episode player."""
        self.episode_data: Optional[Dict[str, Any]] = None
        self.current_step = 0
        self.is_playing = False
        self.playback_speed = 1.0

    def load_episode(self, filepath: str) -> Dict[str, Any]:
        """
        Load an episode from disk.

        Args:
            filepath: Path to episode file

        Returns:
            Episode metadata
        """
        filepath = Path(filepath)

        # Load based on file extension
        if filepath.suffix == '.gz':
            with gzip.open(filepath, 'rt', encoding='utf-8') as f:
                self.episode_data = json.load(f)
        else:
            with open(filepath, 'r', encoding='utf-8') as f:
                self.episode_data = json.load(f)

        self.current_step = 0
        self.is_playing = False

        return self.episode_data['metadata']

    def get_step(self, step_index: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """
        Get data for a specific step.

        Args:
            step_index: Step index (None = current step)

        Returns:
            Step data or None if invalid index
        """
        if self.episode_data is None:
            return None

        idx = step_index if step_index is not None else self.current_step

        if 0 <= idx < len(self.episode_data['steps']):
            return self.episode_data['steps'][idx]

        return None

    def seek(self, step_index: int) -> Optional[Dict[str, Any]]:
        """
        Seek to a specific step.

        Args:
            step_index: Target step index

        Returns:
            Step data at target index
        """
        if self.episode_data is None:
            return None

        self.current_step = max(0, min(step_index, self.get_length() - 1))
        return self.get_step()

    def next_step(self) -> Optional[Dict[str, Any]]:
        """
        Advance to next step.

        Returns:
            Next step data or None if at end
        """
        if self.episode_data is None:
            return None

        if self.current_step < self.get_length() - 1:
            self.current_step += 1
            return self.get_step()

        return None

    def prev_step(self) -> Optional[Dict[str, Any]]:
        """
        Go back to previous step.

        Returns:
            Previous step data or None if at start
        """
        if self.episode_data is None:
            return None

        if self.current_step > 0:
            self.current_step -= 1
            return self.get_step()

        return None

    def get_length(self) -> int:
        """
        Get total number of steps in episode.

        Returns:
            Number of steps
        """
        if self.episode_data is None:
            return 0
        return len(self.episode_data['steps'])

    def get_progress(self) -> float:
        """
        Get playback progress as percentage.

        Returns:
            Progress from 0.0 to 1.0
        """
        length = self.get_length()
        if length == 0:
            return 0.0
        return self.current_step / length

    def set_speed(self, speed: float):
        """
        Set playback speed multiplier.

        Args:
            speed: Speed multiplier (0.5 = half speed, 2.0 = double speed)
        """
        self.playback_speed = max(0.1, min(speed, 10.0))

    def play(self):
        """Start playback."""
        self.is_playing = True

    def pause(self):
        """Pause playback."""
        self.is_playing = False

    def toggle_play(self):
        """Toggle play/pause."""
        self.is_playing = not self.is_playing

    def reset(self):
        """Reset to beginning."""
        self.current_step = 0
        self.is_playing = False


class EpisodeBrowser:
    """
    Browse and manage recorded episodes.

    Provides listing, filtering, and metadata queries.
    """

    def __init__(self, episodes_dir: str = "./logs/episodes"):
        """
        Initialize episode browser.

        Args:
            episodes_dir: Directory containing episode files
        """
        self.episodes_dir = Path(episodes_dir)

    def list_episodes(
        self,
        limit: Optional[int] = None,
        sort_by: str = "timestamp"
    ) -> List[Dict[str, Any]]:
        """
        List available episodes.

        Args:
            limit: Maximum number of episodes to return
            sort_by: Sort field ("timestamp", "reward", "length")

        Returns:
            List of episode metadata dictionaries
        """
        episodes = []

        # Find all episode files
        for filepath in self.episodes_dir.glob("episode_*.json*"):
            try:
                # Load metadata only
                if filepath.suffix == '.gz':
                    with gzip.open(filepath, 'rt', encoding='utf-8') as f:
                        data = json.load(f)
                else:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        data = json.load(f)

                metadata = data['metadata']
                metadata['filepath'] = str(filepath)
                metadata['filesize'] = filepath.stat().st_size

                episodes.append(metadata)

            except Exception as e:
                print(f"Error loading {filepath}: {e}")
                continue

        # Sort episodes
        if sort_by == "timestamp":
            episodes.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        elif sort_by == "reward":
            episodes.sort(key=lambda x: x.get('total_reward', 0), reverse=True)
        elif sort_by == "length":
            episodes.sort(key=lambda x: x.get('episode_length', 0), reverse=True)

        # Apply limit
        if limit is not None:
            episodes = episodes[:limit]

        return episodes

    def search_episodes(
        self,
        min_reward: Optional[float] = None,
        max_reward: Optional[float] = None,
        min_length: Optional[int] = None,
        max_length: Optional[int] = None,
        has_los: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        """
        Search episodes by criteria.

        Args:
            min_reward: Minimum total reward
            max_reward: Maximum total reward
            min_length: Minimum episode length
            max_length: Maximum episode length
            has_los: Filter by presence of LoS events

        Returns:
            List of matching episode metadata
        """
        episodes = self.list_episodes()
        filtered = []

        for ep in episodes:
            # Check reward filter
            if min_reward is not None and ep.get('total_reward', 0) < min_reward:
                continue
            if max_reward is not None and ep.get('total_reward', 0) > max_reward:
                continue

            # Check length filter
            if min_length is not None and ep.get('episode_length', 0) < min_length:
                continue
            if max_length is not None and ep.get('episode_length', 0) > max_length:
                continue

            # Check LoS filter
            if has_los is not None:
                ep_has_los = ep.get('info', {}).get('los', 0) > 0
                if has_los != ep_has_los:
                    continue

            filtered.append(ep)

        return filtered

    def get_best_episodes(self, n: int = 10) -> List[Dict[str, Any]]:
        """
        Get top N episodes by reward.

        Args:
            n: Number of episodes to return

        Returns:
            List of best episode metadata
        """
        return self.list_episodes(limit=n, sort_by="reward")

    def get_worst_episodes(self, n: int = 10) -> List[Dict[str, Any]]:
        """
        Get bottom N episodes by reward.

        Args:
            n: Number of episodes to return

        Returns:
            List of worst episode metadata
        """
        episodes = self.list_episodes(sort_by="reward")
        return episodes[-n:] if len(episodes) >= n else episodes

    def delete_episode(self, filepath: str):
        """
        Delete an episode file.

        Args:
            filepath: Path to episode file
        """
        Path(filepath).unlink()

    def get_statistics(self) -> Dict[str, Any]:
        """
        Get statistics across all episodes.

        Returns:
            Statistics dictionary
        """
        episodes = self.list_episodes()

        if not episodes:
            return {"count": 0}

        rewards = [ep.get('total_reward', 0) for ep in episodes]
        lengths = [ep.get('episode_length', 0) for ep in episodes]

        return {
            "count": len(episodes),
            "total_size_mb": sum(ep.get('filesize', 0) for ep in episodes) / (1024 * 1024),
            "reward": {
                "mean": sum(rewards) / len(rewards),
                "min": min(rewards),
                "max": max(rewards)
            },
            "length": {
                "mean": sum(lengths) / len(lengths),
                "min": min(lengths),
                "max": max(lengths)
            }
        }
