// Core data types for the AI Controller Dashboard

export interface AircraftState {
  id: string;
  position: [number, number]; // [x_nm, y_nm]
  velocity: number; // v_kt
  heading: number; // hdg_rad
  altitude: number; // alt_ft
  goalPosition: [number, number]; // [goal_x_nm, goal_y_nm]
  alive: boolean;
  intent: string;
  trailHistory: [number, number][];
}

export interface ConflictInfo {
  aircraftIds: [string, string];
  distance: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timeToClosestApproach: number;
}

export interface ScenarioData {
  timestamp: number;
  aircraft: AircraftState[];
  conflicts: ConflictInfo[];
  sectorBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  episode: number;
  step: number;
}

export interface DecisionData {
  timestamp: number;
  aircraftId: string;
  observation: number[];
  action: number[];
  policyLogits: number[];
  valueEstimate: number;
  confidenceScores: Record<string, number>;
  explanation: string;
  predictedOutcomes: Record<string, number>;
}

export interface PerformanceData {
  timestamp: number;
  episode: number;
  step: number;
  reward: number;
  cumulativeReward: number;
  safetyScore: number;
  efficiencyScore: number;
  violationCount: number;
  averageConfidence: number;
}

export interface TrainingData {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  currentEpisode: number;
  totalEpisodes: number;
  currentStep: number;
  totalSteps: number;
  elapsedTime: number;
  estimatedTimeRemaining: number;
  learningRate: number;
  epsilon: number;
  lastReward: number;
  averageReward: number;
  bestReward: number;
}

export interface ScenarioConfig {
  name: string;
  description: string;
  aircraftCount: number;
  sectorSize: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  duration: number;
  safetyThreshold: number;
}

export interface TrainingConfig {
  algorithm: string;
  learningRate: number;
  batchSize: number;
  episodes: number;
  maxSteps: number;
  epsilon: number;
  gamma: number;
  scenario: ScenarioConfig;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
  clientId?: string;
}

export interface ChartDataPoint {
  x: number;
  y: number;
  label?: string;
}

export interface MetricSeries {
  name: string;
  data: ChartDataPoint[];
  color: string;
}

export interface AlertData {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

export interface SystemHealth {
  cpuUsage: number;
  memoryUsage: number;
  gpuUsage?: number;
  networkLatency: number;
  frameRate: number;
  connectionCount: number;
}