import { QueueEvents, Queue } from "bullmq";
import { connection } from "./order.queue";
import { wsManager } from "../ws/wsManager";
import { getOrderById } from "../db/orderRepository";

const queueEvents = new QueueEvents("orders", { connection });
queueEvents.on("error", (err) => console.error("[QueueEvents] error", err));
queueEvents.on("waiting", (evt) => console.debug("[QueueEvents] waiting", evt));
queueEvents.on("completed", async ({ jobId }) => {
  console.info("[QueueEvents] completed", { jobId });
  try {
    const q = new Queue("orders", { connection });
    const job = await q.getJob(jobId);
    if (!job) {
      console.debug("[QueueEvents] no job found", { jobId });
      return;
    }
    const orderId = job.data?.orderId;
    if (!orderId) {
      console.debug("[QueueEvents] job missing orderId", { jobId });
      return;
    }
    const order = await getOrderById(orderId);
    const payload = {
      orderId,
      status: "confirmed",
      dex: order?.dex ?? null,
      txHash: order?.tx_hash ?? null
    };
    console.info("[QueueEvents] notifying subscribers", payload);
    wsManager.notify(orderId, payload);
  } catch (err) {
    console.error("[QueueEvents] completed handler error", err);
  }
});

queueEvents.on("failed", async ({ jobId, failedReason }) => {
  console.info("[QueueEvents] failed", { jobId, failedReason });
  try {
    const q = new Queue("orders", { connection });
    const job = await q.getJob(jobId);
    if (!job) return;
    const orderId = job.data?.orderId;
    if (!orderId) return;
    wsManager.notify(orderId, { orderId, status: "failed", reason: failedReason });
  } catch (err) {
    console.error("[QueueEvents] failed handler error", err);
  }
});

export default queueEvents;