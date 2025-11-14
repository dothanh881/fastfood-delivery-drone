import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface WebSocketConfig {
  url: string;
  enabled?: boolean; // allow feature flagging WS on/off
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

export const useWebSocket = (config: WebSocketConfig) => {
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);
  // Track subscriptions to safely resubscribe on reconnect and queue when disconnected
  const managedSubsRef = useRef<any[]>([]);

  const makeMessageHandler = (cb: (message: any) => void) => (message: { body: string }) => {
    try {
      const data = JSON.parse(message.body);
      cb(data);
    } catch (error) {
      console.error('Error parsing message:', error);
      cb(message.body);
    }
  };

  useEffect(() => {
    // If WS is disabled, ensure clean state and skip client activation
    if (config.enabled === false) {
      setIsConnected(false);
      if (clientRef.current) {
        try {
          clientRef.current.deactivate();
        } catch {}
      }
      clientRef.current = null;
      return;
    }
    // Create STOMP client
    const client = new Client({
      webSocketFactory: () => new SockJS(config.url),
      connectHeaders: {},
      debug: (str: string) => {
        console.log('STOMP Debug:', str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        config.onConnect?.();
        // Auto-subscribe any queued subscriptions
        managedSubsRef.current.forEach((sub) => {
          if (!sub.canceled && !sub.real && clientRef.current) {
            try {
              const real = clientRef.current.subscribe(sub.destination, makeMessageHandler(sub.callback));
              sub.real = real;
            } catch (e) {
              console.error('Failed to subscribe on connect:', e);
            }
          }
        });
      },
      onWebSocketClose: () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        config.onDisconnect?.();
      },
      onStompError: (frame: unknown) => {
        console.error('STOMP error:', frame);
        config.onError?.(frame);
      },
      onWebSocketError: (error: Event) => {
        console.error('WebSocket error:', error);
        config.onError?.(error);
      }
    });

    clientRef.current = client;
    client.activate();

    return () => {
      // Deactivate client on unmount
      try {
        client.deactivate();
      } catch {}
      // Ensure any real subscriptions are cleaned up locally
      managedSubsRef.current.forEach((sub) => {
        if (sub.real) {
          try { sub.real.unsubscribe(); } catch {}
          sub.real = null;
        }
      });
      setIsConnected(false);
    };
  }, [config.url, config.enabled]);

  const subscribe = (destination: string, callback: (message: any) => void) => {
    // Create a placeholder that we can return immediately and manage internally
    const placeholder: any = {
      destination,
      callback,
      real: null,
      canceled: false,
      _isPlaceholder: true,
      unsubscribe: () => {
        placeholder.canceled = true;
        if (placeholder.real) {
          try { placeholder.real.unsubscribe(); } catch {}
          placeholder.real = null;
        }
        managedSubsRef.current = managedSubsRef.current.filter((s) => s !== placeholder);
      }
    };

    managedSubsRef.current.push(placeholder);

    if (clientRef.current && isConnected) {
      try {
        const real = clientRef.current.subscribe(destination, makeMessageHandler(callback));
        placeholder.real = real;
        return real;
      } catch (e) {
        console.error('Subscribe failed, queuing until reconnect:', e);
      }
    }

    // Not connected yet; return the placeholder so caller can still call unsubscribe()
    return placeholder;
  };

  const publish = (destination: string, body: any) => {
    if (clientRef.current && isConnected) {
      (clientRef.current as any).publish({
        destination,
        body: JSON.stringify(body)
      });
    } else {
      // Silently drop publish when disconnected; avoids "no underlying connection" errors
      // Optionally, we could queue publishes if needed in the future
    }
  };

  const unsubscribe = (subscription: any) => {
    if (!subscription) return;
    // If it's our placeholder
    if (subscription._isPlaceholder) {
      try { subscription.unsubscribe(); } catch {}
      return;
    }
    // Otherwise, assume it's a real STOMP subscription
    try { subscription.unsubscribe(); } catch {}
    // Remove any managed entries that reference this real subscription
    managedSubsRef.current = managedSubsRef.current.filter((s) => s.real !== subscription);
  };

  return {
    isConnected,
    subscribe,
    publish,
    unsubscribe,
    client: clientRef.current
  };
};