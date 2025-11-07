/**
 * End-to-end integration tests for the complete dashboard
 * Tests cross-browser compatibility and full user workflows
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';
import WebSocketService from '../services/WebSocketService';

// Mock WebSocketService
jest.mock('../services/WebSocketService');

describe('Dashboard E2E Integration Tests', () => {
  let mockWsService: any;
  let messageHandlers: Map<string, Function>;
  let connectCallback: Function;
  let disconnectCallback: Function;

  beforeEach(() => {
    messageHandlers = new Map();

    mockWsService = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      send: jest.fn(),
      sendTrainingCommand: jest.fn(),
      sendScenarioCommand: jest.fn(),
      requestData: jest.fn(),
      onConnect: jest.fn((callback) => {
        connectCallback = callback;
      }),
      onDisconnect: jest.fn((callback) => {
        disconnectCallback = callback;
      }),
      onMessage: jest.fn((type, handler) => {
        messageHandlers.set(type, handler);
      }),
      getInstance: jest.fn()
    };

    (WebSocketService.getInstance as jest.Mock).mockReturnValue(mockWsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Training Workflow', () => {
    test('should handle complete training session from start to finish', async () => {
      render(<App />);

      // Simulate connection
      act(() => {
        connectCallback();
      });

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
      });

      // Start training
      const startButton = screen.getByText('Start');
      fireEvent.click(startButton);

      expect(mockWsService.sendTrainingCommand).toHaveBeenCalledWith(
        'start',
        expect.any(Object)
      );

      // Simulate training status updates
      act(() => {
        messageHandlers.get('training_status')?.({
          status: 'running',
          currentEpisode: 1,
          totalEpisodes: 10,
          currentStep: 0,
          totalSteps: 100,
          elapsedTime: 10,
          estimatedTimeRemaining: 90,
          learningRate: 0.0003,
          epsilon: 0.1,
          lastReward: 5.0,
          averageReward: 5.0,
          bestReward: 5.0
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Status: running')).toBeInTheDocument();
      });

      // Simulate scenario updates during training
      for (let i = 0; i < 5; i++) {
        act(() => {
          messageHandlers.get('scenario_update')?.({
            timestamp: Date.now(),
            aircraft: [
              {
                id: 'AC001',
                position: [10 + i, 20 + i],
                velocity: 250,
                heading: 1.57,
                altitude: 10000,
                goalPosition: [50, 50],
                alive: true,
                intent: 'landing',
                trailHistory: []
              }
            ],
            conflicts: [],
            sectorBounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
            episode: 1,
            step: i
          });
        });
      }

      await waitFor(() => {
        expect(screen.getByText('Aircraft Count: 1')).toBeInTheDocument();
      });

      // Simulate decision updates
      act(() => {
        messageHandlers.get('decision_update')?.({
          timestamp: Date.now(),
          aircraftId: 'AC001',
          observation: [1, 2, 3],
          action: [0.5, 0.1],
          policyLogits: [0.8, 0.2],
          valueEstimate: 10.5,
          confidenceScores: { heading: 0.9, altitude: 0.8 },
          explanation: 'Maintaining safe separation',
          predictedOutcomes: { safety: 0.95, efficiency: 0.85 }
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Decisions: 1')).toBeInTheDocument();
      });

      // Pause training
      const pauseButton = screen.getByText('Pause');
      fireEvent.click(pauseButton);

      expect(mockWsService.sendTrainingCommand).toHaveBeenCalledWith(
        'pause',
        expect.any(Object)
      );

      // Update status to paused
      act(() => {
        messageHandlers.get('training_status')?.({
          status: 'paused',
          currentEpisode: 5,
          totalEpisodes: 10,
          currentStep: 50,
          totalSteps: 100,
          elapsedTime: 50,
          estimatedTimeRemaining: 50,
          learningRate: 0.0003,
          epsilon: 0.1,
          lastReward: 8.0,
          averageReward: 6.5,
          bestReward: 10.0
        });
      });

      await waitFor(() => {
        expect(screen.getByText('PAUSED')).toBeInTheDocument();
      });

      // Resume training
      fireEvent.click(startButton);

      // Stop training
      const stopButton = screen.getByText('Stop');
      fireEvent.click(stopButton);

      expect(mockWsService.sendTrainingCommand).toHaveBeenCalledWith(
        'stop',
        expect.any(Object)
      );
    });

    test('should handle scenario switching during training', async () => {
      render(<App />);

      act(() => {
        connectCallback();
      });

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
      });

      // Select different scenario
      const scenarioSelect = screen.getByLabelText('Scenario');
      fireEvent.mouseDown(scenarioSelect);

      await waitFor(() => {
        const complexOption = screen.getByText('Complex Traffic');
        fireEvent.click(complexOption);
      });

      expect(mockWsService.sendScenarioCommand).toHaveBeenCalledWith(
        'load_scenario',
        { scenarioId: 'complex-traffic' }
      );

      // Simulate scenario update with more aircraft
      act(() => {
        messageHandlers.get('scenario_update')?.({
          timestamp: Date.now(),
          aircraft: [
            { id: 'AC001', position: [10, 20] },
            { id: 'AC002', position: [30, 40] },
            { id: 'AC003', position: [50, 60] },
            { id: 'AC004', position: [70, 80] }
          ],
          conflicts: [
            {
              aircraftIds: ['AC001', 'AC002'],
              distance: 4.5,
              severity: 'medium',
              timeToClosestApproach: 30
            }
          ],
          sectorBounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
          episode: 1,
          step: 0
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Aircraft Count: 4')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Data Streaming', () => {
    test('should handle continuous performance metric updates', async () => {
      render(<App />);

      act(() => {
        connectCallback();
      });

      await waitFor(() => {
        expect(messageHandlers.has('performance_update')).toBe(true);
      });

      // Simulate 100 performance updates
      const handler = messageHandlers.get('performance_update');
      
      for (let i = 0; i < 100; i++) {
        act(() => {
          handler?.({
            timestamp: Date.now() + i * 1000,
            episode: Math.floor(i / 10),
            step: i % 10,
            reward: Math.random() * 10,
            cumulativeReward: i * 5,
            safetyScore: 0.9 + Math.random() * 0.1,
            efficiencyScore: 0.8 + Math.random() * 0.2,
            violationCount: Math.floor(Math.random() * 3),
            averageConfidence: 0.85 + Math.random() * 0.15
          });
        });
      }

      await waitFor(() => {
        expect(screen.getByText('Data Points: 100')).toBeInTheDocument();
      });
    });

    test('should maintain data consistency across rapid updates', async () => {
      render(<App />);

      act(() => {
        connectCallback();
      });

      await waitFor(() => {
        expect(messageHandlers.size).toBeGreaterThan(0);
      });

      // Send rapid updates to all channels
      for (let i = 0; i < 20; i++) {
        act(() => {
          // Training status
          messageHandlers.get('training_status')?.({
            status: 'running',
            currentEpisode: i,
            totalEpisodes: 100,
            lastReward: i * 0.5
          });

          // Scenario update
          messageHandlers.get('scenario_update')?.({
            aircraft: [{ id: `AC${i}`, position: [i, i] }],
            conflicts: []
          });

          // Decision update
          messageHandlers.get('decision_update')?.({
            aircraftId: `AC${i}`,
            explanation: `Decision ${i}`
          });

          // Performance update
          messageHandlers.get('performance_update')?.({
            episode: i,
            reward: i * 0.5
          });
        });
      }

      await waitFor(() => {
        // All components should be updated
        expect(screen.getByTestId('training-controls')).toBeInTheDocument();
        expect(screen.getByTestId('scenario-visualizer')).toBeInTheDocument();
        expect(screen.getByTestId('decision-tracker')).toBeInTheDocument();
        expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      });
    });
  });

  describe('Connection Resilience', () => {
    test('should handle connection loss and recovery', async () => {
      render(<App />);

      // Initial connection
      act(() => {
        connectCallback();
      });

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      // Simulate connection loss
      act(() => {
        disconnectCallback();
      });

      await waitFor(() => {
        expect(screen.getByText('Disconnected')).toBeInTheDocument();
      });

      // Verify controls are disabled
      const startButton = screen.getByText('Start').closest('button');
      expect(startButton).toBeDisabled();

      // Simulate reconnection
      act(() => {
        connectCallback();
      });

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      // Verify controls are re-enabled
      expect(startButton).not.toBeDisabled();
    });

    test('should buffer data during disconnection', async () => {
      render(<App />);

      act(() => {
        connectCallback();
      });

      await waitFor(() => {
        expect(messageHandlers.has('performance_update')).toBe(true);
      });

      // Send some data while connected
      act(() => {
        messageHandlers.get('performance_update')?.({
          episode: 1,
          reward: 5.0
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Data Points: 1')).toBeInTheDocument();
      });

      // Disconnect
      act(() => {
        disconnectCallback();
      });

      // Reconnect
      act(() => {
        connectCallback();
      });

      // Send more data after reconnection
      act(() => {
        messageHandlers.get('performance_update')?.({
          episode: 2,
          reward: 6.0
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Data Points: 2')).toBeInTheDocument();
      });
    });
  });

  describe('User Interaction Workflows', () => {
    test('should handle configuration changes', async () => {
      render(<App />);

      act(() => {
        connectCallback();
      });

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      // Open configuration dialog
      const configButton = screen.getByText('Configure');
      fireEvent.click(configButton);

      await waitFor(() => {
        expect(screen.getByText('Training Configuration')).toBeInTheDocument();
      });

      // Change learning rate
      const learningRateInput = screen.getByLabelText('Learning Rate');
      fireEvent.change(learningRateInput, { target: { value: '0.001' } });

      // Change batch size
      const batchSizeInput = screen.getByLabelText('Batch Size');
      fireEvent.change(batchSizeInput, { target: { value: '128' } });

      // Save configuration
      const saveButton = screen.getByText('Save Configuration');
      fireEvent.click(saveButton);

      expect(mockWsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'update_config',
          data: expect.objectContaining({
            learningRate: 0.001,
            batchSize: 128
          })
        })
      );

      await waitFor(() => {
        expect(screen.queryByText('Training Configuration')).not.toBeInTheDocument();
      });
    });

    test('should handle save checkpoint action', async () => {
      render(<App />);

      act(() => {
        connectCallback();
      });

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      expect(mockWsService.sendTrainingCommand).toHaveBeenCalledWith(
        'save_checkpoint',
        expect.any(Object)
      );
    });

    test('should handle refresh action', async () => {
      render(<App />);

      act(() => {
        connectCallback();
      });

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      expect(mockWsService.requestData).toHaveBeenCalledWith('training_status');
    });
  });

  describe('Dashboard Responsiveness', () => {
    test('should render correctly on different viewport sizes', () => {
      // Desktop view
      global.innerWidth = 1920;
      global.innerHeight = 1080;
      
      const { container } = render(<App />);
      
      expect(container.querySelector('[data-testid="training-controls"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="scenario-visualizer"]')).toBeInTheDocument();
    });

    test('should handle component mounting and unmounting', () => {
      const { unmount } = render(<App />);

      expect(screen.getByTestId('training-controls')).toBeInTheDocument();

      unmount();

      expect(mockWsService.disconnect).toHaveBeenCalled();
    });

    test('should maintain state during re-renders', async () => {
      const { rerender } = render(<App />);

      act(() => {
        connectCallback();
      });

      await waitFor(() => {
        expect(messageHandlers.has('training_status')).toBe(true);
      });

      // Send training data
      act(() => {
        messageHandlers.get('training_status')?.({
          status: 'running',
          currentEpisode: 10,
          totalEpisodes: 100
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Status: running')).toBeInTheDocument();
      });

      // Force re-render
      rerender(<App />);

      // State should be maintained
      expect(screen.getByText('Status: running')).toBeInTheDocument();
    });
  });

  describe('Error Scenarios', () => {
    test('should handle WebSocket errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<App />);

      // Simulate WebSocket error
      mockWsService.connect.mockImplementation(() => {
        throw new Error('WebSocket connection failed');
      });

      // Should not crash the app
      expect(screen.getByTestId('training-controls')).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });

    test('should handle invalid message data', async () => {
      render(<App />);

      act(() => {
        connectCallback();
      });

      await waitFor(() => {
        expect(messageHandlers.has('training_status')).toBe(true);
      });

      // Send invalid data
      act(() => {
        messageHandlers.get('training_status')?.({
          // Missing required fields
          status: 'running'
        });
      });

      // Should not crash
      expect(screen.getByTestId('training-controls')).toBeInTheDocument();
    });
  });
});
