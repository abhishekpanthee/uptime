import { Elysia } from "elysia";
import { supabase } from "../db";
import { publishEvent } from "./redis";

type WSClient = {
  send: (data: string) => void;
  data: { userId?: string; subscriptions: Set<string> };
};

const clients = new Set<WSClient>();

export function broadcastEvent(event: string, data: unknown): void {
  const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });

  for (const client of clients) {
    try {
      if (client.data.subscriptions.has(event) || client.data.subscriptions.has("*")) {
        client.send(payload);
      }
    } catch {
      clients.delete(client);
    }
  }

  // Also publish to Redis for multi-instance support
  publishEvent(`ws:${event}`, data);
}

export const websocketService = new Elysia({ name: "websocket-service" })
  .ws("/ws", {
    open(ws) {
      const client: WSClient = {
        send: (data: string) => ws.send(data),
        data: { subscriptions: new Set(["*"]) },
      };
      (ws as any)._client = client;
      clients.add(client);
      ws.send(JSON.stringify({ event: "connected", data: { message: "WebSocket connected" } }));
    },

    message(ws, message) {
      const client = (ws as any)._client as WSClient;
      if (!client) return;

      try {
        const parsed = typeof message === "string" ? JSON.parse(message) : message;

        if (parsed.action === "subscribe" && typeof parsed.event === "string") {
          client.data.subscriptions.add(parsed.event);
          ws.send(JSON.stringify({ event: "subscribed", data: { event: parsed.event } }));
        }

        if (parsed.action === "unsubscribe" && typeof parsed.event === "string") {
          client.data.subscriptions.delete(parsed.event);
          ws.send(JSON.stringify({ event: "unsubscribed", data: { event: parsed.event } }));
        }

        if (parsed.action === "ping") {
          ws.send(JSON.stringify({ event: "pong", data: {} }));
        }
      } catch {
        // Ignore malformed messages
      }
    },

    close(ws) {
      const client = (ws as any)._client as WSClient;
      if (client) {
        clients.delete(client);
      }
    },
  });

export function getConnectedClientsCount(): number {
  return clients.size;
}
