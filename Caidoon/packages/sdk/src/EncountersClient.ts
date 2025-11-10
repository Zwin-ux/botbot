import { Session, PlayerContext } from '@ai-encounters/core';
import { ClientOptions, StartSessionRequest, SDKError, ErrorResponse } from './types.js';

export class EncountersClient {
  private baseUrl: string;
  private timeout: number;
  private headers: Record<string, string>;

  constructor(baseUrl: string, options?: Partial<ClientOptions>) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = options?.timeout || 30000; // 30 seconds default
    this.headers = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };
  }

  /**
   * Start a new encounter session
   */
  async startSession(playerId: string, context?: PlayerContext): Promise<Session> {
    const request: StartSessionRequest = {
      playerId,
      context,
    };

    return this.request<Session>('POST', '/session/start', request);
  }

  /**
   * Get session details by ID
   */
  async getSession(sessionId: string): Promise<Session> {
    return this.request<Session>('GET', `/session/${sessionId}`);
  }

  /**
   * Update objective status
   */
  async updateObjective(sessionId: string, objectiveId: string): Promise<Session> {
    return this.request<Session>('PATCH', `/session/${sessionId}/objective/${objectiveId}`);
  }

  /**
   * Complete a session
   */
  async completeSession(sessionId: string): Promise<Session> {
    return this.request<Session>('POST', `/session/${sessionId}/complete`);
  }

  /**
   * Internal HTTP request handler
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: this.headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response body
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');
      const responseBody = isJson ? await response.json() : await response.text();

      // Handle error responses
      if (!response.ok) {
        const error = this.createError(
          response.status,
          responseBody,
          `HTTP ${response.status}: ${response.statusText}`
        );
        throw error;
      }

      return responseBody as T;
    } catch (err) {
      clearTimeout(timeoutId);

      // Handle abort/timeout
      if (err instanceof Error && err.name === 'AbortError') {
        const timeoutError = this.createError(
          408,
          undefined,
          `Request timeout after ${this.timeout}ms`
        );
        throw timeoutError;
      }

      // Handle network errors
      if (err instanceof Error && !('statusCode' in err)) {
        const networkError = this.createError(
          0,
          undefined,
          `Network error: ${err.message}`
        );
        throw networkError;
      }

      // Re-throw SDK errors
      throw err;
    }
  }

  /**
   * Create a standardized SDK error
   */
  private createError(statusCode: number, body: unknown, fallbackMessage: string): SDKError {
    let message = fallbackMessage;
    let details: unknown;

    // Try to extract error details from response body
    if (body && typeof body === 'object' && 'error' in body) {
      const errorResponse = body as ErrorResponse;
      message = errorResponse.error.message || fallbackMessage;
      details = errorResponse.error.details;
    }

    const error = new Error(message) as SDKError;
    error.name = 'SDKError';
    error.statusCode = statusCode;
    error.details = details;

    return error;
  }
}
