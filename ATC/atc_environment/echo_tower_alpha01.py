"""
Echo Tower Alpha-01 Virtual ATC Environment
Military-style automated simulation with emoji-only interface
"""

import time
import json
import random
import asyncio
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum
import threading
from collections import deque

try:
    import numpy as np
except ImportError:
    print("NumPy not found. Installing...")
    import subprocess
    subprocess.check_call(["pip", "install", "numpy"])
    import numpy as np

from visualization.events import get_event_bus
from visualization.events.event_data import EventData, EventType


class AircraftType(str, Enum):
    """Aircraft types with military priority."""
    MEDEVAC = "medevac"      # Highest priority
    SUPPLY = "supply"        # High priority  
    RECON = "recon"         # Medium priority
    PATROL = "patrol"       # Medium priority
    CIVILIAN = "civilian"   # Lowest priority


class AircraftStatus(str, Enum):
    """Aircraft operational status."""
    INBOUND = "inbound"
    HOLDING = "holding"
    LANDING = "landing"
    TAXIING = "taxiing"
    REFUELING = "refueling"
    TAKEOFF = "takeoff"
    OUTBOUND = "outbound"
    EMERGENCY = "emergency"


class WeatherCondition(str, Enum):
    """Weather conditions affecting operations."""
    CLEAR = "clear"
    CROSSWIND = "crosswind"
    TURBULENCE = "turbulence"
    LOW_VISIBILITY = "low_visibility"
    STORM = "storm"


@dataclass
class Aircraft:
    """Individual aircraft entity with AI behavior."""
    
    # Identity
    callsign: str
    aircraft_type: AircraftType
    
    # Position and movement
    position: Tuple[float, float]  # (x, y) grid coordinates
    heading: float  # degrees
    altitude: float  # feet
    speed: float  # knots
    
    # Status
    status: AircraftStatus
    fuel_level: float  # 0.0 to 1.0
    priority: int  # 1-5 (1 = highest)
    
    # Mission data
    origin: str
    destination: str
    mission_type: str
    
    # AI state
    last_instruction: Optional[str] = None
    compliance_score: float = 1.0  # 0.0 to 1.0
    
    def get_emoji(self) -> str:
        """Get emoji representation based on aircraft type and status."""
        if self.status == AircraftStatus.EMERGENCY:
            return "🚨"
        elif self.aircraft_type == AircraftType.MEDEVAC:
            return "🚁"
        elif self.status in [AircraftStatus.LANDING, AircraftStatus.INBOUND]:
            return "🛬"
        elif self.status in [AircraftStatus.TAKEOFF, AircraftStatus.OUTBOUND]:
            return "🛫"
        else:
            return "✈️"
    
    def get_priority_value(self) -> int:
        """Get numeric priority for scheduling."""
        priority_map = {
            AircraftType.MEDEVAC: 1,
            AircraftType.SUPPLY: 2,
            AircraftType.RECON: 3,
            AircraftType.PATROL: 4,
            AircraftType.CIVILIAN: 5
        }
        return priority_map.get(self.aircraft_type, 5)


@dataclass
class WeatherNode:
    """Weather system affecting airspace."""
    
    position: Tuple[float, float]
    condition: WeatherCondition
    intensity: float  # 0.0 to 1.0
    radius: float  # affected area radius
    duration: float  # remaining duration in seconds
    
    def get_emoji(self) -> str:
        """Get emoji representation of weather condition."""
        emoji_map = {
            WeatherCondition.CLEAR: "☀️",
            WeatherCondition.CROSSWIND: "💨",
            WeatherCondition.TURBULENCE: "🌪️",
            WeatherCondition.LOW_VISIBILITY: "🌫️",
            WeatherCondition.STORM: "⛈️"
        }
        return emoji_map.get(self.condition, "🌩️")


@dataclass
class Runway:
    """Runway with operational status."""
    
    id: str
    position: Tuple[float, float]
    heading: float  # runway orientation
    length: float  # feet
    is_active: bool = True
    occupied_by: Optional[str] = None  # aircraft callsign
    
    def get_emoji(self) -> str:
        """Get emoji representation of runway status."""
        if not self.is_active:
            return "🚫"
        elif self.occupied_by:
            return "🛬"
        else:
            return "🛫"


