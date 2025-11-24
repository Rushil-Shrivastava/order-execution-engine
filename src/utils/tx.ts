export function generateMockTxHash(): string {
  return "0x" + [...Array(64)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("");
}