import { useEffect, useState, useCallback } from 'react';
import { getWebSocketClient, ConnectionStatus, MessageHandler } from '../api/websocket';

export function useWebSocket() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const ws = getWebSocketClient();

  useEffect(() => {
    ws.onStatusChange(setStatus);
    ws.connect();

    return () => {
      ws.disconnect();
    };
  }, []);

  const subscribe = useCallback((messageType: string, handler: MessageHandler) => {
    return ws.on(messageType, handler);
  }, [ws]);

  const send = useCallback((type: string, data: any) => {
    ws.send(type, data);
  }, [ws]);

  return { status, subscribe, send };
}

export function useWebSocketMessage<T>(messageType: string, initialValue: T): T {
  const [data, setData] = useState<T>(initialValue);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe(messageType, (newData: T) => {
      setData(newData);
    });

    return unsubscribe;
  }, [messageType, subscribe]);

  return data;
}

export function useWebSocketStream<T>(messageType: string, maxItems: number = 100): T[] {
  const [items, setItems] = useState<T[]>([]);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe(messageType, (newItem: T) => {
      setItems(prev => {
        const updated = [newItem, ...prev];
        return updated.slice(0, maxItems);
      });
    });

    return unsubscribe;
  }, [messageType, maxItems, subscribe]);

  return items;
}