class EchoTowerAlpha01:
    """
    Echo Tower Alpha-01 Virtual ATC Environment
    
    Military-style automated ATC simulation with AI agents for:
    - Traffic scheduling and conflict resolution
    - Weather impact assessment
    - Resource management
    - Communications simulation
    """
    
    def __init__(self, grid_size: Tuple[int, int] = (20, 15)):
        """
        Initialize the Echo Tower Alpha-01 environment.
        
        Args:
            grid_size: (width, height) of the simulation grid
        """
        self.grid_size = grid_size
        self.simulation_time = 0.0
        self.running = False
        
        # Core infrastructure
        self.tower_position = (10, 7)  # Center of grid
        self.ai_core_position = (9, 7)
        self.radar_position = (11, 7)
        
        # Runways
        self.runways = {
            "RWY01": Runway("RWY01", (5, 7), 90, 8000),   # East-West
            "RWY02": Runway("RWY02", (15, 7), 90, 10000)  # East-West
        }
        
        # Infrastructure positions
        self.hangar_position = (3, 10)
        self.refuel_position = (17, 10)
        
        # Active entities
        self.aircraft: Dict[str, Aircraft] = {}
        self.weather_nodes: List[WeatherNode] = []
        
        # AI subsystems
        self.traffic_scheduler = TrafficScheduler(self)
        self.conflict_resolver = ConflictResolver(self)
        self.weather_engine = WeatherEngine(self)
        self.comms_ai = CommsAI(self)
        
        # Event tracking
        self.event_bus = get_event_bus()
        self.metrics = {
            "total_operations": 0,
            "safety_violations": 0,
            "average_delay": 0.0,
            "fuel_efficiency": 1.0
        }
        
        # Simulation state
        self.grid_display = [[" " for _ in range(grid_size[0])] for _ in range(grid_size[1])]
        
        print("Echo Tower Alpha-01 initialized")
    
    def get_environment_schema(self) -> Dict[str, Any]:
        """Get complete environment state as JSON schema."""
        return {
            "environment_id": "echo_tower_alpha_01",
            "grid_size": self.grid_size,
            "simulation_time": self.simulation_time,
            "infrastructure": {
                "tower": {"position": self.tower_position, "emoji": "🏢"},
                "ai_core": {"position": self.ai_core_position, "emoji": "🧠"},
                "radar": {"position": self.radar_position, "emoji": "🛰️"},
                "hangar": {"position": self.hangar_position, "emoji": "🛩️"},
                "refuel": {"position": self.refuel_position, "emoji": "⛽"}
            },
            "runways": {
                runway_id: {
                    "position": runway.position,
                    "heading": runway.heading,
                    "active": runway.is_active,
                    "occupied": runway.occupied_by,
                    "emoji": runway.get_emoji()
                }
                for runway_id, runway in self.runways.items()
            },
            "aircraft": {
                callsign: {
                    **asdict(aircraft),
                    "emoji": aircraft.get_emoji()
                }
                for callsign, aircraft in self.aircraft.items()
            },
            "weather": [
                {
                    **asdict(node),
                    "emoji": node.get_emoji()
                }
                for node in self.weather_nodes
            ],
            "metrics": self.metrics
        }
    
    def spawn_aircraft(self, callsign: str, aircraft_type: AircraftType, 
                      origin: str, destination: str, mission_type: str) -> Aircraft:
        """Spawn a new aircraft in the environment."""
        # Random spawn position at grid edge
        if random.choice([True, False]):  # Spawn from east or west
            x = 0 if random.choice([True, False]) else self.grid_size[0] - 1
            y = random.randint(2, self.grid_size[1] - 3)
        else:  # Spawn from north or south
            x = random.randint(2, self.grid_size[0] - 3)
            y = 0 if random.choice([True, False]) else self.grid_size[1] - 1
        
        aircraft = Aircraft(
            callsign=callsign,
            aircraft_type=aircraft_type,
            position=(x, y),
            heading=random.uniform(0, 360),
            altitude=random.uniform(1000, 5000),
            speed=random.uniform(120, 250),
            status=AircraftStatus.INBOUND,
            fuel_level=random.uniform(0.3, 1.0),
            priority=aircraft_type.value,
            origin=origin,
            destination=destination,
            mission_type=mission_type
        )
        
        self.aircraft[callsign] = aircraft
        
        # Notify AI systems
        self.traffic_scheduler.register_aircraft(aircraft)
        
        print(f"Aircraft {callsign} spawned: {aircraft_type.value} mission")
        return aircraft
    
    def update_grid_display(self):
        """Update the emoji grid display."""
        # Clear grid
        for y in range(self.grid_size[1]):
            for x in range(self.grid_size[0]):
                self.grid_display[y][x] = " "
        
        # Place infrastructure
        self.grid_display[self.tower_position[1]][self.tower_position[0]] = "🏢"
        self.grid_display[self.ai_core_position[1]][self.ai_core_position[0]] = "🧠"
        self.grid_display[self.radar_position[1]][self.radar_position[0]] = "🛰️"
        self.grid_display[self.hangar_position[1]][self.hangar_position[0]] = "🛩️"
        self.grid_display[self.refuel_position[1]][self.refuel_position[0]] = "⛽"
        
        # Place runways
        for runway in self.runways.values():
            x, y = int(runway.position[0]), int(runway.position[1])
            if 0 <= x < self.grid_size[0] and 0 <= y < self.grid_size[1]:
                self.grid_display[y][x] = runway.get_emoji()
        
        # Place weather nodes
        for node in self.weather_nodes:
            x, y = int(node.position[0]), int(node.position[1])
            if 0 <= x < self.grid_size[0] and 0 <= y < self.grid_size[1]:
                self.grid_display[y][x] = node.get_emoji()
        
        # Place aircraft
        for aircraft in self.aircraft.values():
            x, y = int(aircraft.position[0]), int(aircraft.position[1])
            if 0 <= x < self.grid_size[0] and 0 <= y < self.grid_size[1]:
                self.grid_display[y][x] = aircraft.get_emoji()
    
    def get_grid_string(self) -> str:
        """Get string representation of the grid."""
        self.update_grid_display()
        
        lines = []
        lines.append("Echo Tower Alpha-01 🏢")
        lines.append("=" * (self.grid_size[0] + 2))
        
        for y in range(self.grid_size[1]):
            line = "|" + "".join(self.grid_display[y]) + "|"
            lines.append(line)
        
        lines.append("=" * (self.grid_size[0] + 2))
        
        # Add status information
        lines.append(f"Time: {self.simulation_time:.1f}s | Aircraft: {len(self.aircraft)} | Weather: {len(self.weather_nodes)}")
        lines.append(f"Operations: {self.metrics['total_operations']} | Violations: {self.metrics['safety_violations']}")
        
        return "\n".join(lines)
    
    def step(self, dt: float = 1.0):
        """Execute one simulation step."""
        self.simulation_time += dt
        
        # Update AI subsystems
        self.traffic_scheduler.update(dt)
        self.conflict_resolver.update(dt)
        self.weather_engine.update(dt)
        
        # Update aircraft positions and states
        for aircraft in list(self.aircraft.values()):
            self._update_aircraft(aircraft, dt)
        
        # Remove completed aircraft
        completed = [
            callsign for callsign, aircraft in self.aircraft.items()
            if aircraft.status == AircraftStatus.OUTBOUND and 
            (aircraft.position[0] < 0 or aircraft.position[0] >= self.grid_size[0] or
             aircraft.position[1] < 0 or aircraft.position[1] >= self.grid_size[1])
        ]
        
        for callsign in completed:
            del self.aircraft[callsign]
            self.metrics["total_operations"] += 1
    
    def _update_aircraft(self, aircraft: Aircraft, dt: float):
        """Update individual aircraft state."""
        # Simple movement simulation
        if aircraft.status in [AircraftStatus.INBOUND, AircraftStatus.OUTBOUND]:
            # Move towards target
            target = self._get_aircraft_target(aircraft)
            if target:
                dx = target[0] - aircraft.position[0]
                dy = target[1] - aircraft.position[1]
                distance = np.sqrt(dx*dx + dy*dy)
                
                if distance > 0.5:
                    # Move towards target
                    speed_factor = aircraft.speed / 200.0 * dt
                    new_x = aircraft.position[0] + (dx / distance) * speed_factor
                    new_y = aircraft.position[1] + (dy / distance) * speed_factor
                    aircraft.position = (new_x, new_y)
                else:
                    # Reached target
                    if aircraft.status == AircraftStatus.INBOUND:
                        aircraft.status = AircraftStatus.LANDING
        
        # Update fuel
        aircraft.fuel_level -= dt * 0.001  # Consume fuel over time
        
        # Check for low fuel emergency
        if aircraft.fuel_level < 0.1 and aircraft.status != AircraftStatus.EMERGENCY:
            aircraft.status = AircraftStatus.EMERGENCY
            aircraft.priority = 1  # Highest priority
    
    def _get_aircraft_target(self, aircraft: Aircraft) -> Optional[Tuple[float, float]]:
        """Get target position for aircraft based on status."""
        if aircraft.status == AircraftStatus.INBOUND:
            # Target nearest available runway
            available_runways = [r for r in self.runways.values() if r.is_active and not r.occupied_by]
            if available_runways:
                return min(available_runways, key=lambda r: 
                          np.sqrt((r.position[0] - aircraft.position[0])**2 + 
                                 (r.position[1] - aircraft.position[1])**2)).position
        elif aircraft.status == AircraftStatus.OUTBOUND:
            # Target grid edge
            if aircraft.position[0] < self.grid_size[0] / 2:
                return (0, aircraft.position[1])
            else:
                return (self.grid_size[0] - 1, aircraft.position[1])
        
        return None
    
    async def run_simulation(self, duration: float = 300.0):
        """Run the simulation for specified duration."""
        self.running = True
        start_time = time.time()
        
        print(f"Starting Echo Tower Alpha-01 simulation for {duration}s")
        
        # Spawn initial aircraft
        self._spawn_initial_aircraft()
        
        while self.running and (time.time() - start_time) < duration:
            # Execute simulation step
            self.step(1.0)
            
            # Randomly spawn new aircraft
            if random.random() < 0.1:  # 10% chance per second
                self._spawn_random_aircraft()
            
            # Print status every 10 seconds
            if int(self.simulation_time) % 10 == 0:
                print(self.get_grid_string())
                print()
            
            await asyncio.sleep(1.0)
        
        print("Simulation completed")
    
    def _spawn_initial_aircraft(self):
        """Spawn initial aircraft for simulation."""
        initial_aircraft = [
            ("MEDEVAC01", AircraftType.MEDEVAC, "Field Hospital", "Echo Base", "medical_evacuation"),
            ("SUPPLY07", AircraftType.SUPPLY, "Supply Depot", "Echo Base", "cargo_delivery"),
            ("RECON03", AircraftType.RECON, "Echo Base", "Sector 7", "reconnaissance"),
            ("PATROL12", AircraftType.PATROL, "Echo Base", "Border Zone", "patrol_mission")
        ]
        
        for callsign, aircraft_type, origin, dest, mission in initial_aircraft:
            self.spawn_aircraft(callsign, aircraft_type, origin, dest, mission)
    
    def _spawn_random_aircraft(self):
        """Spawn a random aircraft."""
        aircraft_types = list(AircraftType)
        aircraft_type = random.choice(aircraft_types)
        
        callsign = f"{aircraft_type.value.upper()}{random.randint(10, 99):02d}"
        
        origins = ["Field Base", "Supply Depot", "Forward Post", "Command Center"]
        destinations = ["Echo Base", "Sector 7", "Border Zone", "Rally Point"]
        
        origin = random.choice(origins)
        destination = random.choice(destinations)
        mission = f"{aircraft_type.value}_mission"
        
        if callsign not in self.aircraft:
            self.spawn_aircraft(callsign, aircraft_type, origin, destination, mission)


