# Scenario Visualizer

Real-time air traffic scenario visualization system for the Synthetic Tower AI ATC Controller Training Environment.

## Overview

The scenario visualizer provides comprehensive real-time visualization of air traffic scenarios, including:

- **Aircraft Visualization**: Real-time aircraft positions with heading indicators, altitude labels, and position trails
- **Separation Monitoring**: Color-coded separation zones and conflict detection between aircraft
- **Sector Display**: Sector boundaries, coordinate grids, and navigation aids
- **Interactive Features**: Aircraft selection, canvas coordinate conversion, and performance tracking

## Components

### Aircraft Components (`aircraft.py`)

- **AircraftState**: Data structure for aircraft state information
- **AircraftTrail**: Manages position history for trail rendering
- **Aircraft**: Individual aircraft visualization with heading, trail, and metadata
- **AircraftManager**: Manages multiple aircraft for efficient rendering and updates

### Separation Components (`separation.py`)

- **SeparationLevel**: Enumeration of separation zones (Safe, Caution, Warning, Critical)
- **SeparationZone**: Configuration for separation zone visualization
- **ConflictPair**: Represents conflicts between aircraft pairs
- **SeparationVisualizer**: Handles separation distance visualization and conflict detection

Features:
- Configurable separation thresholds (default: 5 NM, 3 NM, 1 NM, 0.5 NM)
- Color-coded proximity warnings (green/yellow/orange/red)
- Conflict prediction with closest approach calculations
- Vertical separation consideration (1000 ft minimum)

### Sector Components (`sector.py`)

- **SectorBounds**: Defines air traffic control sector boundaries
- **GridConfiguration**: Configuration for coordinate grid display
- **NavigationAid**: Represents navigation aids (waypoints, VORs, NDBs, fixes)
- **SectorRenderer**: Handles sector boundary, grid, and navigation aid rendering

Features:
- Scalable canvas system with automatic coordinate conversion
- Major and minor grid lines with configurable spacing
- Goal position markers and trajectory predictions
- Support for different coordinate systems

### Main Visualizer (`visualizer.py`)

- **VisualizationConfig**: Configuration for the scenario visualizer
- **ScenarioVisualizer**: Main visualizer combining all components

Features:
- Event-driven updates via event bus integration
- Configurable frame rate (target FPS)
- Aircraft selection for detailed views
- Performance tracking and statistics
- Canvas interaction support (mouse position to aircraft mapping)

## Usage

### Basic Usage

```python
from visualization.scenario import (
    ScenarioVisualizer, 
    VisualizationConfig, 
    SectorBounds
)

# Create sector bounds (100x100 NM sector)
sector_bounds = SectorBounds(-50, 50, -50, 50)

# Create configuration
config = VisualizationConfig(
    canvas_width=800,
    canvas_height=600,
    target_fps=15.0,
    show_aircraft=True,
    show_trails=True,
    show_conflicts=True
)

# Create visualizer
visualizer = ScenarioVisualizer(sector_bounds, config)
visualizer.start()

# Update with aircraft data
aircraft_states = [...]  # List of aircraft state dicts
visualizer.aircraft_manager.update_aircraft_states(aircraft_states)

# Update and get render data
visualizer.update()
render_data = visualizer.get_render_data()

# Stop visualizer
visualizer.stop()
```

### Event Integration

The visualizer automatically subscribes to environment events:

```python
from visualization.scenario import ScenarioVisualizer, SectorBounds
from visualization.events import get_event_bus

# Get global event bus
event_bus = get_event_bus()

# Create visualizer (automatically subscribes to events)
sector_bounds = SectorBounds(-50, 50, -50, 50)
visualizer = ScenarioVisualizer(sector_bounds, event_bus=event_bus)
visualizer.start()

# Visualizer will automatically receive and process:
# - ENV_RESET events
# - ENV_STEP events with aircraft states
```

### Aircraft Selection

```python
# Select aircraft for detailed view
visualizer.select_aircraft("AC001")

# Deselect aircraft
visualizer.deselect_aircraft("AC001")

# Clear all selections
visualizer.clear_selection()

# Get aircraft at canvas position (for mouse interaction)
aircraft_id = visualizer.get_aircraft_at_position(
    canvas_x=400, 
    canvas_y=300, 
    tolerance=15.0
)
```

