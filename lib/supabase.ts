/**
 * lib/supabase.ts
 * Re-exports the pg-based DB client under the familiar "supabase" name.
 * We use pg directly (via SUPABASE_DB_URL) instead of the Supabase JS client
 * so we don't need separate API keys.
 */
export { query, withTransaction, getPool } from "./db";