class TrafficScheduler:
    """AI agent for scheduling aircraft operations."""
    
    def __init__(self, environment: EchoTowerAlpha01):
        self.environment = environment
        self.landing_queue = deque()
        self.takeoff_queue = deque()
    
    def register_aircraft(self, aircraft: Aircraft):
        """Register new aircraft for scheduling."""
        if aircraft.status == AircraftStatus.INBOUND:
            self.landing_queue.append(aircraft.callsign)
        
        # Sort by priority
        self.landing_queue = deque(sorted(
            self.landing_queue,
            key=lambda cs: self.environment.aircraft[cs].get_priority_value()
        ))
    
    def update(self, dt: float):
        """Update traffic scheduling logic."""
        # Process landing queue
        if self.landing_queue:
            next_aircraft_cs = self.landing_queue[0]
            if next_aircraft_cs in self.environment.aircraft:
                aircraft = self.environment.aircraft[next_aircraft_cs]
                
                # Check for available runway
                available_runway = self._get_available_runway()
                if available_runway:
                    # Clear for landing
                    available_runway.occupied_by = aircraft.callsign
                    aircraft.last_instruction = f"Cleared to land runway {available_runway.id}"
                    self.landing_queue.popleft()
    
    def _get_available_runway(self) -> Optional[Runway]:
        """Get next available runway."""
        for runway in self.environment.runways.values():
            if runway.is_active and not runway.occupied_by:
                return runway
        return None


