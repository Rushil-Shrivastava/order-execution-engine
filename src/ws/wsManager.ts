import type { SocketStream } from "@fastify/websocket";
import { OrderStatus } from "../db/orderRepository";
import { getOrderById } from "../db/orderRepository"; // add or adjust path

type WSClient = SocketStream;
type OrderId = string;

type WsConnection = {
  socket: {
    send: (msg: string) => void;
    on?: (event: string, handler: (...args: any[]) => void) => void;
    readyState?: number;
  };
};

const clients = new Map<string, Set<WsConnection>>();

export const wsManager = {
  register(orderId: string, connection: WsConnection) {
    if (!clients.has(orderId)) clients.set(orderId, new Set());
    clients.get(orderId)!.add(connection);
    console.info("[WS] registered", { orderId, count: clients.get(orderId)!.size });

    // auto-unregister on close/error
    if (connection.socket && typeof connection.socket.on === "function") {
      const cleanup = () => this.unregister(orderId, connection);
      connection.socket.on("close", cleanup);
      connection.socket.on("error", cleanup);
    }

    (async () => {
      try {
        const order = await getOrderById(orderId);
        if (order) {
          const payload = {
            orderId,
            status: order.status,
            dex: order.dex,
            txHash: order.tx_hash,
            failure_reason: order.failure_reason,
          };
          try {
            connection.socket.send(JSON.stringify(payload));
            console.info("[WS] initial state sent", { orderId, status: order.status });
          } catch (err) {
            console.error("[WS] error sending initial state", err);
          }
        }
      } catch (err) {
        console.error("[WS] error fetching order", err);
      }
    })();
  },

  unregister(orderId: string, connection: WsConnection) {
    const set = clients.get(orderId);
    if (!set) return;
    set.delete(connection);
    if (set.size === 0) clients.delete(orderId);
    console.info("[WS] unregistered", { orderId, remaining: set.size });
  },

  notify(orderId: string, payload: any) {
    const set = clients.get(orderId);
    if (!set) {
      console.debug("[WS] notify: no subscribers for", orderId);
      return;
    }
    const data = JSON.stringify(payload);
    for (const conn of set) {
      try {
        if (conn.socket.readyState !== undefined && conn.socket.readyState !== 1) {
          this.unregister(orderId, conn);
          continue;
        }
        conn.socket.send(data);
      } catch (err) {
        console.error("[WS] notify: send error, unregistering", err);
        this.unregister(orderId, conn);
      }
    }
    console.info("[WS] notify: sent", { orderId, payload });
  },

  sendStatus(orderId: string, status: string, extra?: Record<string, any>) {
    const payload = { orderId, status, ...extra };
    this.notify(orderId, payload);
  }
};