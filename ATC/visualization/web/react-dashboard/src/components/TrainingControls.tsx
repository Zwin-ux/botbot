import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  ButtonGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Stop,
  Settings,
  Refresh,
  Save
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { TrainingData, ScenarioConfig, TrainingConfig } from '../types';
import WebSocketService from '../services/WebSocketService';

interface TrainingControlsProps {
  trainingData: TrainingData | null;
  isConnected: boolean;
}

const TrainingControls: React.FC<TrainingControlsProps> = ({
  trainingData,
  isConnected
}) => {
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState('basic-separation');
  const [trainingConfig, setTrainingConfig] = useState<TrainingConfig>({
    algorithm: 'PPO',
    learningRate: 0.0003,
    batchSize: 64,
    episodes: 1000,
    maxSteps: 500,
    epsilon: 0.1,
    gamma: 0.99,
    scenario: {
      name: 'Basic Separation',
      description: 'Basic air traffic separation scenario',
      aircraftCount: 4,
      sectorSize: 50,
      difficulty: 'medium',
      duration: 300,
      safetyThreshold: 5.0
    }
  });

  const wsService = WebSocketService.getInstance();

  const scenarios = [
    {
      id: 'basic-separation',
      name: 'Basic Separation',
      description: 'Simple 4-aircraft separation scenario',
      difficulty: 'easy'
    },
    {
      id: 'complex-traffic',
      name: 'Complex Traffic',
      description: '8-aircraft high-density scenario',
      difficulty: 'hard'
    },
    {
      id: 'weather-avoidance',
      name: 'Weather Avoidance',
      description: 'Traffic with weather constraints',
      difficulty: 'expert'
    }
  ];

  const handleTrainingCommand = (command: string) => {
    if (!isConnected) return;

    wsService.sendTrainingCommand(command, {
      scenario: selectedScenario,
      config: trainingConfig
    });
  };

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (scenario) {
      wsService.sendScenarioCommand('load_scenario', { scenarioId });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'success';
      case 'paused': return 'warning';
      case 'error': return 'error';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  const getProgressValue = () => {
    if (!trainingData) return 0;
    return (trainingData.currentEpisode / trainingData.totalEpisodes) * 100;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        🎮 Training Controls
        {trainingData && (
          <Chip
            label={trainingData.status.toUpperCase()}
            color={getStatusColor(trainingData.status) as any}
            size="small"
          />
        )}
      </Typography>

      <Grid container spacing={3}>
        {/* Control Buttons */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Training Control
              </Typography>
              <ButtonGroup variant="contained" fullWidth sx={{ mb: 2 }}>
                <Button
                  startIcon={<PlayArrow />}
                  onClick={() => handleTrainingCommand('start')}
                  disabled={!isConnected || trainingData?.status === 'running'}
                  color="success"
                >
                  Start
                </Button>
                <Button
                  startIcon={<Pause />}
                  onClick={() => handleTrainingCommand('pause')}
                  disabled={!isConnected || trainingData?.status !== 'running'}
                  color="warning"
                >
                  Pause
                </Button>
                <Button
                  startIcon={<Stop />}
                  onClick={() => handleTrainingCommand('stop')}
                  disabled={!isConnected || trainingData?.status === 'idle'}
                  color="error"
                >
                  Stop
                </Button>
              </ButtonGroup>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  startIcon={<Settings />}
                  onClick={() => setConfigDialogOpen(true)}
                  variant="outlined"
                  size="small"
                >
                  Configure
                </Button>
                <Button
                  startIcon={<Refresh />}
                  onClick={() => wsService.requestData('training_status')}
                  variant="outlined"
                  size="small"
                  disabled={!isConnected}
                >
                  Refresh
                </Button>
                <Button
                  startIcon={<Save />}
                  onClick={() => handleTrainingCommand('save_checkpoint')}
                  variant="outlined"
                  size="small"
                  disabled={!isConnected}
                >
                  Save
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Scenario Selection */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Scenario Selection
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Scenario</InputLabel>
                <Select
                  value={selectedScenario}
                  label="Scenario"
                  onChange={(e) => handleScenarioChange(e.target.value)}
                  disabled={!isConnected || trainingData?.status === 'running'}
                >
                  {scenarios.map((scenario) => (
                    <MenuItem key={scenario.id} value={scenario.id}>
                      <Box>
                        <Typography variant="body2">{scenario.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {scenario.description} • {scenario.difficulty}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>

        {/* Training Progress */}
        {trainingData && (
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Training Progress
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">
                      Episode {trainingData.currentEpisode} / {trainingData.totalEpisodes}
                    </Typography>
                    <Typography variant="body2">
                      {getProgressValue().toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getProgressValue()}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      Elapsed Time
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatTime(trainingData.elapsedTime)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      ETA
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatTime(trainingData.estimatedTimeRemaining)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      Last Reward
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {trainingData.lastReward.toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      Best Reward
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="success.main">
                      {trainingData.bestReward.toFixed(2)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Configuration Dialog */}
      <Dialog
        open={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Training Configuration</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Learning Rate"
                type="number"
                value={trainingConfig.learningRate}
                onChange={(e) => setTrainingConfig(prev => ({
                  ...prev,
                  learningRate: parseFloat(e.target.value)
                }))}
                inputProps={{ step: 0.0001, min: 0.0001, max: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Batch Size"
                type="number"
                value={trainingConfig.batchSize}
                onChange={(e) => setTrainingConfig(prev => ({
                  ...prev,
                  batchSize: parseInt(e.target.value)
                }))}
                inputProps={{ min: 16, max: 512 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Episodes"
                type="number"
                value={trainingConfig.episodes}
                onChange={(e) => setTrainingConfig(prev => ({
                  ...prev,
                  episodes: parseInt(e.target.value)
                }))}
                inputProps={{ min: 100, max: 10000 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Max Steps per Episode"
                type="number"
                value={trainingConfig.maxSteps}
                onChange={(e) => setTrainingConfig(prev => ({
                  ...prev,
                  maxSteps: parseInt(e.target.value)
                }))}
                inputProps={{ min: 100, max: 2000 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Epsilon"
                type="number"
                value={trainingConfig.epsilon}
                onChange={(e) => setTrainingConfig(prev => ({
                  ...prev,
                  epsilon: parseFloat(e.target.value)
                }))}
                inputProps={{ step: 0.01, min: 0.01, max: 1.0 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Gamma (Discount Factor)"
                type="number"
                value={trainingConfig.gamma}
                onChange={(e) => setTrainingConfig(prev => ({
                  ...prev,
                  gamma: parseFloat(e.target.value)
                }))}
                inputProps={{ step: 0.01, min: 0.9, max: 0.999 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setConfigDialogOpen(false);
              // Save configuration
              wsService.send({
                type: 'update_config',
                data: trainingConfig,
                timestamp: Date.now()
              });
            }}
            variant="contained"
          >
            Save Configuration
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TrainingControls;