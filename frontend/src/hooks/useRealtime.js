import { useEffect, useRef, useCallback } from 'react';

/**
 * useRealtimeUpdates
 * Connects to WebSocket server and listens for live updates
 * Auto-reconnects on disconnect
 */
export function useRealtimeUpdates(onUpdate) {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttemptsRef.current = 0;
        // Send ping every 30s to keep connection alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
        ws.pingInterval = pingInterval;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          onUpdate(msg);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        if (ws.pingInterval) {
          clearInterval(ws.pingInterval);
        }
        // Auto-reconnect with exponential backoff
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAY * Math.pow(1.5, reconnectAttemptsRef.current);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
          reconnectAttemptsRef.current += 1;
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
    }
  }, [onUpdate]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((type, data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...data }));
    }
  }, []);

  return { send, isConnected: wsRef.current?.readyState === WebSocket.OPEN };
}

/**
 * useLiveData
 * Maintains live data state synced with WebSocket updates
 */
export function useLiveData(initialData = null) {
  const [data, setData] = React.useState(initialData);

  const handleUpdate = useCallback((msg) => {
    setData(prev => ({
      ...prev,
      [msg.type]: msg.data,
      lastUpdate: msg.timestamp,
    }));
  }, []);

  const { send, isConnected } = useRealtimeUpdates(handleUpdate);

  return { data, send, isConnected };
}
