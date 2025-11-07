/**
 * Integration tests for TrainingControls component
 * Tests training control functionality and scenario switching
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TrainingControls from '../TrainingControls';
import WebSocketService from '../../services/WebSocketService';
import { TrainingData } from '../../types';

// Mock WebSocketService
jest.mock('../../services/WebSocketService');

describe('TrainingControls Integration Tests', () => {
  let mockWsService: jest.Mocked<WebSocketService>;
  let mockTrainingData: TrainingData;

  beforeEach(() => {
    // Setup mock WebSocket service
    mockWsService = {
      sendTrainingCommand: jest.fn(),
      sendScenarioCommand: jest.fn(),
      send: jest.fn(),
      requestData: jest.fn(),
      getInstance: jest.fn()
    } as any;

    (WebSocketService.getInstance as jest.Mock).mockReturnValue(mockWsService);

    // Setup mock training data
    mockTrainingData = {
      status: 'idle',
      currentEpisode: 0,
      totalEpisodes: 1000,
      currentStep: 0,
      totalSteps: 500,
      elapsedTime: 0,
      estimatedTimeRemaining: 0,
      learningRate: 0.0003,
      epsilon: 0.1,
      lastReward: 0,
      averageReward: 0,
      bestReward: 0
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Training Control Buttons', () => {
    test('should render all control buttons', () => {
      render(
        <TrainingControls
          trainingData={mockTrainingData}
          isConnected={true}
        />
      );

      expect(screen.getByText('Start')).toBeInTheDocument();
      expect(screen.getByText('Pause')).toBeInTheDocument();
      expect(screen.getByText('Stop')).toBeInTheDocument();
    });

    test('should send start command when Start button clicked', () => {
      render(
        <TrainingControls
          trainingData={mockTrainingData}
          isConnected={true}
        />
      );

      const startButton = screen.getByText('Start');
      fireEvent.click(startButton);

      expect(mockWsService.sendTrainingCommand).toHaveBeenCalledWith(
        'start',
        expect.objectContaining({
          scenario: expect.any(String),
          config: expect.any(Object)
        })
      );
    });

    test('should send pause command when Pause button clicked', () => {
      const runningData = { ...mockTrainingData, status: 'running' as const };
      
      render(
        <TrainingControls
          trainingData={runningData}
          isConnected={true}
        />
      );

      const pauseButton = screen.getByText('Pause');
      fireEvent.click(pauseButton);

      expect(mockWsService.sendTrainingCommand).toHaveBeenCalledWith(
        'pause',
        expect.any(Object)
      );
    });

    test('should send stop command when Stop button clicked', () => {
      const runningData = { ...mockTrainingData, status: 'running' as const };
      
      render(
        <TrainingControls
          trainingData={runningData}
          isConnected={true}
        />
      );

      const stopButton = screen.getByText('Stop');
      fireEvent.click(stopButton);

      expect(mockWsService.sendTrainingCommand).toHaveBeenCalledWith(
        'stop',
        expect.any(Object)
      );
    });

    test('should disable Start button when training is running', () => {
      const runningData = { ...mockTrainingData, status: 'running' as const };
      
      render(
        <TrainingControls
          trainingData={runningData}
          isConnected={true}
        />
      );

      const startButton = screen.getByText('Start').closest('button');
      expect(startButton).toBeDisabled();
    });

    test('should disable Pause button when training is not running', () => {
      render(
        <TrainingControls
          trainingData={mockTrainingData}
          isConnected={true}
        />
      );

      const pauseButton = screen.getByText('Pause').closest('button');
      expect(pauseButton).toBeDisabled();
    });

    test('should disable all buttons when not connected', () => {
      render(
        <TrainingControls
          trainingData={mockTrainingData}
          isConnected={false}
        />
      );

      const startButton = screen.getByText('Start').closest('button');
      const pauseButton = screen.getByText('Pause').closest('button');
      const stopButton = screen.getByText('Stop').closest('button');

      expect(startButton).toBeDisabled();
      expect(pauseButton).toBeDisabled();
      expect(stopButton).toBeDisabled();
    });
  });

  describe('Scenario Selection', () => {
    test('should render scenario dropdown', () => {
      render(
        <TrainingControls
          trainingData={mockTrainingData}
          isConnected={true}
        />
      );

      expect(screen.getByLabelText('Scenario')).toBeInTheDocument();
    });

    test('should send scenario command when scenario is changed', async () => {
      render(
        <TrainingControls
          trainingData={mockTrainingData}
          isConnected={true}
        />
      );

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
    });

    test('should disable scenario selection when training is running', () => {
      const runningData = { ...mockTrainingData, status: 'running' as const };
      
      render(
        <TrainingControls
          trainingData={runningData}
          isConnected={true}
        />
      );

      const scenarioSelect = screen.getByLabelText('Scenario').closest('div');
      expect(scenarioSelect).toHaveClass('Mui-disabled');
    });

    test('should disable scenario selection when not connected', () => {
      render(
        <TrainingControls
          trainingData={mockTrainingData}
          isConnected={false}
        />
      );

      const scenarioSelect = screen.getByLabelText('Scenario').closest('div');
      expect(scenarioSelect).toHaveClass('Mui-disabled');
    });
  });

  describe('Training Progress Display', () => {
    test('should display training progress when data is available', () => {
      const progressData = {
        ...mockTrainingData,
        currentEpisode: 50,
        totalEpisodes: 100,
        status: 'running' as const
      };

      render(
        <TrainingControls
          trainingData={progressData}
          isConnected={true}
        />
      );

      expect(screen.getByText(/Episode 50 \/ 100/)).toBeInTheDocument();
      expect(screen.getByText('50.0%')).toBeInTheDocument();
    });

    test('should display elapsed time correctly', () => {
      const progressData = {
        ...mockTrainingData,
        elapsedTime: 3665, // 1 hour, 1 minute, 5 seconds
        status: 'running' as const
      };

      render(
        <TrainingControls
          trainingData={progressData}
          isConnected={true}
        />
      );

      expect(screen.getByText('01:01:05')).toBeInTheDocument();
    });

    test('should display reward metrics', () => {
      const progressData = {
        ...mockTrainingData,
        lastReward: 42.5,
        bestReward: 100.0,
        status: 'running' as const
      };

      render(
        <TrainingControls
          trainingData={progressData}
          isConnected={true}
        />
      );

      expect(screen.getByText('42.50')).toBeInTheDocument();
      expect(screen.getByText('100.00')).toBeInTheDocument();
    });

    test('should display correct status chip', () => {
      const runningData = { ...mockTrainingData, status: 'running' as const };
      
      render(
        <TrainingControls
          trainingData={runningData}
          isConnected={true}
        />
      );

      expect(screen.getByText('RUNNING')).toBeInTheDocument();
    });
  });

  describe('Configuration Dialog', () => {
    test('should open configuration dialog when Configure button clicked', async () => {
      render(
        <TrainingControls
          trainingData={mockTrainingData}
          isConnected={true}
        />
      );

      const configButton = screen.getByText('Configure');
      fireEvent.click(configButton);

      await waitFor(() => {
        expect(screen.getByText('Training Configuration')).toBeInTheDocument();
      });
    });

    test('should update learning rate in configuration', async () => {
      render(
        <TrainingControls
          trainingData={mockTrainingData}
          isConnected={true}
        />
      );

      const configButton = screen.getByText('Configure');
      fireEvent.click(configButton);

      await waitFor(() => {
        const learningRateInput = screen.getByLabelText('Learning Rate');
        fireEvent.change(learningRateInput, { target: { value: '0.001' } });
        expect(learningRateInput).toHaveValue(0.001);
      });
    });

    test('should save configuration when Save button clicked', async () => {
      render(
        <TrainingControls
          trainingData={mockTrainingData}
          isConnected={true}
        />
      );

      const configButton = screen.getByText('Configure');
      fireEvent.click(configButton);

      await waitFor(() => {
        const saveButton = screen.getByText('Save Configuration');
        fireEvent.click(saveButton);
      });

      expect(mockWsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'update_config',
          data: expect.any(Object)
        })
      );
    });

    test('should close configuration dialog when Cancel button clicked', async () => {
      render(
        <TrainingControls
          trainingData={mockTrainingData}
          isConnected={true}
        />
      );

      const configButton = screen.getByText('Configure');
      fireEvent.click(configButton);

      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('Training Configuration')).not.toBeInTheDocument();
      });
    });
  });

  describe('Additional Controls', () => {
    test('should send refresh request when Refresh button clicked', () => {
      render(
        <TrainingControls
          trainingData={mockTrainingData}
          isConnected={true}
        />
      );

      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      expect(mockWsService.requestData).toHaveBeenCalledWith('training_status');
    });

    test('should send save checkpoint command when Save button clicked', () => {
      render(
        <TrainingControls
          trainingData={mockTrainingData}
          isConnected={true}
        />
      );

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      expect(mockWsService.sendTrainingCommand).toHaveBeenCalledWith(
        'save_checkpoint',
        expect.any(Object)
      );
    });

    test('should disable Refresh button when not connected', () => {
      render(
        <TrainingControls
          trainingData={mockTrainingData}
          isConnected={false}
        />
      );

      const refreshButton = screen.getByText('Refresh').closest('button');
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('State Transitions', () => {
    test('should handle transition from idle to running', () => {
      const { rerender } = render(
        <TrainingControls
          trainingData={mockTrainingData}
          isConnected={true}
        />
      );

      const startButton = screen.getByText('Start').closest('button');
      expect(startButton).not.toBeDisabled();

      const runningData = { ...mockTrainingData, status: 'running' as const };
      rerender(
        <TrainingControls
          trainingData={runningData}
          isConnected={true}
        />
      );

      expect(startButton).toBeDisabled();
      const pauseButton = screen.getByText('Pause').closest('button');
      expect(pauseButton).not.toBeDisabled();
    });

    test('should handle transition from running to paused', () => {
      const runningData = { ...mockTrainingData, status: 'running' as const };
      const { rerender } = render(
        <TrainingControls
          trainingData={runningData}
          isConnected={true}
        />
      );

      expect(screen.getByText('RUNNING')).toBeInTheDocument();

      const pausedData = { ...mockTrainingData, status: 'paused' as const };
      rerender(
        <TrainingControls
          trainingData={pausedData}
          isConnected={true}
        />
      );

      expect(screen.getByText('PAUSED')).toBeInTheDocument();
    });
  });
});
