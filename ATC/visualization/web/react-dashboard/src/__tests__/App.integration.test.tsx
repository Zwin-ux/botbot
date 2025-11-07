/**
 * Integration tests for App component
 * Tests dashboard responsiveness and component integration
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';
import WebSocketService from '../services/WebSocketService';

// Mock WebSocketService
jest.mock('../services/WebSocketService');

// Mock child components to focus on integration
jest.mock('../components/ScenarioVisualizer', () => {
  return function MockScenarioVisualizer({ scenarioData, isConnected }: any) {
    return (
      <div data-testid="scenario-visualizer">
        <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
        {scenarioData && <div>Aircraft Count: {scenarioData.aircraft.length}</div>}
      </div>
    );
  };
});

jest.mock('../components/TrainingControls', () => {
  return function MockTrainingControls({ trainingData, isConnected }: any) {
    return (
      <div data-testid="training-controls">
        <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
        {trainingData && <div>Status: {trainingData.status}</div>}
      </div>
    );
  };
});

jest.mock('../components/PerformanceMetrics', () => {
  return function MockPerformanceMetrics({ performanceData, isConnected }: any) {
    return (
      <div data-testid="performance-metrics">
        <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
        <div>Data Points: {performanceData.length}</div>
      </div>
    );
  };
});

jest.mock('../components/DecisionTracker', () => {
  return function MockDecisionTracker({ decisions, isConnected }: any) {
    return (
      <div data-testid="decision-tracker">
        <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
        <div>Decisions: {decisions.length}</div>
      </div>
    );
  };
});

jest.mock('../components/ConnectionStatus', () => {
  return function MockConnectionStatus({ isConnected }: any) {
    return (
      <div data-testid="connection-status">
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>
    );
  };
});

describe('App Integration Tests', () => {
  let mockWsService: any;
  let messageHandlers: Map<string, Function>;

  beforeEach(() => {
    messageHandlers = new Map();

    mockWsService = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      onConnect: jest.fn((callback) => {
        // Simulate connection after a short delay
        setTimeout(() => callback(), 10);
      }),
      onDisconnect: jest.fn(),
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

  describe('Dashboard Initialization', () => {
    test('should render all main components', () => {
      render(<App />);

      expect(screen.getByTestId('training-controls')).toBeInTheDocument();
      expect(screen.getByTestId('scenario-visualizer')).toBeInTheDocument();
      expect(screen.getByTestId('decision-tracker')).toBeInTheDocument();
      expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });

    test('should display dashboard title', () => {
      render(<App />);

      expect(screen.getByText(/AI Controller Training Dashboard/)).toBeInTheDocument();
    });

    test('should connect to WebSocket on mount', () => {
      render(<App />);

      expect(mockWsService.connect).toHaveBeenCalledWith('ws://localhost:8080');
    });

    test('should disconnect from WebSocket on unmount', () => {
      const { unmount } = render(<App />);

      unmount();

      expect(mockWsService.disconnect).toHaveBeenCalled();
    });
  });

  describe('Connection State Management', () => {
    test('should show disconnected state initially', () => {
      render(<App />);

      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(screen.getByText('Connected: No')).toBeInTheDocument();
    });

    test('should update to connected state when WebSocket connects', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });
    });

    test('should propagate connection state to all components', async () => {
      render(<App />);

      await waitFor(() => {
        const connectedTexts = screen.getAllByText('Connected: Yes');
        expect(connectedTexts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Real-time Data Updates', () => {
    test('should update training data when receiving training_status message', async () => {
      render(<App />);

      await waitFor(() => {
        expect(messageHandlers.has('training_status')).toBe(true);
      });

      act(() => {
        const handler = messageHandlers.get('training_status');
        handler?.({
          status: 'running',
          currentEpisode: 10,
          totalEpisodes: 100
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Status: running')).toBeInTheDocument();
      });
    });

    test('should update scenario data when receiving scenario_update message', async () => {
      render(<App />);

      await waitFor(() => {
        expect(messageHandlers.has('scenario_update')).toBe(true);
      });

      act(() => {
        const handler = messageHandlers.get('scenario_update');
        handler?.({
          timestamp: Date.now(),
          aircraft: [
            { id: 'AC001', position: [10, 20] },
            { id: 'AC002', position: [30, 40] }
          ],
          conflicts: []
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Aircraft Count: 2')).toBeInTheDocument();
      });
    });

    test('should accumulate decision data with limit of 100', async () => {
      render(<App />);

      await waitFor(() => {
        expect(messageHandlers.has('decision_update')).toBe(true);
      });

      const handler = messageHandlers.get('decision_update');

      // Send 105 decisions
      for (let i = 0; i < 105; i++) {
        act(() => {
          handler?.({
            timestamp: Date.now(),
            aircraftId: `AC${i}`,
            action: [0, 0],
            explanation: `Decision ${i}`
          });
        });
      }

      await waitFor(() => {
        // Should only keep last 100
        expect(screen.getByText('Decisions: 100')).toBeInTheDocument();
      });
    });

    test('should accumulate performance data with limit of 200', async () => {
      render(<App />);

      await waitFor(() => {
        expect(messageHandlers.has('performance_update')).toBe(true);
      });

      const handler = messageHandlers.get('performance_update');

      // Send 250 performance updates
      for (let i = 0; i < 250; i++) {
        act(() => {
          handler?.({
            timestamp: Date.now(),
            episode: i,
            reward: Math.random()
          });
        });
      }

      await waitFor(() => {
        // Should only keep last 200
        expect(screen.getByText('Data Points: 200')).toBeInTheDocument();
      });
    });
  });

  describe('Component Data Flow', () => {
    test('should pass null data to components initially', () => {
      render(<App />);

      // Components should handle null data gracefully
      expect(screen.getByTestId('training-controls')).toBeInTheDocument();
      expect(screen.getByTestId('scenario-visualizer')).toBeInTheDocument();
    });

    test('should update all components when data arrives', async () => {
      render(<App />);

      await waitFor(() => {
        expect(messageHandlers.size).toBeGreaterThan(0);
      });

      // Send training status
      act(() => {
        messageHandlers.get('training_status')?.({
          status: 'running',
          currentEpisode: 5
        });
      });

      // Send scenario update
      act(() => {
        messageHandlers.get('scenario_update')?.({
          aircraft: [{ id: 'AC001' }]
        });
      });

      // Send decision update
      act(() => {
        messageHandlers.get('decision_update')?.({
          aircraftId: 'AC001',
          explanation: 'Test decision'
        });
      });

      // Send performance update
      act(() => {
        messageHandlers.get('performance_update')?.({
          episode: 1,
          reward: 10
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Status: running')).toBeInTheDocument();
        expect(screen.getByText('Aircraft Count: 1')).toBeInTheDocument();
        expect(screen.getByText('Decisions: 1')).toBeInTheDocument();
        expect(screen.getByText('Data Points: 1')).toBeInTheDocument();
      });
    });
  });

  describe('Dashboard Responsiveness', () => {
    test('should handle rapid data updates without crashing', async () => {
      render(<App />);

      await waitFor(() => {
        expect(messageHandlers.has('performance_update')).toBe(true);
      });

      const handler = messageHandlers.get('performance_update');

      // Send 50 rapid updates
      act(() => {
        for (let i = 0; i < 50; i++) {
          handler?.({
            timestamp: Date.now(),
            episode: i,
            reward: Math.random()
          });
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Data Points: 50')).toBeInTheDocument();
      });
    });

    test('should maintain UI responsiveness during data updates', async () => {
      const { container } = render(<App />);

      await waitFor(() => {
        expect(messageHandlers.has('scenario_update')).toBe(true);
      });

      // Send multiple scenario updates
      for (let i = 0; i < 10; i++) {
        act(() => {
          messageHandlers.get('scenario_update')?.({
            aircraft: Array(i + 1).fill(null).map((_, idx) => ({
              id: `AC${idx}`,
              position: [idx * 10, idx * 10]
            }))
          });
        });
      }

      await waitFor(() => {
        // UI should still be responsive
        expect(container.querySelector('[data-testid="scenario-visualizer"]')).toBeInTheDocument();
      });
    });

    test('should handle connection loss gracefully', async () => {
      render(<App />);

      // Wait for initial connection
      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      // Simulate disconnection
      act(() => {
        const disconnectHandler = mockWsService.onDisconnect.mock.calls[0][0];
        disconnectHandler();
      });

      await waitFor(() => {
        expect(screen.getByText('Disconnected')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle WebSocket connection errors', () => {
      mockWsService.connect.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      // Should not crash
      expect(() => render(<App />)).not.toThrow();
    });

    test('should handle malformed message data', async () => {
      render(<App />);

      await waitFor(() => {
        expect(messageHandlers.has('training_status')).toBe(true);
      });

      // Send malformed data
      act(() => {
        const handler = messageHandlers.get('training_status');
        handler?.(null);
      });

      // Should not crash
      expect(screen.getByTestId('training-controls')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('should limit decision history to prevent memory issues', async () => {
      render(<App />);

      await waitFor(() => {
        expect(messageHandlers.has('decision_update')).toBe(true);
      });

      const handler = messageHandlers.get('decision_update');

      // Send 1000 decisions
      act(() => {
        for (let i = 0; i < 1000; i++) {
          handler?.({
            timestamp: Date.now(),
            aircraftId: `AC${i}`,
            explanation: `Decision ${i}`
          });
        }
      });

      await waitFor(() => {
        // Should cap at 100
        expect(screen.getByText('Decisions: 100')).toBeInTheDocument();
      });
    });

    test('should limit performance data to prevent memory issues', async () => {
      render(<App />);

      await waitFor(() => {
        expect(messageHandlers.has('performance_update')).toBe(true);
      });

      const handler = messageHandlers.get('performance_update');

      // Send 1000 performance updates
      act(() => {
        for (let i = 0; i < 1000; i++) {
          handler?.({
            timestamp: Date.now(),
            episode: i,
            reward: Math.random()
          });
        }
      });

      await waitFor(() => {
        // Should cap at 200
        expect(screen.getByText('Data Points: 200')).toBeInTheDocument();
      });
    });
  });
});
