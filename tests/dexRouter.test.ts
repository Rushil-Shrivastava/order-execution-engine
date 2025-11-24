import { describe, it, expect } from "vitest";
import { MockDexRouter } from "../src/dex/mockDexRouter";

describe("MockDexRouter", () => {
  const router = new MockDexRouter();

  it("returns a valid Raydium quote", async () => {
    const q = await router.getRaydiumQuote("SOL", "USDC", 1);
    expect(q.dex).toBe("raydium");
    expect(q.price).toBeGreaterThan(0);
    expect(q.fee).toBeGreaterThan(0);
  });

  it("returns a valid Meteora quote", async () => {
    const q = await router.getMeteoraQuote("SOL", "USDC", 1);
    expect(q.dex).toBe("meteora");
    expect(q.price).toBeGreaterThan(0);
    expect(q.fee).toBeGreaterThan(0);
  });

  it("getBestQuote picks one of the DEXes", async () => {
    const best = await router.getBestQuote("SOL", "USDC", 1);
    expect(["raydium", "meteora"]).toContain(best.dex);
  });

  it("executeSwap returns txHash and executedPrice", async () => {
    const result = await router.executeSwap({
      tokenIn: "SOL",
      tokenOut: "USDC",
      amount: 1
    });
    expect(result.dex === "raydium" || result.dex === "meteora").toBe(true);
    expect(result.txHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result.executedPrice).toBeGreaterThan(0);
  });
});