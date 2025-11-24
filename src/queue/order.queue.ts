import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null
});

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