class ConflictResolver:
    """AI agent for preventing collisions and conflicts."""
    
    def __init__(self, environment: EchoTowerAlpha01):
        self.environment = environment
        self.separation_minimum = 2.0  # Grid units
    
    def update(self, dt: float):
        """Check for and resolve conflicts."""
        aircraft_list = list(self.environment.aircraft.values())
        
        for i, aircraft1 in enumerate(aircraft_list):
            for aircraft2 in aircraft_list[i+1:]:
                distance = np.sqrt(
                    (aircraft1.position[0] - aircraft2.position[0])**2 +
                    (aircraft1.position[1] - aircraft2.position[1])**2
                )
                
                if distance < self.separation_minimum:
                    self._resolve_conflict(aircraft1, aircraft2)
    
    def _resolve_conflict(self, aircraft1: Aircraft, aircraft2: Aircraft):
        """Resolve conflict between two aircraft."""
        # Priority-based resolution
        if aircraft1.get_priority_value() < aircraft2.get_priority_value():
            # Aircraft1 has higher priority, reroute aircraft2
            aircraft2.status = AircraftStatus.HOLDING
            aircraft2.last_instruction = f"Hold position, traffic conflict with {aircraft1.callsign}"
        else:
            # Aircraft2 has higher priority, reroute aircraft1
            aircraft1.status = AircraftStatus.HOLDING
            aircraft1.last_instruction = f"Hold position, traffic conflict with {aircraft2.callsign}"
        
        # Log safety violation
        self.environment.metrics["safety_violations"] += 1


