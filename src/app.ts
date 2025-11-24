import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { registerOrderRoutes } from "./api/order.controller";
import { logger } from "./utils/logger";

export async function buildApp() {
  const fastify = Fastify({
    logger: false
  });

  await fastify.register(websocket);
  await fastify.register(registerOrderRoutes);

  fastify.get("/health", async () => ({ status: "ok" }));

  fastify.addHook("onError", async (request, reply, error) => {
    logger.error("Request error", { error: error.message });
  });

  return fastify;
}