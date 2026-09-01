#!/usr/bin/env tsx
/**
 * scripts/migrate.ts
 * Aplica todas las migraciones SQL de supabase/migrations/ en orden numérico.
 * Registra las ya aplicadas en una tabla interna "schema_migrations" para no
 * ejecutar la misma migración dos veces (idempotente).
 *
 * Ejecutar: npx tsx scripts/migrate.ts
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { getPool } from "@/lib/db";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

async function main() {
  console.log("🗄️  Ejecutando migraciones SQL...\n");

  const pool = getPool();
  const client = await pool.connect();

  try {
    // 1. Crear tabla de tracking de migraciones si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT        PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // 2. Leer migraciones ya aplicadas
    const { rows: applied } = await client.query<{ filename: string }>(
      "SELECT filename FROM schema_migrations ORDER BY filename"
    );
    const appliedSet = new Set(applied.map((r) => r.filename));

    // 3. Leer archivos .sql del directorio de migraciones
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log("⚠️  No se encontraron archivos .sql en supabase/migrations/");
      return;
    }

    let appliedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  ⏭️  Omitida (ya aplicada): ${file}`);
        skippedCount++;
        continue;
      }

      const filepath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filepath, "utf-8");

      console.log(`  ▶️  Aplicando: ${file} ...`);

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [file]
        );
        await client.query("COMMIT");
        console.log(`  ✅ Completada: ${file}`);
        appliedCount++;
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Error aplicando ${file}: ${err instanceof Error ? err.message : err}`);
      }
    }

    console.log(`\n📊 Resumen: ${appliedCount} aplicadas, ${skippedCount} omitidas.`);
    console.log("\n👉 Siguiente: npx tsx scripts/seed-sources.ts (para poblar las fuentes RSS)");

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("\n❌ Error fatal:", err.message);
  process.exit(1);
});
