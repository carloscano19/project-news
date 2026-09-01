#!/usr/bin/env tsx
/**
 * scripts/ingest.ts
 * Script de ingesta RSS — Paso 3 del pipeline.
 * Lee todos los feeds activos y guarda los ítems nuevos en raw_items.
 *
 * Ejecutar: npm run pipeline:ingest
 */
import "dotenv/config";
import { ingestAllSources } from "@/lib/rss";
import { getPool } from "@/lib/db";

async function main() {
  const start = Date.now();
  console.log("📡 Iniciando ingesta RSS...\n");

  const results = await ingestAllSources();

  if (results.length === 0) {
    console.log("No hay resultados.");
    return;
  }

  // ── Tabla de resultados ──────────────────────────────────────
  console.log("─".repeat(65));
  console.log(
    `${"Fuente".padEnd(35)} ${"Fetched".padStart(7)} ${"Nuevos".padStart(7)} ${"Dup.".padStart(6)}`
  );
  console.log("─".repeat(65));

  let totalFetched = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  let errors = 0;

  for (const r of results) {
    totalFetched += r.fetched;
    totalInserted += r.inserted;
    totalSkipped += r.skipped;

    if (r.error) {
      errors++;
      console.log(`❌ ${r.source.padEnd(33)} ERROR: ${r.error}`);
    } else {
      const icon = r.inserted > 0 ? "✅" : "⏭️ ";
      console.log(
        `${icon} ${r.source.padEnd(33)} ${String(r.fetched).padStart(7)} ${String(r.inserted).padStart(7)} ${String(r.skipped).padStart(6)}`
      );
    }
  }

  console.log("─".repeat(65));
  console.log(
    `${"TOTAL".padEnd(35)} ${String(totalFetched).padStart(7)} ${String(totalInserted).padStart(7)} ${String(totalSkipped).padStart(6)}`
  );
  console.log("─".repeat(65));

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n⏱️  Completado en ${elapsed}s | ${errors} error(es)`);

  if (totalInserted > 0) {
    console.log(`\n✅ ${totalInserted} ítems nuevos guardados en raw_items.`);
    console.log("👉 Siguiente: npm run pipeline:group (Paso 4 — Agrupación)");
  } else {
    console.log("\n⏭️  Sin ítems nuevos en esta ejecución (todos ya existían).");
  }

  // Cerrar el pool pg al terminar
  await getPool().end();
}

main().catch((err) => {
  console.error("\n❌ Error fatal:", err.message);
  process.exit(1);
});
