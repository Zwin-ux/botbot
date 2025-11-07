"""Reward computation for ATC environment."""
import numpy as np
from typing import List, Dict, Any, Tuple

# Separation minima
SEP_NM = 5.0  # Lateral separation minimum (nautical miles)
NEAR_NM = 6.0  # Near miss lateral threshold
SEP_FT = 1000.0  # Vertical separation minimum (feet)
NEAR_FT = 1200.0  # Near miss vertical threshold


def _sep_violation(a: Dict[str, Any], b: Dict[str, Any]) -> bool:
    """
    Check if two aircraft have violated separation minima.

    Args:
        a: First aircraft state
        b: Second aircraft state

    Returns:
        True if separation violated (both lateral AND vertical)
    """
    d_nm = np.hypot(a["x_nm"] - b["x_nm"], a["y_nm"] - b["y_nm"])
    d_ft = abs(a["alt_ft"] - b["alt_ft"])
    return d_nm < SEP_NM and d_ft < SEP_FT


def _near(a: Dict[str, Any], b: Dict[str, Any]) -> bool:
    """
    Check if two aircraft are in near-miss proximity.

    Args:
        a: First aircraft state
        b: Second aircraft state

    Returns:
        True if within near-miss thresholds
    """
    d_nm = np.hypot(a["x_nm"] - b["x_nm"], a["y_nm"] - b["y_nm"])
    d_ft = abs(a["alt_ft"] - b["alt_ft"])
    return d_nm < NEAR_NM and d_ft < NEAR_FT


def compute_reward(
    prev_states: List[Dict[str, Any]],
    cur_states: List[Dict[str, Any]],
    min_sep_nm: float,
    los_count: int,
    alive_mask: np.ndarray
) -> Tuple[float, Dict[str, float]]:
    """
    Compute reward for the current time step.

    Reward components:
    - Safety: Large penalties for LoS and near misses
    - Progress: Reward for moving aircraft toward goals
    - Smoothness: Small penalty for large control changes
    - Fuel/efficiency: Penalty for inefficient paths
    - Terminal: Bonus for successful exits
    - Catastrophe: Hard penalty for multiple simultaneous LoS

    Args:
        prev_states: Aircraft states from previous step
        cur_states: Aircraft states from current step
        min_sep_nm: Minimum separation distance in NM
        los_count: Number of loss-of-separation events
        alive_mask: Boolean mask of alive aircraft

    Returns:
        Tuple of (total_reward, reward_components_dict)
    """
    r = 0.0
    comps = {
        "los": 0.0,
        "near": 0.0,
        "progress": 0.0,
        "smooth": 0.0,
        "fuel": 0.0,
        "terminal": 0.0,
        "catastrophe": 0.0
    }

    # Safety penalties
    comps["los"] = -10.0 * los_count

    if min_sep_nm < NEAR_NM:
        comps["near"] = -2.0

    # Progress toward goals
    prog = 0.0
    terminal_bonus = 0.0

    for i, (a_prev, a_cur) in enumerate(zip(prev_states, cur_states)):
        if i >= len(cur_states):
            break

        # Skip dead aircraft
        if not a_cur.get("alive", True):
            # Check if aircraft just exited (was alive, now dead)
            if a_prev.get("alive", True):
                # Award terminal bonus if within reasonable bounds
                gx, gy = a_cur["goal_x_nm"], a_cur["goal_y_nm"]
                final_range = np.hypot(gx - a_cur["x_nm"], gy - a_cur["y_nm"])
                if final_range < 5.0:  # Exited near goal
                    terminal_bonus += 5.0
            continue

        gx, gy = a_cur["goal_x_nm"], a_cur["goal_y_nm"]

        # Calculate progress toward goal
        prev_range = np.hypot(gx - a_prev["x_nm"], gy - a_prev["y_nm"])
        cur_range = np.hypot(gx - a_cur["x_nm"], gy - a_cur["y_nm"])
        delta_range = prev_range - cur_range  # Positive = closer

        prog += delta_range  # NM closer

    comps["progress"] = 0.05 * prog
    comps["terminal"] = terminal_bonus

    # Smoothness proxy
    # Note: Would need action history to penalize large Δactions
    # Placeholder for now
    comps["smooth"] = 0.0

    # Fuel/efficiency placeholder
    # Could penalize altitude changes, turns, speed changes
    comps["fuel"] = 0.0

    # Catastrophe gate: multiple simultaneous LoS = hard failure
    if los_count >= 2:
        comps["catastrophe"] = -10.0

    # Sum components
    r = sum(comps.values())

    # Clip to prevent extreme values
    r = float(np.clip(r, -20.0, +5.0))

    return r, comps
