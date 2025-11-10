/**
 * Result of a completed encounter for difficulty calculation
 */
export interface EncounterResult {
  /** Unique identifier for the encounter */
  encounterId: string;
  
  /** Whether the encounter was successfully completed */
  success: boolean;
  
  /** Time taken to complete in seconds */
  completionTime: number;
  
  /** Number of objectives completed */
  objectivesCompleted: number;
  
  /** Total number of objectives */
  totalObjectives: number;
  
  /** When the encounter was completed */
  timestamp: Date;
  
  /** Base difficulty of the encounter (0.1 to 1.0) */
  baseDifficulty: number;
}

/**
 * Player performance history for difficulty calculation
 */
export interface PlayerPerformance {
  /** Player identifier */
  playerId: string;
  
  /** List of encounter results */
  results: EncounterResult[];
  
  /** Current difficulty level (0.1 to 1.0) */
  currentDifficulty: number;
  
  /** Last time difficulty was adjusted */
  lastAdjustment?: Date;
}

/**
 * Difficulty adjustment result with reasoning
 */
export interface DifficultyAdjustment {
  /** Previous difficulty level */
  previousDifficulty: number;
  
  /** New difficulty level */
  newDifficulty: number;
  
  /** Amount of change */
  adjustment: number;
  
  /** Reason for the adjustment */
  reason: string;
  
  /** Metrics that influenced the decision */
  metrics: {
    successRate: number;
    avgCompletionTime: number;
    recentPerformance: 'struggling' | 'balanced' | 'excelling';
  };
}

/**
 * Configuration for difficulty calculation
 */
export interface DifficultyConfig {
  /** Minimum difficulty level */
  minDifficulty: number;
  
  /** Maximum difficulty level */
  maxDifficulty: number;
  
  /** Number of recent encounters to consider */
  historyWindow: number;
  
  /** Success rate threshold for reducing difficulty */
  strugglingThreshold: number;
  
  /** Success rate threshold for increasing difficulty */
  excellingThreshold: number;
  
  /** Adjustment amount when struggling */
  strugglingAdjustment: number;
  
  /** Adjustment amount when excelling */
  excellingAdjustment: number;
  
  /** Adjustment amount based on completion speed */
  speedAdjustment: number;
}