### Adding Navigation Aids

```python
from visualization.scenario import NavigationAid

# Add waypoints, VORs, NDBs, etc.
nav_aid = NavigationAid(
    id="ALPHA",
    position=(10.0, 20.0),  # x_nm, y_nm
    nav_type="waypoint",
    frequency=None,
    description="Alpha waypoint"
)

visualizer.add_navigation_aid(nav_aid)
```

## Render Data Structure

The `get_render_data()` method returns a comprehensive dictionary:

```python
{
    "timestamp": float,
    "canvas_config": {
        "canvas_width": int,
        "canvas_height": int,
        "scale": float,
        "offset_x": float,
        "offset_y": float,
        "sector_bounds": {...}
    },
    "background_color": str,
    "components": {
        "aircraft": [...],           # Aircraft render data
        "goal_positions": [...],     # Goal markers and trajectories
        "sector_boundary": {...},    # Sector boundary
        "grid": [...],               # Grid lines and labels
        "navigation_aids": [...],    # Navigation aids
        "separation_zones": [...],   # Separation zones
        "conflicts": [...]           # Conflict indicators
    },
    "metadata": {
        "active_aircraft_count": int,
        "selected_aircraft": [str],
        "conflict_summary": {...},
        "fps": float,
        "frame_count": int
    }
}
```

## Performance

The visualizer is designed for efficient real-time rendering:

- **Target FPS**: Configurable (default 15 FPS)
- **Update Rate Limiting**: Prevents excessive updates
- **Efficient Data Structures**: Circular buffers for trails and history
- **Lazy Evaluation**: Only computes what's needed for rendering
- **Performance Tracking**: Built-in FPS and render time monitoring

### Performance Statistics

```python
perf_stats = visualizer.get_performance_stats()
# Returns:
# {
#     "current_fps": float,
#     "target_fps": float,
#     "average_render_time": float,
#     "max_render_time": float,
#     "frame_count": int,
#     "active_aircraft": int,
#     "selected_aircraft_count": int
# }
```

## Configuration Options

### VisualizationConfig

```python
config = VisualizationConfig(
    # Canvas settings
    canvas_width=800,
    canvas_height=600,
    background_color="#1A1A1A",
    
    # Update settings
    target_fps=15.0,
    max_update_rate=30.0,
    
    # Feature toggles
    show_aircraft=True,
    show_trails=True,
    show_separation_zones=True,
    show_conflicts=True,
    show_sector_boundary=True,
    show_grid=True,
    show_navigation_aids=True,
    show_goal_positions=True,
    
    # Selection settings
    allow_aircraft_selection=True,
    max_selected_aircraft=3
)
```

### GridConfiguration

```python
from visualization.scenario import GridConfiguration

grid_config = GridConfiguration(
    major_grid_spacing=10.0,      # NM
    minor_grid_spacing=2.0,       # NM
    show_major_grid=True,
    show_minor_grid=True,
    show_grid_labels=True,
    major_grid_color="#34495E",
    minor_grid_color="#7F8C8D",
    major_grid_width=1.0,
    minor_grid_width=0.5
)
```

## Testing

Run the test scripts to verify functionality:

```bash
# Basic component tests
python test_scenario_visualizer.py

# Integration tests with aircraft movement
python test_scenario_integration.py

# Event system integration
python visualization/examples/visualizer_with_events.py
```

## Requirements

The scenario visualizer requires:

- **Requirements 1.1, 1.2, 1.3**: Real-time aircraft visualization with position, heading, and trail rendering
- **Requirements 1.4, 1.5**: Separation distance visualization and conflict detection
- **Requirements 1.1, 1.3**: Sector boundary and navigation rendering

All requirements from the design document are fully implemented.

## Future Enhancements

Potential improvements for future versions:

- WebGL/Canvas rendering for web dashboard
- 3D visualization with altitude representation
- Historical playback and time-travel debugging
- Advanced conflict prediction algorithms
- Customizable color schemes and themes
- Export to video/animation formats