"""
Complete system integration for visualization and reasoning components.

This module provides a unified interface to wire together all visualization,
decision tracking, reasoning, and monitoring components with the training pipeline.
"""
import logging
import time
from typing import Optional, Dict, Any, List
from pathlib import Path
import asyncio
import threading

from visualization.events import EventBus, get_event_bus, EventData, EventType


logger = logging.getLogger(__name__)


class IntegratedVisualizationSystem:
    """
    Unified system that integrates all visualization and reasoning components.
    
    This class manages the lifecycle and coordination of:
    - Event bus for data flow
    - WebSocket server for real-time streaming
    - Scenario visualizer for air traffic display
    - Decision tracker for AI reasoning
    - Reasoning engine for automated analysis
    - Performance monitor for metrics tracking
    """
    
    def __init__(
        self,
        websocket_port: int = 8765,
        enable_visualization: bool = True,
        enable_decision_tracking: bool = True,
        enable_reasoning: bool = True,
        enable_monitoring: bool = True,
        canvas_size: tuple = (800, 800),
        sector_size_nm: float = 50.0,
        max_decision_history: int = 100,
        checkpoint_dir: Optional[str] = None
    ):
        """
        Initialize the integrated visualization system.
        
        Args:
            websocket_port: Port for WebSocket server
            enable_visualization: Enable scenario visualization
            enable_decision_tracking: Enable decision tracking
            enable_reasoning: Enable automated reasoning engine
            enable_monitoring: Enable performance monitoring
            canvas_size: Canvas size for visualization (width, height)
            sector_size_nm: Sector size in nautical miles
            max_decision_history: Maximum decisions to keep in history
            checkpoint_dir: Directory for saving checkpoints and reports
        """
        self.websocket_port = websocket_port
        self.enable_visualization = enable_visualization
        self.enable_decision_tracking = enable_decision_tracking
        self.enable_reasoning = enable_reasoning
        self.enable_monitoring = enable_monitoring
        self.canvas_size = canvas_size
        self.sector_size_nm = sector_size_nm
        self.max_decision_history = max_decision_history
        self.checkpoint_dir = Path(checkpoint_dir) if checkpoint_dir else Path("./checkpoints")
        
        # Core components
        self.event_bus: EventBus = get_event_bus()
        self.websocket_server: Optional[WebSocketServer] = None
        self.scenario_visualizer: Optional[ScenarioVisualizer] = None
        self.decision_tracker: Optional[DecisionTracker] = None
        self.reasoning_engine: Optional[ReasoningEngine] = None
        self.performance_monitor: Optional[PerformanceMonitor] = None
        self.policy_inspector: Optional[PolicyInspector] = None
        
        # Component initialization flags
        self._initialized = False
        self._running = False
        self._websocket_task: Optional[asyncio.Task] = None
        self._lock = threading.RLock()
        
        logger.info("IntegratedVisualizationSystem created")
    
    def initialize(self) -> None:
        """
        Initialize all enabled components and wire them together.
        
        This method creates and connects all visualization and reasoning
        components based on the configuration.
        """
        with self._lock:
            if self._initialized:
                logger.warning("System already initialized")
                return
            
            logger.info("Initializing integrated visualization system...")
            
            # Create checkpoint directory
            self.checkpoint_dir.mkdir(parents=True, exist_ok=True)
            
            # Initialize components based on configuration
            if self.enable_visualization:
                try:
                    from visualization.scenario import ScenarioVisualizer, VisualizationConfig
                    from visualization.scenario.sector import SectorBounds
                    
                    # Create sector bounds
                    sector_bounds = SectorBounds(
                        min_x=0.0,
                        max_x=self.sector_size_nm,
                        min_y=0.0,
                        max_y=self.sector_size_nm
                    )
                    
                    # Create visualization config
                    viz_config = VisualizationConfig(
                        canvas_width=self.canvas_size[0],
                        canvas_height=self.canvas_size[1]
                    )
                    
                    self.scenario_visualizer = ScenarioVisualizer(
                        sector_bounds=sector_bounds,
                        config=viz_config,
                        event_bus=self.event_bus
                    )
                    logger.info("Scenario visualizer initialized")
                except Exception as e:
                    logger.error(f"Failed to initialize scenario visualizer: {e}")
                    self.scenario_visualizer = None
            
            if self.enable_decision_tracking:
                try:
                    from visualization.decision import get_decision_tracker
                    self.decision_tracker = get_decision_tracker()
                    logger.info("Decision tracker initialized")
                except Exception as e:
                    logger.error(f"Failed to initialize decision tracker: {e}")
                    self.decision_tracker = None
            
            if self.enable_reasoning:
                try:
                    from visualization.reasoning import ReasoningEngine
                    self.reasoning_engine = ReasoningEngine(
                        decision_tracker=self.decision_tracker,
                        event_bus=self.event_bus
                    )
                    logger.info("Reasoning engine initialized")
                except Exception as e:
                    logger.error(f"Failed to initialize reasoning engine: {e}")
                    self.reasoning_engine = None
            
            if self.enable_monitoring:
                try:
                    from visualization.monitoring import get_performance_monitor
                    self.performance_monitor = get_performance_monitor()
                    logger.info("Performance monitor initialized")
                except Exception as e:
                    logger.error(f"Failed to initialize performance monitor: {e}")
                    self.performance_monitor = None
            
            # Initialize WebSocket server
            try:
                from visualization.server import WebSocketServer
                self.websocket_server = WebSocketServer(
                    host="localhost",
                    port=self.websocket_port
                )
                self._setup_websocket_handlers()
                logger.info(f"WebSocket server initialized on port {self.websocket_port}")
            except Exception as e:
                logger.error(f"Failed to initialize WebSocket server: {e}")
                self.websocket_server = None
            
            # Initialize policy inspector
            try:
                from visualization.integration.policy_inspector import PolicyInspector
                self.policy_inspector = PolicyInspector()
                logger.info("Policy inspector initialized")
            except Exception as e:
                logger.error(f"Failed to initialize policy inspector: {e}")
                self.policy_inspector = None
            
            # Wire components together via event subscriptions
            self._wire_components()
            
            self._initialized = True
            logger.info("Integrated visualization system initialized successfully")
    
    def _setup_websocket_handlers(self) -> None:
        """Set up WebSocket message handlers for dashboard commands."""
        from visualization.server.message_router import Message, MessageType
        
        def handle_training_command(message: Message, client_id: str):
            """Handle training control commands from dashboard."""
            command = message.data.get('command')
            logger.info(f"Received training command: {command} from client {client_id}")
            
            # Publish training command event
            from visualization.events.event_data import EventData
            event = EventData(
                event_type=EventType.TRAINING_COMMAND,
                data={
                    'command': command,
                    'params': message.data.get('params', {}),
                    'client_id': client_id
                }
            )
            self.event_bus.publish(event)
        
        def handle_scenario_command(message: Message, client_id: str):
            """Handle scenario commands from dashboard."""
            command = message.data.get('command')
            params = message.data.get('params', {})
            logger.info(f"Received scenario command: {command} with params: {params}")
            
            # Publish scenario command event
            from visualization.events.event_data import EventData
            event = EventData(
                event_type=EventType.SCENARIO_COMMAND,
                data={
                    'command': command,
                    'params': params,
                    'client_id': client_id
                }
            )
            self.event_bus.publish(event)
        
        def handle_data_request(message: Message, client_id: str):
            """Handle data requests from dashboard."""
            data_type = message.data.get('dataType')
            logger.info(f"Received data request: {data_type}")
            
            # Handle different data request types
            if data_type == 'training_status' and self.performance_monitor:
                asyncio.create_task(self._send_training_status(client_id))
            elif data_type == 'decision_history' and self.decision_tracker:
                asyncio.create_task(self._send_decision_history(client_id))
            elif data_type == 'safety_metrics' and self.reasoning_engine:
                asyncio.create_task(self._send_safety_metrics(client_id))
        
        # Register handlers
        self.websocket_server.register_message_handler(
            MessageType.TRAINING_COMMAND, 
            handle_training_command
        )
        self.websocket_server.register_message_handler(
            MessageType.SCENARIO_COMMAND, 
            handle_scenario_command
        )
        self.websocket_server.register_message_handler(
            MessageType.DATA_REQUEST, 
            handle_data_request
        )
    
    def _wire_components(self) -> None:
        """Wire components together via event subscriptions."""
        
        # Subscribe to environment step events for visualization
        if self.scenario_visualizer:
            self.event_bus.subscribe(
                EventType.ENV_STEP,
                self._handle_env_step_for_visualization
            )
        
        # Subscribe to policy decisions for decision tracking
        if self.decision_tracker:
            # Decision tracker already subscribes in its __init__
            pass
        
        # Subscribe to training iteration events for monitoring
        if self.performance_monitor:
            self.event_bus.subscribe(
                EventType.TRAINING_ITERATION,
                self._handle_training_iteration
            )
        
        # Subscribe to episode end events for reasoning
        if self.reasoning_engine:
            self.event_bus.subscribe(
                EventType.EPISODE_END,
                self._handle_episode_end
            )
        
        # Subscribe to all events for WebSocket broadcasting
        self.event_bus.subscribe(
            EventType.ENV_STEP,
            self._broadcast_event_to_clients
        )
        self.event_bus.subscribe(
            EventType.POLICY_DECISION,
            self._broadcast_event_to_clients
        )
        self.event_bus.subscribe(
            EventType.SAFETY_VIOLATION,
            self._broadcast_event_to_clients
        )
        
        logger.info("Components wired together via event subscriptions")
    
    def _handle_env_step_for_visualization(self, event: EventData) -> None:
        """Handle environment step events for visualization updates."""
        try:
            if not self.scenario_visualizer:
                return
            
            data = event.data
            aircraft_states = data.get('aircraft_states', [])
            
            # Update visualizer with aircraft states
            self.scenario_visualizer.update_aircraft_states(aircraft_states)
            
            # Check for conflicts
            conflicts = data.get('conflicts', [])
            if conflicts:
                self.scenario_visualizer.highlight_conflicts(conflicts)
            
        except Exception as e:
            logger.error(f"Error handling env step for visualization: {e}")
    
    def _handle_training_iteration(self, event: EventData) -> None:
        """Handle training iteration events for monitoring."""
        try:
            if not self.performance_monitor:
                return
            
            data = event.data
            metrics = {
                'episode_reward_mean': data.get('episode_reward_mean', 0.0),
                'episode_len_mean': data.get('episode_len_mean', 0.0),
                'num_episodes': data.get('num_episodes', 0),
                'iteration': data.get('iteration', 0)
            }
            
            self.performance_monitor.track_metrics(metrics)
            
        except Exception as e:
            logger.error(f"Error handling training iteration: {e}")
    
    def _handle_episode_end(self, event: EventData) -> None:
        """Handle episode end events for reasoning analysis."""
        try:
            if not self.reasoning_engine:
                return
            
            data = event.data
            episode_data = {
                'episode_id': data.get('episode_id'),
                'total_reward': data.get('total_reward', 0.0),
                'episode_length': data.get('episode_length', 0),
                'safety_violations': data.get('safety_violations', [])
            }
            
            # Analyze episode asynchronously
            asyncio.create_task(self._analyze_episode(episode_data))
            
        except Exception as e:
            logger.error(f"Error handling episode end: {e}")
    
    async def _analyze_episode(self, episode_data: Dict[str, Any]) -> None:
        """Analyze episode data using reasoning engine."""
        try:
            if not self.reasoning_engine:
                return
            
            # Run analysis in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            analysis = await loop.run_in_executor(
                None,
                self.reasoning_engine.analyze_episode,
                episode_data
            )
            
            # Broadcast analysis results
            if self.websocket_server:
                from visualization.server.message_router import Message
                message = Message(
                    type='episode_analysis',
                    data=analysis.to_dict() if hasattr(analysis, 'to_dict') else analysis,
                    timestamp=time.time()
                )
                await self.websocket_server.broadcast(message)
            
        except Exception as e:
            logger.error(f"Error analyzing episode: {e}")
    
    def _broadcast_event_to_clients(self, event: EventData) -> None:
        """Broadcast events to connected WebSocket clients."""
        try:
            if not self.websocket_server or not self._running:
                return
            
            # Convert event to message format
            from visualization.server.message_router import Message
            
            # Map event types to message types
            message_type_map = {
                EventType.ENV_STEP: 'scenario_update',
                EventType.POLICY_DECISION: 'decision_update',
                EventType.SAFETY_VIOLATION: 'safety_violation',
                EventType.TRAINING_ITERATION: 'training_update'
            }
            
            message_type = message_type_map.get(event.event_type, 'event_update')
            
            message = Message(
                type=message_type,
                data=event.data,
                timestamp=event.timestamp
            )
            
            # Schedule broadcast
            asyncio.create_task(self.websocket_server.broadcast(message))
            
        except Exception as e:
            logger.error(f"Error broadcasting event to clients: {e}")
    
    async def _send_training_status(self, client_id: str) -> None:
        """Send training status to specific client."""
        try:
            if not self.performance_monitor:
                return
            
            stats = self.performance_monitor.get_statistics()
            
            from visualization.server.message_router import Message
            message = Message(
                type='training_status',
                data=stats,
                timestamp=time.time()
            )
            
            await self.websocket_server.send_to_client(client_id, message)
            
        except Exception as e:
            logger.error(f"Error sending training status: {e}")
    
    async def _send_decision_history(self, client_id: str) -> None:
        """Send decision history to specific client."""
        try:
            if not self.decision_tracker:
                return
            
            decisions = self.decision_tracker.get_decision_history(limit=50)
            decision_data = [d.to_dict() for d in decisions]
            
            from visualization.server.message_router import Message
            message = Message(
                type='decision_history',
                data={'decisions': decision_data},
                timestamp=time.time()
            )
            
            await self.websocket_server.send_to_client(client_id, message)
            
        except Exception as e:
            logger.error(f"Error sending decision history: {e}")
    
    async def _send_safety_metrics(self, client_id: str) -> None:
        """Send safety metrics to specific client."""
        try:
            if not self.reasoning_engine:
                return
            
            metrics = self.reasoning_engine.get_safety_metrics()
            
            from visualization.server.message_router import Message
            message = Message(
                type='safety_metrics',
                data=metrics,
                timestamp=time.time()
            )
            
            await self.websocket_server.send_to_client(client_id, message)
            
        except Exception as e:
            logger.error(f"Error sending safety metrics: {e}")
    
    async def start(self) -> None:
        """
        Start the integrated visualization system.
        
        This starts the WebSocket server and begins processing events.
        """
        with self._lock:
            if not self._initialized:
                self.initialize()
            
            if self._running:
                logger.warning("System already running")
                return
            
            logger.info("Starting integrated visualization system...")
            
            # Start WebSocket server
            if self.websocket_server:
                await self.websocket_server.start()
                logger.info(f"WebSocket server started on ws://localhost:{self.websocket_port}")
            
            self._running = True
            logger.info("Integrated visualization system started successfully")
    
    async def stop(self) -> None:
        """
        Stop the integrated visualization system.
        
        This stops the WebSocket server and cleans up resources.
        """
        with self._lock:
            if not self._running:
                logger.warning("System not running")
                return
            
            logger.info("Stopping integrated visualization system...")
            
            self._running = False
            
            # Stop WebSocket server
            if self.websocket_server:
                await self.websocket_server.stop()
                logger.info("WebSocket server stopped")
            
            logger.info("Integrated visualization system stopped")
    
    def shutdown(self) -> None:
        """
        Shutdown the integrated visualization system and cleanup all resources.
        
        This should be called when the system is no longer needed.
        """
        with self._lock:
            if self._running:
                # Stop async components
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.create_task(self.stop())
                else:
                    loop.run_until_complete(self.stop())
            
            logger.info("Shutting down integrated visualization system...")
            
            # Shutdown components
            if self.decision_tracker:
                self.decision_tracker.shutdown()
            
            if self.reasoning_engine:
                self.reasoning_engine.shutdown()
            
            if self.performance_monitor:
                from visualization.monitoring import shutdown_performance_monitor
                shutdown_performance_monitor()
            
            # Clear event bus subscriptions
            # Note: Individual components handle their own unsubscriptions
            
            self._initialized = False
            logger.info("Integrated visualization system shutdown complete")
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get current system status.
        
        Returns:
            Dictionary containing system status information
        """
        with self._lock:
            status = {
                'initialized': self._initialized,
                'running': self._running,
                'components': {
                    'visualization': self.scenario_visualizer is not None,
                    'decision_tracking': self.decision_tracker is not None,
                    'reasoning': self.reasoning_engine is not None,
                    'monitoring': self.performance_monitor is not None,
                    'websocket': self.websocket_server is not None
                },
                'websocket_port': self.websocket_port,
                'checkpoint_dir': str(self.checkpoint_dir)
            }
            
            # Add component statistics
            if self.decision_tracker:
                status['decision_tracker_stats'] = self.decision_tracker.get_statistics()
            
            if self.performance_monitor:
                status['performance_stats'] = self.performance_monitor.get_statistics()
            
            if self.event_bus:
                status['event_bus_stats'] = {
                    'subscriber_count': self.event_bus.get_subscriber_count(),
                    'event_history_size': len(self.event_bus.get_event_history())
                }
            
            return status
    
    def wrap_environment(self, env):
        """
        Wrap an environment with event publishing capabilities.
        
        Args:
            env: Base environment to wrap
            
        Returns:
            Event-wrapped environment
        """
        if not self._initialized:
            self.initialize()
        
        from visualization.integration.env_wrapper import EventPublishingEnvWrapper
        return EventPublishingEnvWrapper(env, self.event_bus)
    
    def create_training_callback(self):
        """
        Create RLlib training callback for integration.
        
        Returns:
            Training callback class
        """
        if not self._initialized:
            self.initialize()
        
        from visualization.integration.training_callbacks import create_training_callback
        return create_training_callback(
            event_bus=self.event_bus,
            policy_inspector=self.policy_inspector
        )


# Global integrated system instance
_global_integrated_system: Optional[IntegratedVisualizationSystem] = None


def get_integrated_system() -> IntegratedVisualizationSystem:
    """Get the global integrated visualization system instance."""
    global _global_integrated_system
    if _global_integrated_system is None:
        _global_integrated_system = IntegratedVisualizationSystem()
    return _global_integrated_system


def set_integrated_system(system: IntegratedVisualizationSystem) -> None:
    """Set the global integrated visualization system instance."""
    global _global_integrated_system
    if _global_integrated_system is not None:
        _global_integrated_system.shutdown()
    _global_integrated_system = system


def shutdown_integrated_system() -> None:
    """Shutdown the global integrated visualization system."""
    global _global_integrated_system
    if _global_integrated_system is not None:
        _global_integrated_system.shutdown()
        _global_integrated_system = None
