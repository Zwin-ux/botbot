import React, { useState, useEffect } from 'react';
import { Box, Container, AppBar, Toolbar, Typography, Grid, Paper } from '@mui/material';
import { motion } from 'framer-motion';
import WebSocketService from './services/WebSocketService';
import ScenarioVisualizer from './components/ScenarioVisualizer';
import TrainingControls from './components/TrainingControls';
import PerformanceMetrics from './components/PerformanceMetrics';
import DecisionTracker from './components/DecisionTracker';
import ConnectionStatus from './components/ConnectionStatus';
import { TrainingData, ScenarioData, DecisionData, PerformanceData } from './types';

const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [trainingData, setTrainingData] = useState<TrainingData | null>(null);
  const [scenarioData, setScenarioData] = useState<ScenarioData | null>(null);
  const [decisionData, setDecisionData] = useState<DecisionData[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);

  useEffect(() => {
    const wsService = WebSocketService.getInstance();
    
    // Set up WebSocket event handlers
    wsService.onConnect(() => {
      setIsConnected(true);
      console.log('Connected to WebSocket server');
    });

    wsService.onDisconnect(() => {
      setIsConnected(false);
      console.log('Disconnected from WebSocket server');
    });

    wsService.onMessage('training_status', (data: TrainingData) => {
      setTrainingData(data);
    });

    wsService.onMessage('scenario_update', (data: ScenarioData) => {
      setScenarioData(data);
    });

    wsService.onMessage('decision_update', (data: DecisionData) => {
      setDecisionData(prev => [...prev.slice(-99), data]); // Keep last 100 decisions
    });

    wsService.onMessage('performance_update', (data: PerformanceData) => {
      setPerformanceData(prev => [...prev.slice(-199), data]); // Keep last 200 data points
    });

    // Connect to WebSocket server
    wsService.connect('ws://localhost:8080');

    return () => {
      wsService.disconnect();
    };
  }, []);

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper' }}>
        <Toolbar>
          <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            🛩️ AI Controller Training Dashboard
          </Typography>
          <ConnectionStatus isConnected={isConnected} />
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Grid container spacing={3}>
            {/* Training Controls */}
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 2, bgcolor: 'background.paper' }}>
                <TrainingControls 
                  trainingData={trainingData}
                  isConnected={isConnected}
                />
              </Paper>
            </Grid>

            {/* Scenario Visualizer */}
            <Grid item xs={12} lg={8}>
              <Paper elevation={3} sx={{ p: 2, bgcolor: 'background.paper', height: 600 }}>
                <ScenarioVisualizer 
                  scenarioData={scenarioData}
                  isConnected={isConnected}
                />
              </Paper>
            </Grid>

            {/* Decision Tracker */}
            <Grid item xs={12} lg={4}>
              <Paper elevation={3} sx={{ p: 2, bgcolor: 'background.paper', height: 600 }}>
                <DecisionTracker 
                  decisions={decisionData}
                  isConnected={isConnected}
                />
              </Paper>
            </Grid>

            {/* Performance Metrics */}
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 2, bgcolor: 'background.paper' }}>
                <PerformanceMetrics 
                  performanceData={performanceData}
                  isConnected={isConnected}
                />
              </Paper>
            </Grid>
          </Grid>
        </motion.div>
      </Container>
    </Box>
  );
};

export default App;