/**
 * lib/db.ts
 * Cliente PostgreSQL directo usando SUPABASE_DB_URL (Transaction Pooler).
 * Válido tanto para scripts Node.js como para Next.js Route Handlers (server-side).
 *
 * NO uses este módulo en componentes de cliente (browser) — es server-only.
 */
import { Pool, type PoolClient } from "pg";

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (_pool) return _pool;

  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error("SUPABASE_DB_URL is not set in environment variables");
  }

  _pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Supabase pooler requiere SSL
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  _pool.on("error", (err) => {
    console.error("Unexpected error on idle DB client:", err);
  });

  return _pool;
}

/**
 * Ejecuta una consulta simple y devuelve las filas.
 */
export async function query<T extends Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query<T>(sql, params);
  return result.rows;
}

/**
 * Transacción: recibe una función que usa el client y la envuelve en BEGIN/COMMIT/ROLLBACK.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
