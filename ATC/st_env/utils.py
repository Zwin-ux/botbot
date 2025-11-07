"""Utility functions for ATC environment."""
import numpy as np
from typing import List, Dict, Any, Tuple


def normalize_angle(a: float) -> float:
    """
    Normalize angle to [-π, π].

    Args:
        a: Angle in radians

    Returns:
        Normalized angle in [-π, π]
    """
    return (a + np.pi) % (2 * np.pi) - np.pi


def pairwise_min_separation_nm(states: List[Dict[str, Any]]) -> Tuple[float, int]:
    """
    Calculate minimum separation between all aircraft pairs and count LoS events.

    Separation minima: 5 NM lateral OR 1000 ft vertical.
    LoS = loss of separation (both violated).

    Args:
        states: List of aircraft state dictionaries with keys:
            x_nm, y_nm, alt_ft, alive

    Returns:
        Tuple of (minimum_separation_nm, loss_of_separation_count)
    """
    min_sep = 1e9
    los_count = 0

    for i in range(len(states)):
        for j in range(i + 1, len(states)):
            ai, aj = states[i], states[j]

            # Only check live aircraft
            if not (ai.get("alive", True) and aj.get("alive", True)):
                continue

            # Calculate lateral separation in NM
            d_nm = np.hypot(ai["x_nm"] - aj["x_nm"], ai["y_nm"] - aj["y_nm"])

            # Calculate vertical separation in ft
            d_ft = abs(ai["alt_ft"] - aj["alt_ft"])

            # Track minimum separation
            min_sep = min(min_sep, d_nm)

            # Check for loss of separation (both lateral AND vertical violated)
            if d_nm < 5.0 and d_ft < 1000.0:
                los_count += 1

    return (min_sep if min_sep < 1e9 else 999.0), los_count


def compute_bearing_range(
    from_x: float, from_y: float, to_x: float, to_y: float
) -> Tuple[float, float]:
    """
    Calculate bearing and range from one point to another.

    Args:
        from_x: Starting x position in NM
        from_y: Starting y position in NM
        to_x: Target x position in NM
        to_y: Target y position in NM

    Returns:
        Tuple of (bearing_rad, range_nm)
    """
    dx = to_x - from_x
    dy = to_y - from_y
    bearing = np.arctan2(dy, dx)
    range_nm = np.hypot(dx, dy)
    return bearing, range_nm
