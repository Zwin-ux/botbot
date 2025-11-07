"""
Echo Tower Alpha-01 Server
Integrates the virtual ATC environment with web dashboard and reasoning engine
"""

import asyncio
import json
import time
import threading
import webbrowser
from pathlib import Path
from typing import Dict, Any, List, Set
import websockets
import http.server
import socketserver

import sys
import os
from pathlib import Path

# Add paths for imports
current_dir = Path(__file__).parent
project_root = current_dir.parent
sys.path.insert(0, str(current_dir))
sys.path.insert(0, str(project_root))

from echo_tower_alpha01 import EchoTowerAlpha01, AircraftType, WeatherCondition

from visualization.reasoning import SafetyAnalyzer, PatternAnalyzer, ReportGenerator
from visualization.events import get_event_bus
from visualization.events.event_data import SafetyViolationEvent, TrainingIterationEvent


class EchoTowerServer:
    """
    Server for Echo Tower Alpha-01 virtual ATC environment.
    
    Provides WebSocket API for real-time environment updates and integrates
    with the automated reasoning engine for performance analysis.
    """
    
    def __init__(self, http_port: int = 8001, ws_port: int = 8767):
        """
        Initialize the Echo Tower server.
        
        Args:
            http_port: Port for HTTP server serving the dashboard
            ws_port: Port for WebSocket server providing real-time data
        """
        self.http_port = http_port
        self.ws_port = ws_port
        
        # Initialize ATC environment
        self.environment = EchoTowerAlpha01()
        
        # Initialize reasoning engine components
        self.safety_analyzer = SafetyAnalyzer()
        self.pattern_analyzer = PatternAnalyzer()
        self.report_generator = ReportGenerator(self.safety_analyzer, self.pattern_analyzer)
        
        # WebSocket connections
        self.connected_clients: Set = set()
        
        # Server state
        self.running = False
        self.simulation_thread = None
        
        print("Echo Tower Alpha-01 server initialized")
    
    async def websocket_handler(self, websocket, path):
        """Handle WebSocket connections from dashboard clients."""
        print(f"New WebSocket connection from {websocket.remote_address}")
        self.connected_clients.add(websocket)
        
        try:
            # Send initial environment state
            await self.send_environment_update(websocket)
            
            # Handle incoming messages
            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self.handle_client_message(websocket, data)
                except json.JSONDecodeError:
                    print(f"Invalid JSON received: {message}")
                except Exception as e:
                    print(f"Error handling message: {e}")
        
        except websockets.exceptions.ConnectionClosed:
            print("WebSocket connection closed")
        except Exception as e:
            print(f"WebSocket error: {e}")
        finally:
            self.connected_clients.discard(websocket)
    
    async def send_environment_update(self, websocket):
        """Send complete environment state to client."""
        try:
            schema = self.environment.get_environment_schema()
            grid_string = self.environment.get_grid_string()
            
            await websocket.send(json.dumps({
                'type': 'environment_update',
                'data': {
                    **schema,
                    'grid_string': grid_string
                }
            }))
            
            # Send aircraft list
            aircraft_list = [
                {
                    'callsign': aircraft.callsign,
                    'aircraft_type': aircraft.aircraft_type.value,
                    'status': aircraft.status.value,
                    'priority': aircraft.get_priority_value(),
                    'fuel_level': aircraft.fuel_level,
                    'emoji': aircraft.get_emoji(),
                    'position': aircraft.position
                }
                for aircraft in self.environment.aircraft.values()
            ]
            
            await websocket.send(json.dumps({
                'type': 'aircraft_update',
                'data': aircraft_list
            }))
            
            # Send weather list
            weather_list = [
                {
                    'condition': node.condition.value,
                    'intensity': node.intensity,
                    'position': node.position,
                    'emoji': node.get_emoji()
                }
                for node in self.environment.weather_nodes
            ]
            
            await websocket.send(json.dumps({
                'type': 'weather_update',
                'data': weather_list
            }))
            
            # Send metrics
            await websocket.send(json.dumps({
                'type': 'metrics_update',
                'data': self.environment.metrics
            }))
            
        except Exception as e:
            print(f"Error sending environment update: {e}")
    
    async def handle_client_message(self, websocket, data: Dict[str, Any]):
        """Handle messages from dashboard clients."""
        action = data.get('action')
        
        if action == 'start_simulation':
            if not self.running:
                self.start_simulation()
                await self.broadcast_comms_message("Simulation started - Echo Tower Alpha-01 operational")
        
        elif action == 'pause_simulation':
            if self.running:
                self.stop_simulation()
                await self.broadcast_comms_message("Simulation paused - standby for further instructions")
        
        elif action == 'spawn_aircraft':
            self._spawn_random_aircraft()
            await self.broadcast_comms_message("New aircraft contact established")
        
        elif action == 'generate_weather':
            self._generate_weather_event()
            await self.broadcast_comms_message("Weather update - conditions changing")
        
        elif action == 'emergency_scenario':
            await self._trigger_emergency_scenario()
    
    async def broadcast_update(self, message_type: str, data: Any):
        """Broadcast an update to all connected clients."""
        if not self.connected_clients:
            return
        
        message = json.dumps({
            'type': message_type,
            'data': data
        })
        
        # Send to all connected clients
        disconnected = set()
        for websocket in self.connected_clients:
            try:
                await websocket.send(message)
            except websockets.exceptions.ConnectionClosed:
                disconnected.add(websocket)
            except Exception as e:
                print(f"Error broadcasting to client: {e}")
                disconnected.add(websocket)
        
        # Remove disconnected clients
        self.connected_clients -= disconnected
    
    async def broadcast_comms_message(self, message: str):
        """Broadcast a communications message to all clients."""
        await self.broadcast_update('comms_message', message)
    
    def start_http_server(self):
        """Start the HTTP server for serving the dashboard."""
        web_dir = Path(__file__).parent / "web"
        
        class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, directory=str(web_dir), **kwargs)
            
            def end_headers(self):
                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                self.send_header('Pragma', 'no-cache')
                self.send_header('Expires', '0')
                super().end_headers()
        
        httpd = socketserver.TCPServer(("", self.http_port), CustomHTTPRequestHandler)
        
        def serve_forever():
            print(f"HTTP server running on http://localhost:{self.http_port}")
            httpd.serve_forever()
        
        http_thread = threading.Thread(target=serve_forever, daemon=True)
        http_thread.start()
        
        return httpd
    
    async def start_websocket_server(self):
        """Start the WebSocket server."""
        print(f"WebSocket server starting on ws://localhost:{self.ws_port}")
        
        server = await websockets.serve(
            self.websocket_handler,
            "localhost",
            self.ws_port
        )
        
        print(f"WebSocket server running on ws://localhost:{self.ws_port}")
        return server
    
    def start_simulation(self):
        """Start the ATC environment simulation."""
        if self.running:
            return
        
        self.running = True
        self.simulation_thread = threading.Thread(target=self._simulation_loop, daemon=True)
        self.simulation_thread.start()
        print("ATC simulation started")
    
    def stop_simulation(self):
        """Stop the ATC environment simulation."""
        self.running = False
        if self.simulation_thread:
            self.simulation_thread.join(timeout=2.0)
        print("ATC simulation stopped")
    
    def _simulation_loop(self):
        """Main simulation loop running in separate thread."""
        last_update = time.time()
        
        while self.running:
            try:
                current_time = time.time()
                dt = current_time - last_update
                last_update = current_time
                
                # Step the environment
                self.environment.step(dt)
                
                # Randomly spawn aircraft
                if len(self.environment.aircraft) < 6 and np.random.random() < 0.05:
                    self._spawn_random_aircraft()
                
                # Generate safety events for reasoning engine
                self._generate_safety_events()
                
                # Generate training events for pattern analysis
                self._generate_training_events()
                
                # Broadcast updates to clients (async)
                asyncio.run_coroutine_threadsafe(
                    self._broadcast_simulation_updates(),
                    asyncio.get_event_loop()
                )
                
                time.sleep(1.0)  # 1 second simulation steps
                
            except Exception as e:
                print(f"Error in simulation loop: {e}")
                time.sleep(1.0)
    
    async def _broadcast_simulation_updates(self):
        """Broadcast simulation updates to all connected clients."""
        if not self.connected_clients:
            return
        
        # Broadcast environment update
        schema = self.environment.get_environment_schema()
        grid_string = self.environment.get_grid_string()
        
        await self.broadcast_update('environment_update', {
            **schema,
            'grid_string': grid_string
        })
        
        # Broadcast aircraft updates
        aircraft_list = [
            {
                'callsign': aircraft.callsign,
                'aircraft_type': aircraft.aircraft_type.value,
                'status': aircraft.status.value,
                'priority': aircraft.get_priority_value(),
                'fuel_level': aircraft.fuel_level,
                'emoji': aircraft.get_emoji(),
                'position': aircraft.position
            }
            for aircraft in self.environment.aircraft.values()
        ]
        
        await self.broadcast_update('aircraft_update', aircraft_list)
        
        # Broadcast weather updates
        weather_list = [
            {
                'condition': node.condition.value,
                'intensity': node.intensity,
                'position': node.position,
                'emoji': node.get_emoji()
            }
            for node in self.environment.weather_nodes
        ]
        
        await self.broadcast_update('weather_update', weather_list)
        
        # Broadcast metrics
        await self.broadcast_update('metrics_update', self.environment.metrics)
    
    def _spawn_random_aircraft(self):
        """Spawn a random aircraft in the environment."""
        aircraft_types = list(AircraftType)
        aircraft_type = np.random.choice(aircraft_types)
        
        callsign = f"{aircraft_type.value.upper()}{np.random.randint(10, 99):02d}"
        
        origins = ["Field Base", "Supply Depot", "Forward Post", "Command Center"]
        destinations = ["Echo Base", "Sector 7", "Border Zone", "Rally Point"]
        
        origin = np.random.choice(origins)
        destination = np.random.choice(destinations)
        mission = f"{aircraft_type.value}_mission"
        
        if callsign not in self.environment.aircraft:
            self.environment.spawn_aircraft(callsign, aircraft_type, origin, destination, mission)
    
    def _generate_weather_event(self):
        """Generate a weather event in the environment."""
        conditions = list(WeatherCondition)
        condition = np.random.choice(conditions)
        
        from echo_tower_alpha01 import WeatherNode
        
        node = WeatherNode(
            position=(
                np.random.uniform(2, self.environment.grid_size[0] - 2),
                np.random.uniform(2, self.environment.grid_size[1] - 2)
            ),
            condition=condition,
            intensity=np.random.uniform(0.3, 1.0),
            radius=np.random.uniform(1.0, 3.0),
            duration=np.random.uniform(60, 180)  # 1-3 minutes
        )
        
        self.environment.weather_nodes.append(node)
    
    async def _trigger_emergency_scenario(self):
        """Trigger an emergency scenario."""
        # Find or create a medevac aircraft
        medevac_aircraft = None
        for aircraft in self.environment.aircraft.values():
            if aircraft.aircraft_type == AircraftType.MEDEVAC:
                medevac_aircraft = aircraft
                break
        
        if not medevac_aircraft:
            # Spawn emergency medevac
            medevac_aircraft = self.environment.spawn_aircraft(
                "MEDEVAC99", AircraftType.MEDEVAC, "Field Hospital", "Echo Base", "emergency_evacuation"
            )
        
        # Set emergency status
        medevac_aircraft.status = "emergency"
        medevac_aircraft.fuel_level = 0.08  # Critical fuel
        medevac_aircraft.priority = 1
        
        # Broadcast emergency messages
        await self.broadcast_comms_message(f"🚨 EMERGENCY: {medevac_aircraft.callsign} declaring fuel emergency")
        await self.broadcast_comms_message("All traffic cleared - priority landing authorized")
        await self.broadcast_comms_message("Emergency services standing by")
        
        # Generate safety event for reasoning engine
        event_bus = get_event_bus()
        violation_event = SafetyViolationEvent(
            timestamp=time.time(),
            violation_type="emergency_declared",
            aircraft_involved=[medevac_aircraft.callsign],
            separation_distance=0.0,
            minimum_separation=5.0,
            severity="critical"
        )
        event_bus.publish(violation_event.event_type, violation_event.data)
    
    def _generate_safety_events(self):
        """Generate safety events for the reasoning engine."""
        # Check for separation violations
        aircraft_list = list(self.environment.aircraft.values())
        
        for i, aircraft1 in enumerate(aircraft_list):
            for aircraft2 in aircraft_list[i+1:]:
                distance = np.sqrt(
                    (aircraft1.position[0] - aircraft2.position[0])**2 +
                    (aircraft1.position[1] - aircraft2.position[1])**2
                )
                
                if distance < 2.0:  # Separation violation
                    event_bus = get_event_bus()
                    violation_event = SafetyViolationEvent(
                        timestamp=time.time(),
                        violation_type="loss_of_separation",
                        aircraft_involved=[aircraft1.callsign, aircraft2.callsign],
                        separation_distance=distance,
                        minimum_separation=2.0,
                        severity="high" if distance < 1.0 else "medium"
                    )
                    event_bus.publish(violation_event.event_type, violation_event.data)
                    
                    # Update environment metrics
                    self.environment.metrics["safety_violations"] += 1
    
    def _generate_training_events(self):
        """Generate training events for pattern analysis."""
        if len(self.environment.aircraft) > 0:
            # Calculate average performance metrics
            total_fuel = sum(ac.fuel_level for ac in self.environment.aircraft.values())
            avg_fuel = total_fuel / len(self.environment.aircraft)
            
            # Simulate reward based on efficiency and safety
            reward = 10.0 + (avg_fuel * 5.0) - (self.environment.metrics["safety_violations"] * 2.0)
            
            event_bus = get_event_bus()
            iteration_event = TrainingIterationEvent(
                timestamp=time.time(),
                iteration=int(self.environment.simulation_time / 10),  # Every 10 seconds
                episode_reward_mean=reward,
                episode_len_mean=len(self.environment.aircraft) * 10,
                metrics={
                    "mean_confidence": 0.8 + np.random.normal(0, 0.1),
                    "decision_consistency": 0.85 + np.random.normal(0, 0.05),
                    "safety_violations": self.environment.metrics["safety_violations"],
                    "mean_separation": 5.0 + np.random.normal(0, 1),
                    "fuel_efficiency": avg_fuel,
                    "aircraft_count": len(self.environment.aircraft)
                }
            )
            event_bus.publish(iteration_event.event_type, iteration_event.data)
    
    async def run_async(self):
        """Run the async components of the server."""
        # Start WebSocket server
        ws_server = await self.start_websocket_server()
        
        try:
            # Wait for server to run
            await ws_server.wait_closed()
        except KeyboardInterrupt:
            print("Shutting down Echo Tower server...")
        finally:
            ws_server.close()
    
    def run(self, open_browser: bool = True):
        """
        Run the Echo Tower server.
        
        Args:
            open_browser: Whether to automatically open the dashboard in browser
        """
        try:
            # Start HTTP server
            http_server = self.start_http_server()
            
            # Start simulation
            self.start_simulation()
            
            # Open browser
            if open_browser:
                dashboard_url = f"http://localhost:{self.http_port}/echo_tower_dashboard.html"
                print(f"Opening Echo Tower dashboard in browser: {dashboard_url}")
                threading.Timer(2.0, lambda: webbrowser.open(dashboard_url)).start()
            
            # Run async server
            asyncio.run(self.run_async())
            
        except KeyboardInterrupt:
            print("\nShutting down Echo Tower Alpha-01...")
        finally:
            self.stop_simulation()
            
            # Cleanup reasoning engine
            self.safety_analyzer.shutdown()
            self.pattern_analyzer.shutdown()


def main():
    """Main function to run the Echo Tower server."""
    print("🏢 Echo Tower Alpha-01 Virtual ATC Environment")
    print("=" * 50)
    
    # Create and run server
    server = EchoTowerServer()
    
    print("Starting Echo Tower Alpha-01 server...")
    print("- HTTP server will serve the tactical dashboard")
    print("- WebSocket server will provide real-time ATC data")
    print("- ATC simulation will generate military air traffic")
    print("- Reasoning engine will analyze performance")
    print()
    print("Press Ctrl+C to stop the server")
    print()
    
    server.run(open_browser=True)


if __name__ == "__main__":
    # Add numpy import
    import numpy as np
    main()