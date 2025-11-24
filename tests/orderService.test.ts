import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/orderRepository", () => ({
  createOrder: vi.fn().mockResolvedValue(null)
}));

vi.mock("../src/queue/order.queue", () => ({
  enqueueOrder: vi.fn().mockResolvedValue(null)
}));

import { orderService } from "../src/services/order.service";
import { createOrder } from "../src/db/orderRepository";
import { enqueueOrder } from "../src/queue/order.queue";

describe("OrderService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a market order and enqueues it", async () => {
    const result = await orderService.createMarketOrder({
      tokenIn: "SOL",
      tokenOut: "USDC",
      amount: 1
    });

    expect(result.orderId).toBeDefined();
    expect(createOrder).toHaveBeenCalledTimes(1);
    expect(enqueueOrder).toHaveBeenCalledTimes(1);
  });

  it("passes correct data to createOrder", async () => {
    await orderService.createMarketOrder({
      tokenIn: "SOL",
      tokenOut: "USDC",
      amount: 1
    });

    const call = (createOrder as any).mock.calls[0][0];

    expect(call.tokenIn).toBe("SOL");
    expect(call.tokenOut).toBe("USDC");
    expect(call.amount).toBe(1);
    expect(call.id).toBeDefined();
  });

  it("passes correct data to enqueueOrder", async () => {
    await orderService.createMarketOrder({
      tokenIn: "SOL",
      tokenOut: "USDC",
      amount: 1
    });

    const call = (enqueueOrder as any).mock.calls[0][0];
    expect(call.tokenIn).toBe("SOL");
    expect(call.tokenOut).toBe("USDC");
    expect(call.amount).toBe(1);
    expect(call.orderId).toBeDefined();
  });

  it("generates unique order IDs per call", async () => {
    const r1 = await orderService.createMarketOrder({
      tokenIn: "SOL",
      tokenOut: "USDC",
      amount: 1
    });
    const r2 = await orderService.createMarketOrder({
      tokenIn: "SOL",
      tokenOut: "USDC",
      amount: 2
    });

    expect(r1.orderId).not.toBe(r2.orderId);
  });
});