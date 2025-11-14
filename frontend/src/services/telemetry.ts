import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';

export interface Telemetry {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  battery_pct?: number;
}

export interface TelemetryOptions {
  wsUrl?: string; // e.g. http://localhost:8080/ws
  topic?: string; // e.g. /topic/drone/{orderId}
  fallbackStart?: { lat: number; lng: number };
  fallbackEnd?: { lat: number; lng: number };
  intervalMs?: number;
}

// Build a simple interpolated path for fallback simulation
function buildPath(start: { lat: number; lng: number }, end: { lat: number; lng: number }, steps = 200) {
  const pts: Telemetry[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push({
      lat: start.lat + (end.lat - start.lat) * t,
      lng: start.lng + (end.lng - start.lng) * t,
      speed: 8 + Math.random() * 4,
      battery_pct: Math.max(5, 100 - t * 80),
    });
  }
  return pts;
}

/**
 * Initialize telemetry subscription. Attempts STOMP over SockJS; if it fails,
 * falls back to local interval-based simulation.
 * Returns a disposer to stop the telemetry.
 */
export function initTelemetry(onMessage: (t: Telemetry) => void, opts: TelemetryOptions = {}) {
  const wsUrl = opts.wsUrl || process.env.REACT_APP_WS_URL || 'http://localhost:8080/ws';
  const topic = opts.topic || '/topic/orders/demo';
  const intervalMs = opts.intervalMs || 1000;

  let client: Client | undefined;
  let intervalId: number | undefined;
  let disposed = false;

  const stop = () => {
    disposed = true;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = undefined;
    }
    try {
      client?.deactivate();
    } catch {
      // ignore
    }
  };

  // Try STOMP first
  try {
    client = new Client({
      reconnectDelay: 5000,
      webSocketFactory: () => new SockJS(wsUrl),
    });

    client.onConnect = () => {
      if (disposed) return;
      client?.subscribe(topic, (msg: IMessage) => {
        if (disposed) return;
        try {
          const data = JSON.parse(msg.body);
          let t: Telemetry | undefined;

          // Backend format via WebSocketService
          if (data && typeof data === 'object' && data.type === 'GPS_UPDATE' && data.payload) {
            const p = data.payload || {};
            if (typeof p.lat === 'number' && typeof p.lng === 'number') {
              t = {
                lat: p.lat,
                lng: p.lng,
                heading: typeof p.heading === 'number' ? p.heading : undefined,
                speed: typeof p.speedKmh === 'number' ? p.speedKmh : undefined,
                battery_pct: typeof p.batteryPct === 'number' ? p.batteryPct : undefined,
              };
            }
          } else if (typeof data?.lat === 'number' && typeof data?.lng === 'number') {
            // Direct telemetry payload fallback
            t = data as Telemetry;
          }

          if (t) onMessage(t);
        } catch {
          // ignore bad payloads
        }
      });
    };

    client.onStompError = () => {
      if (!disposed) startFallback();
    };

    client.onWebSocketError = () => {
      if (!disposed) startFallback();
    };

    client.activate();
  } catch {
    // No SockJS/STOMP available, fallback
    startFallback();
  }

  function startFallback() {
    const start = opts.fallbackStart || { lat: 10.8331, lng: 106.6197 };
    const end = opts.fallbackEnd || { lat: 10.8231, lng: 106.6297 };
    const path = buildPath(start, end, 300);
    let i = 0;
    intervalId = window.setInterval(() => {
      if (disposed) return;
      if (i < path.length - 1) i++;
      onMessage(path[i]);
    }, intervalMs);
  }

  return stop;
}