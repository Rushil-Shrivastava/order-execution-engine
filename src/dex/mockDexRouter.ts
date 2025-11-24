import { sleep } from "../utils/sleep";
import { generateMockTxHash } from "../utils/tx";
import { Quote, ExecutionResult } from "./types";

const BASE_PRICE = 1.0;

export class MockDexRouter {
  async getRaydiumQuote(
    tokenIn: string,
    tokenOut: string,
    amount: number
  ): Promise<Quote> {
    await sleep(200);
    const variance = 0.98 + Math.random() * 0.04; // 0.98–1.02
    return { dex: "raydium", price: BASE_PRICE * variance, fee: 0.003 };
  }

  async getMeteoraQuote(
    tokenIn: string,
    tokenOut: string,
    amount: number
  ): Promise<Quote> {
    await sleep(200);
    const variance = 0.97 + Math.random() * 0.05; // 0.97–1.02
    return { dex: "meteora", price: BASE_PRICE * variance, fee: 0.002 };
  }

  async getBestQuote(
    tokenIn: string,
    tokenOut: string,
    amount: number
  ): Promise<Quote> {
    const [raydium, meteora] = await Promise.all([
      this.getRaydiumQuote(tokenIn, tokenOut, amount),
      this.getMeteoraQuote(tokenIn, tokenOut, amount)
    ]);
    return raydium.price >= meteora.price ? raydium : meteora;
  }

  async executeSwap(order: {
    tokenIn: string;
    tokenOut: string;
    amount: number;
  }): Promise<ExecutionResult> {
    await sleep(2000 + Math.random() * 1000); // 2–3s
    const bestQuote = await this.getBestQuote(
      order.tokenIn,
      order.tokenOut,
      order.amount
    );
    return {
      dex: bestQuote.dex,
      executedPrice: bestQuote.price,
      txHash: generateMockTxHash()
    };
  }
}