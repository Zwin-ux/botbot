/**
 * Integration tests for WebSocketService
 * Tests WebSocket communication and real-time data updates
 */

import WebSocketService from '../WebSocketService';
import { WebSocketMessage } from '../../types';

// Mock WebSocket
class MockWebSocket {
  public readyState: number = WebSocket.CONNECTING;
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  private sentMessages: string[] = [];

  constructor(public url: string) {
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string): void {
    if (this.readyState === WebSocket.OPEN) {
      this.sentMessages.push(data);
    }
  }

  close(): void {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  // Test helper to simulate receiving a message
  simulateMessage(data: any): void {
    if (this.onmessage) {
      const event = new MessageEvent('message', {
        data: JSON.stringify(data)
      });
      this.onmessage(event);
    }
  }

  // Test helper to get sent messages
  getSentMessages(): string[] {
    return this.sentMessages;
  }

  // Test helper to simulate error
  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// Replace global WebSocket with mock
(global as any).WebSocket = MockWebSocket;

describe('WebSocketService Integration Tests', () => {
  let wsService: WebSocketService;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    // Get fresh instance for each test
    wsService = WebSocketService.getInstance();
    // Clear any existing handlers
    (wsService as any).messageHandlers = new Map();
    (wsService as any).connectHandlers = [];
    (wsService as any).disconnectHandlers = [];
    (wsService as any).reconnectAttempts = 0;
  });

  afterEach(() => {
    if (wsService) {
      wsService.disconnect();
    }
  });

  describe('Connection Management', () => {
    test('should establish WebSocket connection', (done) => {
      wsService.onConnect(() => {
        expect(wsService.isConnected()).toBe(true);
        done();
      });

      wsService.connect('ws://localhost:8080');
    });

    test('should handle connection failure gracefully', (done) => {
      const originalWebSocket = (global as any).WebSocket;
      
      // Mock WebSocket that fails immediately
      (global as any).WebSocket = class {
        constructor() {
          throw new Error('Connection failed');
        }
      };

      wsService.onConnect(() => {
        fail('Should not connect');
      });

      wsService.connect('ws://localhost:8080');

      setTimeout(() => {
        expect(wsService.isConnected()).toBe(false);
        (global as any).WebSocket = originalWebSocket;
        done();
      }, 50);
    });

    test('should trigger disconnect handlers on connection close', (done) => {
      let disconnectCalled = false;

      wsService.onDisconnect(() => {
        disconnectCalled = true;
      });

      wsService.onConnect(() => {
        wsService.disconnect();
        setTimeout(() => {
          expect(disconnectCalled).toBe(true);
          done();
        }, 10);
      });

      wsService.connect('ws://localhost:8080');
    });

    test('should not reconnect after manual disconnect', (done) => {
      wsService.onConnect(() => {
        wsService.disconnect();
        
        setTimeout(() => {
          expect(wsService.isConnected()).toBe(false);
          done();
        }, 100);
      });

      wsService.connect('ws://localhost:8080');
    });
  });

  describe('Message Handling', () => {
    beforeEach((done) => {
      wsService.onConnect(() => {
        mockWs = (wsService as any).ws as MockWebSocket;
        done();
      });
      wsService.connect('ws://localhost:8080');
    });

    test('should receive and route training status messages', (done) => {
      const testData = {
        status: 'running',
        currentEpisode: 10,
        totalEpisodes: 100
      };

      wsService.onMessage('training_status', (data) => {
        expect(data).toEqual(testData);
        done();
      });

      mockWs.simulateMessage({
        type: 'training_status',
        data: testData,
        timestamp: Date.now()
      });
    });

    test('should receive and route scenario update messages', (done) => {
      const testData = {
        timestamp: Date.now(),
        aircraft: [
          {
            id: 'AC001',
            position: [10, 20],
            velocity: 250,
            heading: 1.57,
            altitude: 10000
          }
        ],
        conflicts: []
      };

      wsService.onMessage('scenario_update', (data) => {
        expect(data.aircraft).toHaveLength(1);
        expect(data.aircraft[0].id).toBe('AC001');
        done();
      });

      mockWs.simulateMessage({
        type: 'scenario_update',
        data: testData,
        timestamp: Date.now()
      });
    });

    test('should handle multiple message handlers for same type', (done) => {
      let handler1Called = false;
      let handler2Called = false;

      wsService.onMessage('test_event', () => {
        handler1Called = true;
      });

      wsService.onMessage('test_event', () => {
        handler2Called = true;
        expect(handler1Called).toBe(true);
        done();
      });

      mockWs.simulateMessage({
        type: 'test_event',
        data: { test: true },
        timestamp: Date.now()
      });
    });

    test('should handle malformed JSON messages gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      if (mockWs.onmessage) {
        const event = new MessageEvent('message', {
          data: 'invalid json {'
        });
        mockWs.onmessage(event);
      }

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('should remove message handlers when unsubscribed', (done) => {
      let callCount = 0;
      
      const handler = () => {
        callCount++;
      };

      wsService.onMessage('test_event', handler);

      mockWs.simulateMessage({
        type: 'test_event',
        data: {},
        timestamp: Date.now()
      });

      setTimeout(() => {
        expect(callCount).toBe(1);
        
        wsService.offMessage('test_event', handler);
        
        mockWs.simulateMessage({
          type: 'test_event',
          data: {},
          timestamp: Date.now()
        });

        setTimeout(() => {
          expect(callCount).toBe(1); // Should still be 1
          done();
        }, 10);
      }, 10);
    });
  });

  describe('Message Sending', () => {
    beforeEach((done) => {
      wsService.onConnect(() => {
        mockWs = (wsService as any).ws as MockWebSocket;
        done();
      });
      wsService.connect('ws://localhost:8080');
    });

    test('should send training commands', () => {
      wsService.sendTrainingCommand('start', { scenario: 'basic' });

      const sentMessages = mockWs.getSentMessages();
      expect(sentMessages).toHaveLength(1);

      const message = JSON.parse(sentMessages[0]);
      expect(message.type).toBe('training_command');
      expect(message.data.command).toBe('start');
      expect(message.data.params.scenario).toBe('basic');
    });

    test('should send scenario commands', () => {
      wsService.sendScenarioCommand('load_scenario', { scenarioId: 'complex' });

      const sentMessages = mockWs.getSentMessages();
      expect(sentMessages).toHaveLength(1);

      const message = JSON.parse(sentMessages[0]);
      expect(message.type).toBe('scenario_command');
      expect(message.data.command).toBe('load_scenario');
    });

    test('should send subscription requests', () => {
      wsService.subscribeToEvents(['training_status', 'scenario_update']);

      const sentMessages = mockWs.getSentMessages();
      expect(sentMessages).toHaveLength(1);

      const message = JSON.parse(sentMessages[0]);
      expect(message.type).toBe('subscribe');
      expect(message.data.eventTypes).toContain('training_status');
      expect(message.data.eventTypes).toContain('scenario_update');
    });

    test('should send data requests', () => {
      wsService.requestData('performance_metrics', { limit: 100 });

      const sentMessages = mockWs.getSentMessages();
      expect(sentMessages).toHaveLength(1);

      const message = JSON.parse(sentMessages[0]);
      expect(message.type).toBe('data_request');
      expect(message.data.dataType).toBe('performance_metrics');
      expect(message.data.params.limit).toBe(100);
    });

    test('should not send messages when disconnected', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      wsService.disconnect();
      wsService.send({
        type: 'test',
        data: {},
        timestamp: Date.now()
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Real-time Data Flow', () => {
    beforeEach((done) => {
      wsService.onConnect(() => {
        mockWs = (wsService as any).ws as MockWebSocket;
        done();
      });
      wsService.connect('ws://localhost:8080');
    });

    test('should handle rapid message updates', (done) => {
      const receivedMessages: any[] = [];

      wsService.onMessage('performance_update', (data) => {
        receivedMessages.push(data);
      });

      // Simulate 10 rapid updates
      for (let i = 0; i < 10; i++) {
        mockWs.simulateMessage({
          type: 'performance_update',
          data: { episode: i, reward: Math.random() },
          timestamp: Date.now()
        });
      }

      setTimeout(() => {
        expect(receivedMessages).toHaveLength(10);
        done();
      }, 50);
    });

    test('should maintain message order', (done) => {
      const receivedOrder: number[] = [];

      wsService.onMessage('ordered_test', (data) => {
        receivedOrder.push(data.order);
      });

      for (let i = 0; i < 5; i++) {
        mockWs.simulateMessage({
          type: 'ordered_test',
          data: { order: i },
          timestamp: Date.now()
        });
      }

      setTimeout(() => {
        expect(receivedOrder).toEqual([0, 1, 2, 3, 4]);
        done();
      }, 50);
    });
  });
});
