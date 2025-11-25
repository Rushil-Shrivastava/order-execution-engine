import { FastifyInstance } from "fastify";
import { orderService } from "../services/order.service";
import { wsManager } from "../ws/wsManager";

export async function registerOrderRoutes(fastify: FastifyInstance) {
  // POST -> create order and return orderId + wsUrl
  fastify.post("/api/orders/execute", async (request, reply) => {
    const body = request.body as any;
    const { tokenIn, tokenOut, amount } = body;

    if (!tokenIn || !tokenOut || !amount) {
      return reply.status(400).send({ error: "tokenIn, tokenOut, amount required" });
    }

    try {
      const { orderId } = await orderService.createMarketOrder({
        tokenIn,
        tokenOut,
        amount: Number(amount)
      });

      const wsUrl = `${request.protocol}://${request.headers.host}/api/orders/execute?orderId=${orderId}`;

      return reply.send({ orderId, wsUrl });
    } catch (err: any) {
      // log stack/message for debugging (do not leak sensitive info to clients)
      console.error("[ERROR] Request error", err?.message, err?.stack);
      return reply.status(500).send({ error: err?.message || "Internal Server Error" });
    }
  });

  // GET (WebSocket) -> subscribe to order updates
  fastify.get(
    "/api/orders/execute",
    { websocket: true },
    (connection, req) => {
      const { orderId } = req.query as { orderId?: string };
      if (!orderId) {
        connection.socket.send(
          JSON.stringify({ error: "Missing orderId in query params" })
        );
        connection.socket.close();
        return;
      }

      wsManager.register(orderId, connection);

      // Clean up on close/error to avoid stale references
      const cleanup = () => wsManager.unregister(orderId, connection);
      connection.socket.on("close", cleanup);
      connection.socket.on("error", (err) => {
        console.error("[WS] connection error", err);
        cleanup();
      });

      connection.socket.send(
        JSON.stringify({
          orderId,
          status: "pending"
        })
      );
    }
  );
}