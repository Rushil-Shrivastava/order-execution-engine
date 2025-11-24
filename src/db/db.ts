import { Pool } from "pg";

export const pool = new Pool({
  host: process.env.PG_HOST || "localhost",
  port: Number(process.env.PG_PORT || 5432),
  user: process.env.PG_USER || "order_user",
  password: process.env.PG_PASSWORD || "order_pass",
  database: process.env.PG_DATABASE || "order_db"
});

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}