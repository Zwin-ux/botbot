/**
 * Circuit breaker pattern for handling repeated failures
 */

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Circuit is open, requests fail immediately
  HALF_OPEN = 'HALF_OPEN', // Testing if service has recovered
}

export interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before opening circuit
  resetTimeout: number; // Time in ms before attempting to close circuit
  monitoringPeriod: number; // Time window in ms for counting failures
}

export const DEFAULT_CIRCUIT_BREAKER_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5, // Open circuit after 5 consecutive failures
  resetTimeout: 60000, // Try to close after 60 seconds
  monitoringPeriod: 120000, // Monitor failures over 2 minutes
};

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private nextAttemptTime: number = 0;
  private successCount: number = 0;
  private options: CircuitBreakerOptions;
  private logger?: (message: string) => void;

  constructor(options: CircuitBreakerOptions = DEFAULT_CIRCUIT_BREAKER_OPTIONS, logger?: (message: string) => void) {
    this.options = options;
    this.logger = logger;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      const now = Date.now();
      
      // Check if it's time to try again (half-open state)
      if (now >= this.nextAttemptTime) {
        this.state = CircuitState.HALF_OPEN;
        this.log(`Circuit breaker entering HALF_OPEN state, attempting request`);
      } else {
        const waitTime = Math.ceil((this.nextAttemptTime - now) / 1000);
        throw new Error(
          `Circuit breaker is OPEN. Service unavailable. Retry in ${waitTime} seconds.`
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      
      // After a successful request in half-open state, close the circuit
      this.state = CircuitState.CLOSED;
      this.successCount = 0;
      this.log(`Circuit breaker closed after successful request`);
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    const now = Date.now();
    this.lastFailureTime = now;

    // Reset failure count if outside monitoring period
    if (this.failureCount > 0 && now - this.lastFailureTime > this.options.monitoringPeriod) {
      this.failureCount = 0;
    }

    this.failureCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed in half-open state, reopen the circuit
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = now + this.options.resetTimeout;
      this.successCount = 0;
      this.log(`Circuit breaker reopened after failure in HALF_OPEN state`);
    } else if (this.failureCount >= this.options.failureThreshold) {
      // Too many failures, open the circuit
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = now + this.options.resetTimeout;
      this.log(
        `Circuit breaker opened after ${this.failureCount} failures. Will retry in ${this.options.resetTimeout / 1000}s`
      );
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get current failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Reset the circuit breaker to closed state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
    this.successCount = 0;
    this.log(`Circuit breaker manually reset to CLOSED state`);
  }

  /**
   * Log a message if logger is configured
   */
  private log(message: string): void {
    if (this.logger) {
      this.logger(message);
    }
  }
}