class WeatherEngine:
    """AI agent for generating dynamic weather conditions."""
    
    def __init__(self, environment: EchoTowerAlpha01):
        self.environment = environment
        self.weather_spawn_rate = 0.02  # 2% chance per second
    
    def update(self, dt: float):
        """Update weather conditions."""
        # Spawn new weather
        if random.random() < self.weather_spawn_rate * dt:
            self._spawn_weather_node()
        
        # Update existing weather
        for node in list(self.environment.weather_nodes):
            node.duration -= dt
            if node.duration <= 0:
                self.environment.weather_nodes.remove(node)
    
    def _spawn_weather_node(self):
        """Spawn a new weather condition."""
        conditions = list(WeatherCondition)
        condition = random.choice(conditions)
        
        node = WeatherNode(
            position=(
                random.uniform(2, self.environment.grid_size[0] - 2),
                random.uniform(2, self.environment.grid_size[1] - 2)
            ),
            condition=condition,
            intensity=random.uniform(0.3, 1.0),
            radius=random.uniform(1.0, 3.0),
            duration=random.uniform(30, 120)  # 30-120 seconds
        )
        
        self.environment.weather_nodes.append(node)


class CommsAI:
    """AI agent for simulating radio communications."""
    
    def __init__(self, environment: EchoTowerAlpha01):
        self.environment = environment
        self.brevity_codes = {
            "cleared_to_land": "Cleared to land",
            "go_around": "Go around",
            "hold_position": "Hold position",
            "contact_tower": "Contact tower",
            "emergency_declared": "Emergency declared"
        }
    
    def generate_instruction(self, aircraft: Aircraft, instruction_type: str) -> str:
        """Generate radio instruction using military brevity codes."""
        base_instruction = self.brevity_codes.get(instruction_type, instruction_type)
        return f"Tower to {aircraft.callsign}, {base_instruction}"
    
    def validate_response(self, aircraft: Aircraft, response: str) -> bool:
        """Validate aircraft response using NLP."""
        # Simple validation - in production would use LLM
        expected_responses = ["roger", "wilco", "copy", "affirm"]
        return any(word in response.lower() for word in expected_responses)


# Demo function
def run_echo_tower_demo():
    """Run a demonstration of Echo Tower Alpha-01."""
    print("🧩 Echo Tower Alpha-01 Demo")
    print("=" * 40)
    
    # Create environment
    env = EchoTowerAlpha01()
    
    # Print initial state
    print("Initial Environment Schema:")
    schema = env.get_environment_schema()
    print(json.dumps(schema, indent=2))
    print()
    
    # Run simulation steps
    print("Running simulation steps...")
    for step in range(10):
        env.step(1.0)
        if step % 3 == 0:
            print(f"Step {step}:")
            print(env.get_grid_string())
            print()
    
    print("Demo completed!")


if __name__ == "__main__":
    run_echo_tower_demo()