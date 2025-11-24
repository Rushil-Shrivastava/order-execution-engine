export interface Quote {
  dex: "raydium" | "meteora";
  price: number;
  fee: number;
}

export interface ExecutionResult {
  txHash: string;
  executedPrice: number;
  dex: "raydium" | "meteora";
}