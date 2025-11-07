"""
Demo WebSocket server for testing the React dashboard.

This server generates synthetic data to demonstrate dashboard functionality
without requiring the full training pipeline.
"""

import asyncio
import json
import random
import time
import math
from typing import List, Dict, Any
import logging

from visualization.server.websocket_server import WebSocketServer
from visualization.server.message_router import Message, MessageType

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DashboardDemoServer:
    """Demo server that generates synthetic training data for dashboard testing."""
    
    def __init__(self, host: str = "localhost", port: int = 8080):
        """Initialize the demo server."""
        self.ws_server = WebSocketServer(host, port)
        self.running = False
        self.episode = 0
        self.step = 0
        self.training_status = "idle"
        self.aircraft_states = []
        self.start_time = time.time()
        
        # Training metrics
        self.cumulative_reward = 0
        self.episode_rewards = []
        self.best_reward = 0
        
        # Register command handlers
        self._register_handlers()
    
    def _register_handlers(self):
        """Register message handlers for dashboard commands."""
        
        def handle_training_command(message: Message, client_id: str):
            """Handle training control commands."""
            command = message.data.get('command')
            logger.info(f"Received training command: {command}")
            
            if command == 'start':
                self.training_status = 'running'
                asyncio.create_task(self._training_loop())
            elif command == 'pause':
                self.training_status = 'paused'
            elif command == 'stop':
                self.training_status = 'idle'
                self.episode = 0
                self.step = 0
            elif command == 'save_checkpoint':
                logger.info("Checkpoint saved (demo)")
        
        def handle_scenario_command(message: Message, client_id: str):
            """Handle scenario commands."""
            command = message.data.get('command')
            params = message.data.get('params', {})
            logger.info(f"Received scenario command: {command} with params: {params}")
            
            if command == 'load_scenario':
                scenario_id = params.get('scenarioId')
                logger.info(f"Loading scenario: {scenario_id}")
                self._initialize_scenario(scenario_id)
        
        def handle_data_request(message: Message, client_id: str):
            """Handle data requests."""
            data_type = message.data.get('dataType')
            logger.info(f"Received data request: {data_type}")
            
            if data_type == 'training_status':
                asyncio.create_task(self._send_training_status())
        
        self.ws_server.register_message_handler(MessageType.TRAINING_COMMAND, handle_training_command)
        self.ws_server.register_message_handler(MessageType.SCENARIO_COMMAND, handle_scenario_command)
        self.ws_server.register_message_handler(MessageType.DATA_REQUEST, handle_data_request)
    
    def _initialize_scenario(self, scenario_id: str = "basic-separation"):
        """Initialize aircraft for a scenario."""
        # Create 4-6 aircraft with random positions
        num_aircraft = random.randint(4, 6)
        self.aircraft_states = []
        
        for i in range(num_aircraft):
            aircraft = {
                'id': f'AC{i+1:03d}',
                'position': [random.uniform(10, 40), random.uniform(10, 40)],
                'velocity': random.uniform(200, 300),
                'heading': random.uniform(0, 2 * math.pi),
                'altitude': random.uniform(8000, 12000),
                'goalPosition': [random.uniform(10, 40), random.uniform(10, 40)],
                'alive': True,
                'intent': random.choice(['departure', 'arrival', 'overfly']),
                'trailHistory': []
            }
            self.aircraft_states.append(aircraft)
    
    def _update_aircraft(self):
        """Update aircraft positions."""
        dt = 1.0  # time step in seconds
        
        for aircraft in self.aircraft_states:
            if not aircraft['alive']:
                continue
            
            # Update position based on velocity and heading
            dx = aircraft['velocity'] * math.cos(aircraft['heading']) * dt / 3600  # nm
            dy = aircraft['velocity'] * math.sin(aircraft['heading']) * dt / 3600  # nm
            
            aircraft['position'][0] += dx
            aircraft['position'][1] += dy
            
            # Add to trail history
            aircraft['trailHistory'].append(aircraft['position'].copy())
            if len(aircraft['trailHistory']) > 50:
                aircraft['trailHistory'].pop(0)
            
            # Randomly adjust heading slightly
            aircraft['heading'] += random.uniform(-0.1, 0.1)
            
            # Check if reached goal
            goal_dist = math.sqrt(
                (aircraft['position'][0] - aircraft['goalPosition'][0])**2 +
                (aircraft['position'][1] - aircraft['goalPosition'][1])**2
            )
            
            if goal_dist < 2.0:
                # Reached goal, create new goal
                aircraft['goalPosition'] = [random.uniform(10, 40), random.uniform(10, 40)]
    
    def _detect_conflicts(self) -> List[Dict[str, Any]]:
        """Detect conflicts between aircraft."""
        conflicts = []
        separation_threshold = 5.0  # nautical miles
        
        for i, ac1 in enumerate(self.aircraft_states):
            if not ac1['alive']:
                continue
            
            for ac2 in self.aircraft_states[i+1:]:
                if not ac2['alive']:
                    continue
                
                # Calculate distance
                dist = math.sqrt(
                    (ac1['position'][0] - ac2['position'][0])**2 +
                    (ac1['position'][1] - ac2['position'][1])**2
                )
                
                if dist < separation_threshold:
                    severity = 'low'
                    if dist < 4.0:
                        severity = 'medium'
                    if dist < 3.0:
                        severity = 'high'
                    if dist < 2.0:
                        severity = 'critical'
                    
                    conflicts.append({
                        'aircraftIds': [ac1['id'], ac2['id']],
                        'distance': dist,
                        'severity': severity,
                        'timeToClosestApproach': random.uniform(30, 180)
                    })
        
        return conflicts
    
    async def _send_training_status(self):
        """Send training status update."""
        elapsed_time = time.time() - self.start_time
        
        data = {
            'status': self.training_status,
            'currentEpisode': self.episode,
            'totalEpisodes': 1000,
            'currentStep': self.step,
            'totalSteps': 500,
            'elapsedTime': elapsed_time,
            'estimatedTimeRemaining': (1000 - self.episode) * 60,  # rough estimate
            'learningRate': 0.0003,
            'epsilon': max(0.01, 0.1 - self.episode * 0.0001),
            'lastReward': self.episode_rewards[-1] if self.episode_rewards else 0,
            'averageReward': sum(self.episode_rewards) / len(self.episode_rewards) if self.episode_rewards else 0,
            'bestReward': self.best_reward
        }
        
        message = Message(type='training_status', data=data, timestamp=time.time())
        await self.ws_server.broadcast(message)
    
    async def _send_scenario_update(self):
        """Send scenario state update."""
        conflicts = self._detect_conflicts()
        
        data = {
            'timestamp': time.time(),
            'aircraft': self.aircraft_states,
            'conflicts': conflicts,
            'sectorBounds': {
                'minX': 0,
                'maxX': 50,
                'minY': 0,
                'maxY': 50
            },
            'episode': self.episode,
            'step': self.step
        }
        
        message = Message(type='scenario_update', data=data, timestamp=time.time())
        await self.ws_server.broadcast(message)
    
    async def _send_decision_update(self):
        """Send AI decision update."""
        if not self.aircraft_states:
            return
        
        # Pick a random aircraft
        aircraft = random.choice([ac for ac in self.aircraft_states if ac['alive']])
        
        data = {
            'timestamp': time.time(),
            'aircraftId': aircraft['id'],
            'observation': [random.random() for _ in range(10)],
            'action': [random.uniform(-1, 1), random.uniform(-1, 1)],
            'policyLogits': [random.random() for _ in range(5)],
            'valueEstimate': random.uniform(10, 20),
            'confidenceScores': {
                'action_quality': random.uniform(0.6, 0.95),
                'safety': random.uniform(0.7, 0.98),
                'efficiency': random.uniform(0.6, 0.9)
            },
            'explanation': f"Vectoring {aircraft['id']} to maintain separation and progress toward goal",
            'predictedOutcomes': {
                'separation_maintained': random.uniform(0.8, 0.99),
                'goal_reached': random.uniform(0.7, 0.95),
                'fuel_efficient': random.uniform(0.6, 0.9)
            }
        }
        
        message = Message(type='decision_update', data=data, timestamp=time.time())
        await self.ws_server.broadcast(message)
    
    async def _send_performance_update(self):
        """Send performance metrics update."""
        # Generate synthetic reward
        base_reward = 15.0
        reward = base_reward + random.uniform(-5, 5) + (self.episode * 0.01)  # Slight improvement over time
        self.cumulative_reward += reward
        
        data = {
            'timestamp': time.time(),
            'episode': self.episode,
            'step': self.step,
            'reward': reward,
            'cumulativeReward': self.cumulative_reward,
            'safetyScore': random.uniform(85, 98),
            'efficiencyScore': random.uniform(75, 92),
            'violationCount': random.randint(0, 3),
            'averageConfidence': random.uniform(0.75, 0.92)
        }
        
        message = Message(type='performance_update', data=data, timestamp=time.time())
        await self.ws_server.broadcast(message)
    
    async def _training_loop(self):
        """Main training simulation loop."""
        logger.info("Starting training loop")
        
        # Initialize scenario if not already done
        if not self.aircraft_states:
            self._initialize_scenario()
        
        while self.training_status == 'running':
            # Update step
            self.step += 1
            
            # Update aircraft positions
            self._update_aircraft()
            
            # Send updates
            await self._send_scenario_update()
            
            # Send decision update every few steps
            if self.step % 3 == 0:
                await self._send_decision_update()
            
            # Send performance update every step
            await self._send_performance_update()
            
            # Send training status every 10 steps
            if self.step % 10 == 0:
                await self._send_training_status()
            
            # Check for episode end
            if self.step >= 500:
                self.episode += 1
                self.step = 0
                
                # Record episode reward
                episode_reward = self.cumulative_reward
                self.episode_rewards.append(episode_reward)
                if episode_reward > self.best_reward:
                    self.best_reward = episode_reward
                
                self.cumulative_reward = 0
                
                # Reset scenario
                self._initialize_scenario()
                
                logger.info(f"Episode {self.episode} completed")
            
            # Wait before next update (10 FPS)
            await asyncio.sleep(0.1)
        
        logger.info("Training loop stopped")
    
    async def start(self):
        """Start the demo server."""
        logger.info("Starting dashboard demo server...")
        await self.ws_server.start()
        self.running = True
        logger.info(f"Demo server running on ws://{self.ws_server.host}:{self.ws_server.port}")
        logger.info("Open the React dashboard at http://localhost:3000")
    
    async def stop(self):
        """Stop the demo server."""
        logger.info("Stopping demo server...")
        self.running = False
        self.training_status = 'idle'
        await self.ws_server.stop()
        logger.info("Demo server stopped")


async def main():
    """Run the demo server."""
    server = DashboardDemoServer(host="localhost", port=8080)
    
    try:
        await server.start()
        
        # Keep server running
        while True:
            await asyncio.sleep(1)
    
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    finally:
        await server.stop()


if __name__ == "__main__":
    print("=" * 60)
    print("AI Controller Dashboard Demo Server")
    print("=" * 60)
    print()
    print("This server generates synthetic training data for testing")
    print("the React dashboard without the full training pipeline.")
    print()
    print("Instructions:")
    print("1. Start this server")
    print("2. Open the React dashboard (npm start in react-dashboard/)")
    print("3. Use the dashboard controls to start/pause/stop training")
    print()
    print("Press Ctrl+C to stop the server")
    print("=" * 60)
    print()
    
    asyncio.run(main())