"""
Dashboard server for the automated reasoning engine.

This script serves the web dashboard and provides real-time data from the
reasoning engine components via WebSocket connections.
"""

import asyncio
import json
import time
import threading
import webbrowser
from pathlib import Path
from typing import Dict, Any, List
import websockets
import http.server
import socketserver
from datetime import datetime, timedelta

from ..reasoning import SafetyAnalyzer, PatternAnalyzer, ReportGenerator
from ..events import get_event_bus
from ..events.event_data import SafetyViolationEvent, TrainingIterationEvent
import numpy as np


class DashboardServer:
    """
    Web dashboard server for the automated reasoning engine.
    
    Serves the HTML dashboard and provides WebSocket API for real-time data.
    """
    
    def __init__(self, http_port: int = 8000, ws_port: int = 8765):
        """
        Initialize the dashboard server.
        
        Args:
            http_port: Port for HTTP server serving the dashboard
            ws_port: Port for WebSocket server providing real-time data
        """
        self.http_port = http_port
        self.ws_port = ws_port
        
        # Initialize reasoning engine components
        self.safety_analyzer = SafetyAnalyzer()
        self.pattern_analyzer = PatternAnalyzer()
        self.report_generator = ReportGenerator(self.safety_analyzer, self.pattern_analyzer)
        
        # WebSocket connections
        self.connected_clients = set()
        
        # Data simulation for demo
        self.demo_mode = True
        self.demo_thread = None
        self.running = False
        
        print("Dashboard server initialized")
    
    async def websocket_handler(self, websocket, path):
        """Handle WebSocket connections from dashboard clients."""
        print(f"New WebSocket connection from {websocket.remote_address}")
        self.connected_clients.add(websocket)
        
        try:
            # Send initial data
            await self.send_initial_data(websocket)
            
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
    
    async def send_initial_data(self, websocket):
        """Send initial data to a newly connected client."""
        try:
            # Send safety metrics
            safety_metrics = self.safety_analyzer.calculate_safety_metrics()
            await websocket.send(json.dumps({
                'type': 'safety_metrics',
                'data': {
                    'safety_score': safety_metrics.safety_score,
                    'total_violations': safety_metrics.total_violations,
                    'violation_rate_per_hour': safety_metrics.violation_rate_per_hour,
                    'trend': safety_metrics.violation_trend
                }
            }))
            
            # Send patterns
            patterns = self.pattern_analyzer.analyze_recent_performance(episodes=50)
            await websocket.send(json.dumps({
                'type': 'patterns',
                'data': [p.to_dict() for p in patterns]
            }))
            
            # Send alerts
            alerts = self.report_generator.get_active_alerts()
            await websocket.send(json.dumps({
                'type': 'alerts',
                'data': [a.to_dict() for a in alerts]
            }))
            
            # Generate and send report
            report = self.report_generator.generate_daily_summary()
            await websocket.send(json.dumps({
                'type': 'report',
                'data': {
                    'executive_summary': report.executive_summary,
                    'key_findings': report.key_findings,
                    'overall_assessment': report.overall_assessment,
                    'timestamp': report.timestamp
                }
            }))
            
        except Exception as e:
            print(f"Error sending initial data: {e}")
    
    async def handle_client_message(self, websocket, data: Dict[str, Any]):
        """Handle messages from dashboard clients."""
        action = data.get('action')
        
        if action == 'generate_report':
            # Generate new report
            report = self.report_generator.generate_performance_analysis(episodes=100)
            await websocket.send(json.dumps({
                'type': 'report',
                'data': {
                    'executive_summary': report.executive_summary,
                    'key_findings': report.key_findings,
                    'overall_assessment': report.overall_assessment,
                    'timestamp': report.timestamp
                }
            }))
            
        elif action == 'analyze_patterns':
            # Analyze patterns
            patterns = self.pattern_analyzer.analyze_recent_performance(episodes=100)
            await websocket.send(json.dumps({
                'type': 'patterns',
                'data': [p.to_dict() for p in patterns]
            }))
            
        elif action == 'refresh_data':
            # Send fresh data
            await self.send_initial_data(websocket)
    
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
    
    def start_http_server(self):
        """Start the HTTP server for serving the dashboard."""
        web_dir = Path(__file__).parent.parent / "web"
        
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
    
    def simulate_training_data(self):
        """Simulate training data for demonstration purposes."""
        print("Starting training data simulation...")
        
        episode_count = 0
        
        while self.running:
            try:
                # Simulate training iteration
                episode_count += 1
                
                # Create realistic training metrics
                base_reward = 15.0 + np.sin(episode_count * 0.1) * 3.0  # Oscillating reward
                reward = base_reward + np.random.normal(0, 1.5)
                
                confidence = 0.75 + np.random.normal(0, 0.1)
                confidence = max(0.0, min(1.0, confidence))
                
                # Simulate occasional safety violations
                violations = 1 if np.random.random() < 0.05 else 0
                
                # Create training iteration event
                event_bus = get_event_bus()
                iteration_event = TrainingIterationEvent(
                    timestamp=time.time(),
                    iteration=episode_count,
                    episode_reward_mean=reward,
                    episode_len_mean=50.0 + np.random.normal(0, 5),
                    metrics={
                        "mean_confidence": confidence,
                        "decision_consistency": 0.8 + np.random.normal(0, 0.05),
                        "safety_violations": violations,
                        "mean_separation": 8.0 + np.random.normal(0, 1),
                        "policy_entropy": 1.0 + np.random.normal(0, 0.2),
                        "value_estimate_accuracy": 0.7 + np.random.normal(0, 0.1)
                    }
                )
                event_bus.publish(iteration_event.event_type, iteration_event.data)
                
                # Simulate safety violation occasionally
                if violations > 0:
                    violation_event = SafetyViolationEvent(
                        timestamp=time.time(),
                        violation_type="loss_of_separation",
                        aircraft_involved=[f"AC{episode_count:03d}", f"AC{episode_count+1:03d}"],
                        separation_distance=2.0 + np.random.random() * 2.0,
                        minimum_separation=5.0,
                        severity="medium"
                    )
                    event_bus.publish(violation_event.event_type, violation_event.data)
                
                # Sleep for simulation interval
                time.sleep(2.0)  # 2 seconds per "episode"
                
            except Exception as e:
                print(f"Error in training simulation: {e}")
                time.sleep(1.0)
    
    async def periodic_updates(self):
        """Send periodic updates to connected clients."""
        while self.running:
            try:
                if self.connected_clients:
                    # Update safety metrics
                    safety_metrics = self.safety_analyzer.calculate_safety_metrics()
                    await self.broadcast_update('safety_metrics', {
                        'safety_score': safety_metrics.safety_score,
                        'total_violations': safety_metrics.total_violations,
                        'violation_rate_per_hour': safety_metrics.violation_rate_per_hour,
                        'trend': safety_metrics.violation_trend
                    })
                    
                    # Update patterns every 30 seconds
                    patterns = self.pattern_analyzer.analyze_recent_performance(episodes=20)
                    await self.broadcast_update('patterns', [p.to_dict() for p in patterns])
                    
                    # Update alerts
                    alerts = self.report_generator.get_active_alerts()
                    await self.broadcast_update('alerts', [a.to_dict() for a in alerts])
                
                await asyncio.sleep(10)  # Update every 10 seconds
                
            except Exception as e:
                print(f"Error in periodic updates: {e}")
                await asyncio.sleep(5)
    
    async def run_async(self):
        """Run the async components of the server."""
        # Start WebSocket server
        ws_server = await self.start_websocket_server()
        
        # Start periodic updates
        update_task = asyncio.create_task(self.periodic_updates())
        
        try:
            # Wait for server to run
            await ws_server.wait_closed()
        except KeyboardInterrupt:
            print("Shutting down servers...")
        finally:
            update_task.cancel()
            ws_server.close()
    
    def run(self, open_browser: bool = True):
        """
        Run the dashboard server.
        
        Args:
            open_browser: Whether to automatically open the dashboard in browser
        """
        self.running = True
        
        try:
            # Start HTTP server
            http_server = self.start_http_server()
            
            # Start training data simulation if in demo mode
            if self.demo_mode:
                self.demo_thread = threading.Thread(target=self.simulate_training_data, daemon=True)
                self.demo_thread.start()
            
            # Open browser
            if open_browser:
                dashboard_url = f"http://localhost:{self.http_port}/reasoning_dashboard.html"
                print(f"Opening dashboard in browser: {dashboard_url}")
                threading.Timer(2.0, lambda: webbrowser.open(dashboard_url)).start()
            
            # Run async server
            asyncio.run(self.run_async())
            
        except KeyboardInterrupt:
            print("\nShutting down dashboard server...")
        finally:
            self.running = False
            
            # Cleanup
            self.safety_analyzer.shutdown()
            self.pattern_analyzer.shutdown()


def main():
    """Main function to run the dashboard server."""
    print("🧠 AI Controller Automated Reasoning Dashboard")
    print("=" * 50)
    
    # Create and run server
    server = DashboardServer()
    
    print("Starting dashboard server...")
    print("- HTTP server will serve the dashboard interface")
    print("- WebSocket server will provide real-time data")
    print("- Training data simulation will generate demo data")
    print()
    print("Press Ctrl+C to stop the server")
    print()
    
    server.run(open_browser=True)


if __name__ == "__main__":
    main()