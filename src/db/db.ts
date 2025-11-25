import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || null;
const host = process.env.PG_HOST || "localhost";

const useSsl =
  process.env.PG_SSL === "true" ||
  (process.env.NODE_ENV === "production" && !!connectionString);

const pool = connectionString
  ? new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined
    })
  : new Pool({
      host,
      port: Number(process.env.PG_PORT || 5432),
      user: process.env.PG_USER || "order_user",
      password: process.env.PG_PASSWORD || "order_pass",
      database: process.env.PG_DATABASE || "order_db",
      max: 10,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined
    });

pool.on("connect", () => console.info("[DB] pool connected"));
pool.on("error", (err) => console.error("[DB] pool error", err));

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.info("[DB] query", { text: text.split("\n")[0], duration });
    return res.rows as T[];
  } catch (err) {
    console.error("[DB] query error", err);
    throw err;
  }
}

export async function checkDbConnection(): Promise<boolean> {
  try {
    await query("SELECT 1");
    return true;
  } catch (err) {
    return false;
  }
}

export { pool };
export default pool;