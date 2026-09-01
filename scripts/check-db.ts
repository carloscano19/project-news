#!/usr/bin/env tsx
/**
 * scripts/check-db.ts
 * Verifica la conexión directa a Supabase usando pg + SUPABASE_DB_URL
 * Ejecutar: npx tsx scripts/check-db.ts
 */
import "dotenv/config";
import { query } from "@/lib/db";

async function main() {
  console.log("🔍 Verificando conexión a Supabase (pg directo)...\n");

  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error("❌ SUPABASE_DB_URL no está definida en .env");
    process.exit(1);
  }

  // Mask password for display
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ":****@");
  console.log(`📡 URL: ${maskedUrl}\n`);

  try {
    const rows = await query<{ now: Date }>("SELECT NOW() as now");
    console.log("✅ Conectado a Supabase correctamente.");
    console.log(`   Hora del servidor DB: ${rows[0].now.toISOString()}\n`);
    console.log("👉 Siguiente paso: ejecutar las migraciones SQL (Paso 2).");
  } catch (err: unknown) {
    console.error("❌ Error de conexión:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
