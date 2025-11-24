import type { SocketStream } from "@fastify/websocket";
import { OrderStatus } from "../db/orderRepository";

type WSClient = SocketStream;
type OrderId = string;

class WebSocketManager {
  private orderClients: Map<OrderId, Set<WSClient>> = new Map();

  register(orderId: string, client: WSClient) {
    if (!this.orderClients.has(orderId)) {
      this.orderClients.set(orderId, new Set());
    }
    this.orderClients.get(orderId)!.add(client);

    client.socket.on("close", () => {
      this.orderClients.get(orderId)?.delete(client);
    });
  }

  sendStatus(orderId: string, status: OrderStatus, payload?: any) {
    const clients = this.orderClients.get(orderId);
    if (!clients) return;

    const message = JSON.stringify({
      orderId,
      status,
      ...(payload || {})
    });

    for (const client of clients) {
      client.socket.send(message);
    }
  }

  detach(orderId: string) {
    this.orderClients.delete(orderId);
  }
}

export const wsManager = new WebSocketManager();