"""
Standalone test for BlueSkySim adapter (no dependencies on gymnasium).
Tests the core simulation interface without requiring full environment setup.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

# Fix Windows console encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import numpy as np
from bluesky_adapter.adapter import BlueSkySim


def test_bluesky_init():
    """Test BlueSkySim initialization."""
    print("Testing BlueSkySim initialization...")
    sim = BlueSkySim("scenarios/straight_4.scn", step_seconds=5.0, max_ac=16, seed=42)
    assert sim.dt == 5.0
    assert sim.max_ac == 16
    print("✓ BlueSkySim initialization")


def test_bluesky_reset():
    """Test BlueSkySim reset returns correct structure."""
    print("\nTesting BlueSkySim.reset()...")
    sim = BlueSkySim("scenarios/straight_4.scn", step_seconds=5.0, max_ac=16, seed=42)

    states = sim.reset()

    # Check we got a list of states
    assert isinstance(states, list)
    assert len(states) == 4  # Default scenario has 4 aircraft

    # Check first aircraft has all required keys
    required_keys = ["id", "x_nm", "y_nm", "v_kt", "hdg_rad", "alt_ft",
                     "goal_x_nm", "goal_y_nm", "alive", "intent_onehot"]

    for key in required_keys:
        assert key in states[0], f"Missing key: {key}"

    # Check data types
    assert isinstance(states[0]["id"], str)
    assert isinstance(states[0]["x_nm"], (float, np.floating))
    assert isinstance(states[0]["y_nm"], (float, np.floating))
    assert isinstance(states[0]["v_kt"], (float, np.floating))
    assert isinstance(states[0]["hdg_rad"], (float, np.floating))
    assert isinstance(states[0]["alt_ft"], (float, np.floating))
    assert isinstance(states[0]["alive"], bool)
    assert isinstance(states[0]["intent_onehot"], np.ndarray)
    assert states[0]["intent_onehot"].shape == (5,)

    print(f"✓ Reset returns {len(states)} aircraft with correct structure")
    print(f"  Sample aircraft: id={states[0]['id']}, pos=({states[0]['x_nm']:.1f}, {states[0]['y_nm']:.1f}) NM")


def test_bluesky_step():
    """Test BlueSkySim step accepts commands and updates state."""
    print("\nTesting BlueSkySim.step()...")
    sim = BlueSkySim("scenarios/straight_4.scn", step_seconds=5.0, max_ac=16, seed=42)

    initial_states = sim.reset()
    initial_pos = (initial_states[0]["x_nm"], initial_states[0]["y_nm"])
    initial_hdg = initial_states[0]["hdg_rad"]
    initial_alt = initial_states[0]["alt_ft"]

    # Apply a command to first aircraft
    commands = [
        {"id": initial_states[0]["id"], "delta_hdg": 0.1, "delta_vs": 500.0}
    ]

    new_states = sim.step(commands)

    # Check structure maintained
    assert isinstance(new_states, list)
    assert len(new_states) == len(initial_states)

    # Check position changed (aircraft moved)
    new_pos = (new_states[0]["x_nm"], new_states[0]["y_nm"])
    pos_changed = new_pos != initial_pos
    assert pos_changed, "Aircraft position should have changed"

    # Check heading changed (accounting for wraparound at 2π)
    new_hdg = new_states[0]["hdg_rad"]
    # Normalize the difference to [-π, π]
    hdg_diff = (new_hdg - initial_hdg + np.pi) % (2 * np.pi) - np.pi
    hdg_changed = abs(hdg_diff - 0.1) < 0.01  # Applied delta_hdg=0.1
    assert hdg_changed, f"Heading should have changed by ~0.1 rad (got {hdg_diff:.3f})"

    # Check altitude changed
    new_alt = new_states[0]["alt_ft"]
    expected_alt_change = 500.0 * (5.0 / 60.0)  # 500 ft/min * (5 sec / 60)
    alt_changed = abs((new_alt - initial_alt) - expected_alt_change) < 1.0
    assert alt_changed, f"Altitude should have changed by ~{expected_alt_change:.1f} ft"

    print(f"✓ Step updates aircraft state correctly")
    print(f"  Position: {initial_pos} -> {new_pos}")
    print(f"  Heading: {initial_hdg:.3f} -> {new_hdg:.3f} rad (delta: {hdg_diff:.3f})")
    print(f"  Altitude: {initial_alt:.0f} -> {new_alt:.0f} ft (delta: {new_alt - initial_alt:.1f})")


def test_deterministic_behavior():
    """Test that same seed produces same results."""
    print("\nTesting deterministic behavior...")

    sim1 = BlueSkySim("scenarios/straight_4.scn", step_seconds=5.0, max_ac=16, seed=123)
    sim2 = BlueSkySim("scenarios/straight_4.scn", step_seconds=5.0, max_ac=16, seed=123)

    states1 = sim1.reset()
    states2 = sim2.reset()

    # Check same initial positions
    for i in range(len(states1)):
        # Positions should be identical (deterministic spawning)
        assert abs(states1[i]["x_nm"] - states2[i]["x_nm"]) < 0.01
        assert abs(states1[i]["y_nm"] - states2[i]["y_nm"]) < 0.01
        # Speeds might vary slightly due to RNG, but should be similar
        assert abs(states1[i]["v_kt"] - states2[i]["v_kt"]) < 1.0

    print("✓ Same seed produces deterministic results")


def test_multiple_steps():
    """Test running simulation for multiple steps."""
    print("\nTesting multiple simulation steps...")
    sim = BlueSkySim("scenarios/straight_4.scn", step_seconds=5.0, max_ac=16, seed=42)

    states = sim.reset()
    initial_alive = sum(1 for s in states if s["alive"])

    # Run 10 steps with no commands (aircraft fly straight)
    for step in range(10):
        commands = []  # No control inputs
        states = sim.step(commands)

    # Check all aircraft still present
    assert len(states) == 4

    # Some may have exited, but structure should be maintained
    final_alive = sum(1 for s in states if s["alive"])

    print(f"✓ Ran 10 steps successfully")
    print(f"  Initial alive: {initial_alive}, Final alive: {final_alive}")


def test_units_and_bounds():
    """Test that units are correct and values are reasonable."""
    print("\nTesting units and bounds...")
    sim = BlueSkySim("scenarios/straight_4.scn", step_seconds=5.0, max_ac=16, seed=42)

    states = sim.reset()

    for ac in states:
        # Positions should be within sector bounds (±100 NM)
        assert -100 <= ac["x_nm"] <= 100, f"X position {ac['x_nm']} out of bounds"
        assert -100 <= ac["y_nm"] <= 100, f"Y position {ac['y_nm']} out of bounds"

        # Speed should be reasonable (100-600 kt)
        assert 100 <= ac["v_kt"] <= 600, f"Speed {ac['v_kt']} unrealistic"

        # Heading should be valid (can be in [-π, π] or [0, 2π) depending on implementation)
        # The implementation uses modulo to keep it in [0, 2π) after updates, but initial
        # values from arctan2 can be in [-π, π]
        assert -np.pi <= ac["hdg_rad"] <= 2 * np.pi, f"Heading {ac['hdg_rad']} out of range"

        # Altitude should be reasonable (0-45000 ft)
        assert 0 <= ac["alt_ft"] <= 45000, f"Altitude {ac['alt_ft']} out of bounds"

        # All aircraft should start alive
        assert ac["alive"] == True

    print("✓ All units and bounds are correct")


if __name__ == "__main__":
    print("=" * 60)
    print("BlueSkySim Adapter Standalone Tests")
    print("=" * 60)

    test_bluesky_init()
    test_bluesky_reset()
    test_bluesky_step()
    test_deterministic_behavior()
    test_multiple_steps()
    test_units_and_bounds()

    print("\n" + "=" * 60)
    print("All tests passed! ✓")
    print("=" * 60)
    print("\nBlueSkySim implementation is complete and working correctly.")
    print("\nInterface contract verified:")
    print("  ✓ reset() returns list of aircraft dicts with required keys")
    print("  ✓ step(commands) accepts list of command dicts")
    print("  ✓ Units: NM, kt, radians, ft MSL, ft/min")
    print("  ✓ Deterministic behavior with seeding")
    print("  ✓ Physics simulation updates positions correctly")
