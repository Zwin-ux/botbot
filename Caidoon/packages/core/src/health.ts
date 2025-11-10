/**
 * Health check types and utilities
 */

export type HealthStatus = 'ok' | 'degraded' | 'error';

export interface DependencyHealth {
  status: HealthStatus;
  latency?: number;
  error?: string;
}

export interface HealthCheckResponse {
  status: HealthStatus;
  service: string;
  timestamp: string;
  version: string;
  dependencies?: Record<string, DependencyHealth>;
}

/**
 * Determine overall health status based on dependencies
 */
export function determineOverallStatus(
  dependencies: Record<string, DependencyHealth>
): HealthStatus {
  const statuses = Object.values(dependencies).map((dep) => dep.status);

  if (statuses.some((s) => s === 'error')) {
    return 'degraded';
  }

  if (statuses.every((s) => s === 'ok')) {
    return 'ok';
  }

  return 'degraded';
}

/**
 * Measure latency of an async operation
 */
export async function measureLatency<T>(
  operation: () => Promise<T>
): Promise<{ result: T; latency: number }> {
  const start = Date.now();
  const result = await operation();
  const latency = Date.now() - start;
  return { result, latency };
}
