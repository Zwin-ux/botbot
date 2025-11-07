/**
 * WebSocket API for real-time backend communication
 * No abstractions, no magic - just direct WebSocket handling
 */

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface TrainingStatus {
  status: string;
  currentEpisode: number;
  totalEpisodes: number;
  currentStep: number;
  totalSteps: number;
  elapsedTime: number;
  lastReward: number;
  averageReward: number;
  bestReward: number;
}

export interface DecisionUpdate {
  timestamp: number;
  aircraftId: string;
  action: number[];
  valueEstimate: number;
  confidenceScores: Record<string, number>;
  explanation?: string;
}

export interface SafetyViolation {
  timestamp: number;
  violationType: string;
  severity: string;
  aircraftIds: string[];
  distance: number;
}

export interface PerformanceMetrics {
  timestamp: number;
  episode: number;
  step: number;
  reward: number;
  cumulativeReward: number;
  safetyScore: number;
  violationCount: number;
}

export type MessageHandler = (data: any) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private statusCallback: ((status: ConnectionStatus) => void) | null = null;

  constructor(url: string = 'ws://localhost:8080') {
    this.url = url;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WS] Already connected');
      return;
    }

    this.updateStatus('connecting');
    console.log(`[WS] Connecting to ${this.url}...`);

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[WS] Connected');
        this.reconnectAttempts = 0;
        this.updateStatus('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        this.updateStatus('error');
      };

      this.ws.onclose = () => {
        console.log('[WS] Disconnected');
        this.updateStatus('disconnected');
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('[WS] Connection failed:', error);
      this.updateStatus('error');
      this.attemptReconnect();
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.updateStatus('disconnected');
  }

  send(type: string, data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data, timestamp: Date.now() }));
    } else {
      console.warn('[WS] Cannot send - not connected');
    }
  }

  on(messageType: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(messageType)) {
      this.handlers.set(messageType, new Set());
    }
    this.handlers.get(messageType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(messageType)?.delete(handler);
    };
  }

  onStatusChange(callback: (status: ConnectionStatus) => void): void {
    this.statusCallback = callback;
  }

  private handleMessage(message: any): void {
    const { type, data } = message;
    
    // Log all messages for debugging
    console.log(`[WS] ${type}:`, data);

    // Call registered handlers
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }

    // Also call wildcard handlers
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => handler({ type, data }));
    }
  }

  private updateStatus(status: ConnectionStatus): void {
    if (this.statusCallback) {
      this.statusCallback(status);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WS] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  getStatus(): ConnectionStatus {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'error';
    }
  }
}

// Singleton instance
let wsClient: WebSocketClient | null = null;

export function getWebSocketClient(): WebSocketClient {
  if (!wsClient) {
    wsClient = new WebSocketClient();
  }
  return wsClient;
}
