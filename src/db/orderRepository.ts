import { query } from "./db";

export type OrderStatus =
  | "pending"
  | "routing"
  | "building"
  | "submitted"
  | "confirmed"
  | "failed";

export interface OrderRecord {
  id: string;
  type: "market";
  token_in: string;
  token_out: string;
  amount: number;
  status: OrderStatus;
  dex?: string | null;
  tx_hash?: string | null;
  failure_reason?: string | null;
}

export async function createOrder(order: {
  id: string;
  tokenIn: string;
  tokenOut: string;
  amount: number;
}): Promise<OrderRecord> {
  const rows = await query<OrderRecord>(
    `
    INSERT INTO orders (id, type, token_in, token_out, amount, status)
    VALUES ($1, 'market', $2, $3, $4, 'pending')
    RETURNING *;
    `,
    [order.id, order.tokenIn, order.tokenOut, order.amount]
  );
  return rows[0];
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  extra?: Partial<Pick<OrderRecord, "dex" | "tx_hash" | "failure_reason">>
): Promise<void> {
  const fields: string[] = ["status"];
  const values: any[] = [status, id];
  let setClause = "status = $1";

  if (extra?.dex) {
    fields.push("dex");
    values.splice(1, 0, extra.dex);
    setClause += `, dex = $${fields.length}`;
  }
  if (extra?.tx_hash) {
    fields.push("tx_hash");
    values.splice(1, 0, extra.tx_hash);
    setClause += `, tx_hash = $${fields.length}`;
  }
  if (extra?.failure_reason) {
    fields.push("failure_reason");
    values.splice(1, 0, extra.failure_reason);
    setClause += `, failure_reason = $${fields.length}`;
  }

  await query(
    `
    UPDATE orders
    SET ${setClause}, updated_at = NOW()
    WHERE id = $${fields.length + 1};
    `,
    values
  );
}