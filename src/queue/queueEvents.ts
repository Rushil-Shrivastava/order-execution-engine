import { QueueEvents, Queue } from "bullmq";
import { connection } from "./order.queue";
import { wsManager } from "../ws/wsManager";
import { getOrderById } from "../db/orderRepository"; // add/verify this helper exists

const queueEvents = new QueueEvents("orders", { connection });

// Completed
queueEvents.on("completed", async ({ jobId }) => {
  try {
    const q = new Queue("orders", { connection });
    const job = await q.getJob(jobId);
    if (!job) return;
    const orderId = job.data?.orderId;
    if (!orderId) return;
    const order = await getOrderById(orderId);
    wsManager.notify(orderId, {
      orderId,
      status: "confirmed",
      dex: order?.dex,
      txHash: order?.tx_hash
    });
  } catch (err) {
    console.error("[QueueEvents] completed", err);
  }
});

// Failed
queueEvents.on("failed", async ({ jobId, failedReason }) => {
  try {
    const q = new Queue("orders", { connection });
    const job = await q.getJob(jobId);
    if (!job) return;
    const orderId = job.data?.orderId;
    if (!orderId) return;
    wsManager.notify(orderId, {
      orderId,
      status: "failed",
      reason: failedReason
    });
  } catch (err) {
    console.error("[QueueEvents] failed", err);
  }
});