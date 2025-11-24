import { describe, it, expect, vi } from "vitest";
import { wsManager } from "../src/ws/wsManager";
import type { OrderStatus } from "../src/db/orderRepository";

// Minimal fake WebSocket
class FakeWebSocket {
  public sent: string[] = [];
  public readyState = 1;
  public static OPEN = 1;
  private closeHandlers: (() => void)[] = [];

  send(msg: string) {
    this.sent.push(msg);
  }

  on(event: string, handler: () => void) {
    if (event === "close") {
      this.closeHandlers.push(handler);
    }
  }

  triggerClose() {
    this.closeHandlers.forEach((h) => h());
  }
}

// Fake SocketStream
function fakeSocketStream(ws: FakeWebSocket) {
  return { socket: ws } as any;
}

describe("WebSocketManager", () => {
  it("registers a client and sends status messages", () => {
    const ws = new FakeWebSocket();
    const stream = fakeSocketStream(ws);

    const orderId = "order-123";
    wsManager.register(orderId, stream);

    wsManager.sendStatus(orderId, "pending" as OrderStatus);
    wsManager.sendStatus(orderId, "routing" as OrderStatus, { foo: "bar" });

    expect(ws.sent.length).toBe(2);

    const msg1 = JSON.parse(ws.sent[0]);
    const msg2 = JSON.parse(ws.sent[1]);

    expect(msg1.status).toBe("pending");
    expect(msg2.status).toBe("routing");
    expect(msg2.foo).toBe("bar");
  });

  it("removes client on close", () => {
    const ws = new FakeWebSocket();
    const stream = fakeSocketStream(ws);
    const orderId = "order-456";

    wsManager.register(orderId, stream);
    ws.triggerClose();

    wsManager.sendStatus(orderId, "confirmed" as OrderStatus);
    expect(ws.sent.length).toBe(0);
  });
});