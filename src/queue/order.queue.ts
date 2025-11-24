import { Queue } from "bullmq";
import IORedis, { RedisOptions } from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const opts: RedisOptions = {
  maxRetriesPerRequest: null,
  // Add a connect timeout so errors surface quicker during deployments
  connectTimeout: 10000
};

// Enable tls only when the URL scheme is rediss://
if (redisUrl.startsWith("rediss://")) {
  // include servername (SNI) so providers that require it will accept TLS
  try {
    const parsed = new URL(redisUrl);
    opts.tls = { servername: parsed.hostname };
  } catch {
    opts.tls = {};
  }
}

const connection = new IORedis(redisUrl, opts);
// small diagnostic logs to help debug ETIMEDOUT while deploying
connection.on("connect", () => console.info("[Redis] connecting"));
connection.on("ready", () => console.info("[Redis] ready"));
connection.on("error", (err) => console.error("[Redis] error", err));

export interface OrderJobData {
  orderId: string;
  tokenIn: string;
  tokenOut: string;
  amount: number;
}

export const orderQueue = new Queue<OrderJobData>("orders", { connection });

export async function enqueueOrder(data: OrderJobData) {
  return orderQueue.add("execute-order", data, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 500
    },
    removeOnComplete: 1000,
    removeOnFail: 1000
  });
}