import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { OrderJobData } from "../queue/order.queue";
import { MockDexRouter } from "../dex/mockDexRouter";
import { updateOrderStatus } from "../db/orderRepository";
import { wsManager } from "../ws/wsManager";
import { logger } from "../utils/logger";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null
});
const dexRouter = new MockDexRouter();

async function processJob(job: Job<OrderJobData>) {
  const { orderId, tokenIn, tokenOut, amount } = job.data;

  wsManager.sendStatus(orderId, "routing");
  await updateOrderStatus(orderId, "routing");

  try {
    wsManager.sendStatus(orderId, "building");
    await updateOrderStatus(orderId, "building");

    wsManager.sendStatus(orderId, "submitted");
    await updateOrderStatus(orderId, "submitted");

    const result = await dexRouter.executeSwap({ tokenIn, tokenOut, amount });

    wsManager.sendStatus(orderId, "confirmed", {
      dex: result.dex,
      txHash: result.txHash,
      executedPrice: result.executedPrice
    });
    await updateOrderStatus(orderId, "confirmed", {
      dex: result.dex,
      tx_hash: result.txHash
    });

    logger.info("Order confirmed", { orderId, dex: result.dex });
  } catch (err: any) {
    const reason = err?.message || "Unknown error";
    logger.error("Order execution failed", { orderId, reason });

    wsManager.sendStatus(orderId, "failed", { error: reason });
    await updateOrderStatus(orderId, "failed", {
      failure_reason: reason
    });

    throw err; // let BullMQ trigger retry
  }
}

const concurrency = 10;

export const worker = new Worker<OrderJobData>(
  "orders",
  async (job) => processJob(job),
  {
    connection,
    concurrency
  }
);

worker.on("completed", (job) => {
  logger.info("Job completed", { jobId: job.id });
});

worker.on("failed", (job, err) => {
  logger.error("Job failed", { jobId: job?.id, error: err?.message });
});