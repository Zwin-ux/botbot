"""
RLlib PPO training script for ATC environment.

Usage:
    python train/train_rllib.py --cpus 8 --gpus 0
"""
import os
import sys
import argparse
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import ray
from ray import air, tune
from ray.rllib.algorithms.ppo import PPOConfig
from ray.tune.registry import register_env

from st_env.env import SyntheticTowerEnv


def make_env(config):
    """
    Environment factory for RLlib.

    Args:
        config: Environment configuration dict

    Returns:
        SyntheticTowerEnv instance
    """
    return SyntheticTowerEnv(
        scenario=config.get("scenario", "scenarios/straight_4.scn"),
        step_seconds=config.get("step_seconds", 5.0),
        seed=config.get("seed", 0),
        horizon=config.get("horizon", 400)
    )


def main():
    """Main training loop."""
    parser = argparse.ArgumentParser(
        description="Train PPO agent for ATC control"
    )
    parser.add_argument(
        "--cpus",
        type=int,
        default=8,
        help="Number of CPUs to use"
    )
    parser.add_argument(
        "--gpus",
        type=int,
        default=0,
        help="Number of GPUs to use"
    )
    parser.add_argument(
        "--iterations",
        type=int,
        default=1000,
        help="Number of training iterations"
    )
    parser.add_argument(
        "--checkpoint-freq",
        type=int,
        default=10,
        help="Checkpoint frequency (iterations)"
    )
    parser.add_argument(
        "--checkpoint-dir",
        type=str,
        default="./checkpoints",
        help="Directory for checkpoints"
    )
    parser.add_argument(
        "--scenario",
        type=str,
        default="scenarios/straight_4.scn",
        help="Scenario file path"
    )
    args = parser.parse_args()

    # Create checkpoint directory
    os.makedirs(args.checkpoint_dir, exist_ok=True)

    # Initialize Ray
    ray.init(ignore_reinit_error=True)

    # Register environment
    register_env("SyntheticTowerEnv", make_env)

    # Configure PPO
    config = (
        PPOConfig()
        .environment(
            "SyntheticTowerEnv",
            env_config={
                "scenario": args.scenario,
                "step_seconds": 5.0,
                "seed": 0,
                "horizon": 400
            }
        )
        .framework("torch")
        .rollouts(
            num_rollout_workers=max(args.cpus - 1, 1),
            rollout_fragment_length=128
        )
        .training(
            gamma=0.995,
            lr=3e-4,
            kl_coeff=0.2,
            train_batch_size=32768,
            sgd_minibatch_size=2048,
            num_sgd_iter=8,
            vf_clip_param=10.0,
            clip_param=0.2,
            entropy_coeff=0.01,
            use_gae=True,
            lambda_=0.95,
        )
        .resources(num_gpus=args.gpus)
        .debugging(log_level="INFO")
    )

    # Build algorithm
    algo = config.build()

    print(f"Starting PPO training for {args.iterations} iterations")
    print(f"Checkpoints will be saved to: {args.checkpoint_dir}")
    print(f"Scenario: {args.scenario}")
    print(f"Workers: {max(args.cpus - 1, 1)}, GPUs: {args.gpus}")
    print("-" * 80)

    # Training loop
    for i in range(args.iterations):
        result = algo.train()

        # Extract key metrics
        episode_reward_mean = result.get("episode_reward_mean", float("nan"))
        episode_len_mean = result.get("episode_len_mean", float("nan"))
        num_episodes = result.get("episodes_this_iter", 0)

        print(
            f"Iter {i:4d} | "
            f"Reward: {episode_reward_mean:8.2f} | "
            f"Len: {episode_len_mean:6.1f} | "
            f"Episodes: {num_episodes:4d}"
        )

        # Save checkpoint periodically
        if (i + 1) % args.checkpoint_freq == 0:
            checkpoint = algo.save(checkpoint_dir=args.checkpoint_dir)
            print(f"  ✓ Checkpoint saved: {checkpoint}")

        # Log additional metrics if available
        if "custom_metrics" in result:
            custom = result["custom_metrics"]
            if custom:
                print(f"    Custom metrics: {custom}")

    # Final checkpoint
    final_checkpoint = algo.save(checkpoint_dir=args.checkpoint_dir)
    print("-" * 80)
    print(f"Training complete! Final checkpoint: {final_checkpoint}")

    # Cleanup
    algo.stop()
    ray.shutdown()


if __name__ == "__main__":
    main()
