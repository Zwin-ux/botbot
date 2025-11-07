import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Slider,
  FormControlLabel,
  Switch,
  Chip
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { ScenarioData, AircraftState, ConflictInfo } from '../types';

interface ScenarioVisualizerProps {
  scenarioData: ScenarioData | null;
  isConnected: boolean;
}

interface VisualizationSettings {
  showTrails: boolean;
  showSeparationZones: boolean;
  showGoals: boolean;
  showGrid: boolean;
  trailLength: number;
  zoom: number;
  centerX: number;
  centerY: number;
}

const ScenarioVisualizer: React.FC<ScenarioVisualizerProps> = ({
  scenarioData,
  isConnected
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [settings, setSettings] = useState<VisualizationSettings>({
    showTrails: true,
    showSeparationZones: true,
    showGoals: true,
    showGrid: true,
    trailLength: 20,
    zoom: 1.0,
    centerX: 0,
    centerY: 0
  });

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 500;
  const AIRCRAFT_SIZE = 8;
  const SEPARATION_DISTANCE = 5; // nautical miles

  useEffect(() => {
    if (scenarioData) {
      renderScenario();
    }
  }, [scenarioData, settings]);

  const renderScenario = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (!scenarioData) {
      // Show "No Data" message
      ctx.fillStyle = '#666';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No scenario data available', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      return;
    }

    // Calculate scale and offset
    const bounds = scenarioData.sectorBounds;
    const sectorWidth = bounds.maxX - bounds.minX;
    const sectorHeight = bounds.maxY - bounds.minY;
    
    const scaleX = (CANVAS_WIDTH * 0.8) / sectorWidth * settings.zoom;
    const scaleY = (CANVAS_HEIGHT * 0.8) / sectorHeight * settings.zoom;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = CANVAS_WIDTH / 2 - (bounds.minX + sectorWidth / 2) * scale + settings.centerX;
    const offsetY = CANVAS_HEIGHT / 2 - (bounds.minY + sectorHeight / 2) * scale + settings.centerY;

    // Helper function to convert coordinates
    const toCanvasX = (x: number) => x * scale + offsetX;
    const toCanvasY = (y: number) => CANVAS_HEIGHT - (y * scale + offsetY);

    // Draw grid
    if (settings.showGrid) {
      drawGrid(ctx, bounds, scale, offsetX, offsetY);
    }

    // Draw sector boundaries
    drawSectorBoundaries(ctx, bounds, scale, offsetX, offsetY);

    // Draw separation zones
    if (settings.showSeparationZones) {
      drawSeparationZones(ctx, scenarioData.aircraft, scale, offsetX, offsetY);
    }

    // Draw conflicts
    drawConflicts(ctx, scenarioData.conflicts, scenarioData.aircraft, scale, offsetX, offsetY);

    // Draw aircraft trails
    if (settings.showTrails) {
      drawAircraftTrails(ctx, scenarioData.aircraft, scale, offsetX, offsetY);
    }

    // Draw aircraft
    drawAircraft(ctx, scenarioData.aircraft, scale, offsetX, offsetY);

    // Draw goals
    if (settings.showGoals) {
      drawGoals(ctx, scenarioData.aircraft, scale, offsetX, offsetY);
    }

    // Draw info overlay
    drawInfoOverlay(ctx, scenarioData);
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, bounds: any, scale: number, offsetX: number, offsetY: number) => {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    const gridSpacing = 10; // nautical miles
    const startX = Math.floor(bounds.minX / gridSpacing) * gridSpacing;
    const endX = Math.ceil(bounds.maxX / gridSpacing) * gridSpacing;
    const startY = Math.floor(bounds.minY / gridSpacing) * gridSpacing;
    const endY = Math.ceil(bounds.maxY / gridSpacing) * gridSpacing;

    // Vertical lines
    for (let x = startX; x <= endX; x += gridSpacing) {
      const canvasX = x * scale + offsetX;
      ctx.beginPath();
      ctx.moveTo(canvasX, 0);
      ctx.lineTo(canvasX, CANVAS_HEIGHT);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = startY; y <= endY; y += gridSpacing) {
      const canvasY = CANVAS_HEIGHT - (y * scale + offsetY);
      ctx.beginPath();
      ctx.moveTo(0, canvasY);
      ctx.lineTo(CANVAS_WIDTH, canvasY);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  };

  const drawSectorBoundaries = (ctx: CanvasRenderingContext2D, bounds: any, scale: number, offsetX: number, offsetY: number) => {
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    const x1 = bounds.minX * scale + offsetX;
    const y1 = CANVAS_HEIGHT - (bounds.minY * scale + offsetY);
    const x2 = bounds.maxX * scale + offsetX;
    const y2 = CANVAS_HEIGHT - (bounds.maxY * scale + offsetY);

    ctx.strokeRect(x1, y2, x2 - x1, y1 - y2);
  };

  const drawSeparationZones = (ctx: CanvasRenderingContext2D, aircraft: AircraftState[], scale: number, offsetX: number, offsetY: number) => {
    aircraft.forEach(ac => {
      if (!ac.alive) return;

      const x = ac.position[0] * scale + offsetX;
      const y = CANVAS_HEIGHT - (ac.position[1] * scale + offsetY);
      const radius = SEPARATION_DISTANCE * scale;

      ctx.strokeStyle = 'rgba(255, 193, 7, 0.3)';
      ctx.fillStyle = 'rgba(255, 193, 7, 0.1)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    });

    ctx.setLineDash([]);
  };

  const drawConflicts = (ctx: CanvasRenderingContext2D, conflicts: ConflictInfo[], aircraft: AircraftState[], scale: number, offsetX: number, offsetY: number) => {
    conflicts.forEach(conflict => {
      const ac1 = aircraft.find(ac => ac.id === conflict.aircraftIds[0]);
      const ac2 = aircraft.find(ac => ac.id === conflict.aircraftIds[1]);

      if (!ac1 || !ac2) return;

      const x1 = ac1.position[0] * scale + offsetX;
      const y1 = CANVAS_HEIGHT - (ac1.position[1] * scale + offsetY);
      const x2 = ac2.position[0] * scale + offsetX;
      const y2 = CANVAS_HEIGHT - (ac2.position[1] * scale + offsetY);

      // Color based on severity
      let color = '#4CAF50'; // low
      if (conflict.severity === 'medium') color = '#FF9800';
      if (conflict.severity === 'high') color = '#F44336';
      if (conflict.severity === 'critical') color = '#D32F2F';

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Draw conflict indicator
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(midX, midY, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  const drawAircraftTrails = (ctx: CanvasRenderingContext2D, aircraft: AircraftState[], scale: number, offsetX: number, offsetY: number) => {
    aircraft.forEach(ac => {
      if (!ac.alive || ac.trailHistory.length < 2) return;

      ctx.strokeStyle = 'rgba(100, 149, 237, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);

      ctx.beginPath();
      const trail = ac.trailHistory.slice(-settings.trailLength);
      
      trail.forEach((point, index) => {
        const x = point[0] * scale + offsetX;
        const y = CANVAS_HEIGHT - (point[1] * scale + offsetY);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
    });
  };

  const drawAircraft = (ctx: CanvasRenderingContext2D, aircraft: AircraftState[], scale: number, offsetX: number, offsetY: number) => {
    aircraft.forEach(ac => {
      if (!ac.alive) return;

      const x = ac.position[0] * scale + offsetX;
      const y = CANVAS_HEIGHT - (ac.position[1] * scale + offsetY);

      // Aircraft symbol (triangle pointing in heading direction)
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-ac.heading); // Negative because canvas Y is flipped

      ctx.fillStyle = '#2196F3';
      ctx.strokeStyle = '#1976D2';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(AIRCRAFT_SIZE, 0);
      ctx.lineTo(-AIRCRAFT_SIZE / 2, -AIRCRAFT_SIZE / 2);
      ctx.lineTo(-AIRCRAFT_SIZE / 2, AIRCRAFT_SIZE / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();

      // Aircraft label
      ctx.fillStyle = '#FFF';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(ac.id, x, y - AIRCRAFT_SIZE - 5);

      // Altitude and speed
      ctx.font = '10px Arial';
      ctx.fillText(`${Math.round(ac.altitude)}ft`, x, y + AIRCRAFT_SIZE + 15);
      ctx.fillText(`${Math.round(ac.velocity)}kt`, x, y + AIRCRAFT_SIZE + 25);
    });
  };

  const drawGoals = (ctx: CanvasRenderingContext2D, aircraft: AircraftState[], scale: number, offsetX: number, offsetY: number) => {
    aircraft.forEach(ac => {
      if (!ac.alive) return;

      const x = ac.goalPosition[0] * scale + offsetX;
      const y = CANVAS_HEIGHT - (ac.goalPosition[1] * scale + offsetY);

      ctx.strokeStyle = '#4CAF50';
      ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Draw line from aircraft to goal
      const acX = ac.position[0] * scale + offsetX;
      const acY = CANVAS_HEIGHT - (ac.position[1] * scale + offsetY);

      ctx.strokeStyle = 'rgba(76, 175, 80, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      ctx.beginPath();
      ctx.moveTo(acX, acY);
      ctx.lineTo(x, y);
      ctx.stroke();
    });

    ctx.setLineDash([]);
  };

  const drawInfoOverlay = (ctx: CanvasRenderingContext2D, data: ScenarioData) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 200, 80);

    ctx.fillStyle = '#FFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';

    ctx.fillText(`Episode: ${data.episode}`, 20, 30);
    ctx.fillText(`Step: ${data.step}`, 20, 45);
    ctx.fillText(`Aircraft: ${data.aircraft.filter(ac => ac.alive).length}`, 20, 60);
    ctx.fillText(`Conflicts: ${data.conflicts.length}`, 20, 75);
  };

  const handleZoom = (delta: number) => {
    setSettings(prev => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(5.0, prev.zoom + delta))
    }));
  };

  const handleCenter = () => {
    setSettings(prev => ({
      ...prev,
      centerX: 0,
      centerY: 0,
      zoom: 1.0
    }));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          ✈️ Scenario Visualizer
          {scenarioData && (
            <Chip
              label={`${scenarioData.aircraft.filter(ac => ac.alive).length} Aircraft`}
              size="small"
              color="primary"
            />
          )}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Zoom In">
            <IconButton onClick={() => handleZoom(0.2)} size="small">
              <ZoomIn />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out">
            <IconButton onClick={() => handleZoom(-0.2)} size="small">
              <ZoomOut />
            </IconButton>
          </Tooltip>
          <Tooltip title="Center View">
            <IconButton onClick={handleCenter} size="small">
              <CenterFocusStrong />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2 }}>
        {/* Main Canvas */}
        <Box sx={{ flex: 1 }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{
              border: '1px solid #444',
              borderRadius: '8px',
              backgroundColor: '#1a1a1a',
              width: '100%',
              height: 'auto'
            }}
          />
        </Box>

        {/* Controls Panel */}
        <Card sx={{ width: 250, height: 'fit-content' }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Display Options
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.showTrails}
                  onChange={(e) => setSettings(prev => ({ ...prev, showTrails: e.target.checked }))}
                  size="small"
                />
              }
              label="Aircraft Trails"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.showSeparationZones}
                  onChange={(e) => setSettings(prev => ({ ...prev, showSeparationZones: e.target.checked }))}
                  size="small"
                />
              }
              label="Separation Zones"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.showGoals}
                  onChange={(e) => setSettings(prev => ({ ...prev, showGoals: e.target.checked }))}
                  size="small"
                />
              }
              label="Goal Positions"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.showGrid}
                  onChange={(e) => setSettings(prev => ({ ...prev, showGrid: e.target.checked }))}
                  size="small"
                />
              }
              label="Grid"
            />

            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" gutterBottom>
                Trail Length
              </Typography>
              <Slider
                value={settings.trailLength}
                onChange={(_, value) => setSettings(prev => ({ ...prev, trailLength: value as number }))}
                min={5}
                max={50}
                step={5}
                size="small"
                valueLabelDisplay="auto"
              />
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" gutterBottom>
                Zoom: {settings.zoom.toFixed(1)}x
              </Typography>
              <Slider
                value={settings.zoom}
                onChange={(_, value) => setSettings(prev => ({ ...prev, zoom: value as number }))}
                min={0.1}
                max={5.0}
                step={0.1}
                size="small"
                valueLabelDisplay="auto"
              />
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default ScenarioVisualizer;