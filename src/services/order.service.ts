import { v4 as uuidv4 } from "uuid";
import { createOrder } from "../db/orderRepository";
import { enqueueOrder } from "../queue/order.queue";

export interface CreateOrderInput {
  tokenIn: string;
  tokenOut: string;
  amount: number;
}

export class OrderService {
  async createMarketOrder(input: CreateOrderInput) {
    const id = uuidv4();

    await createOrder({
      id,
      tokenIn: input.tokenIn,
      tokenOut: input.tokenOut,
      amount: input.amount
    });

    await enqueueOrder({
      orderId: id,
      tokenIn: input.tokenIn,
      tokenOut: input.tokenOut,
      amount: input.amount
    });

    return { orderId: id };
  }
}

export const orderService = new OrderService();