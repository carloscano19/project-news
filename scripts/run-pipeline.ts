#!/usr/bin/env tsx
/**
 * scripts/run-pipeline.ts
 * Ejecuta el pipeline completo de Fase 1 de principio a fin:
 * 1. Ingesta RSS
 * 2. Deduplicación / Agrupación
 * 3. Scoring con Gemini
 * 4. Redacción con Gemini
 *
 * Ejecutar: npm run pipeline:run
 */
import "dotenv/config";
import { ingestAllSources } from "@/lib/rss";
import { groupRawItems } from "@/lib/grouping";
import { runScoringPipeline } from "@/lib/scoring";
import { runDraftingPipeline } from "@/lib/drafting";
import { getPool } from "@/lib/db";

async function main() {
  console.log("🚀 =========================================");
  console.log("📰 PROJECT NEWS — EJECUCIÓN DEL PIPELINE");
  console.log("🚀 =========================================\n");

  const start = Date.now();

  // 1. Ingesta RSS
  console.log("📡 [1/4] Ejecutando ingesta RSS...");
  const ingestResults = await ingestAllSources();
  const totalInserted = ingestResults.reduce((acc, r) => acc + r.inserted, 0);
  console.log(`   ✅ Ingesta finalizada: ${totalInserted} artículos nuevos guardados.\n`);

  // 2. Agrupación por similitud
  console.log("🧩 [2/4] Agrupando artículos por tema...");
  const groupResult = await groupRawItems();
  console.log(`   ✅ Agrupación lista: ${groupResult.groupsCreated} grupos temáticos creados (${groupResult.itemsGrouped} artículos).\n`);

  // 3. Scoring con Gemini
  console.log("🎯 [3/4] Evaluando relevancia editorial con Gemini...");
  const scoreResult = await runScoringPipeline(15, 8.0);
  console.log(`   ✅ Scoring completado: ${scoreResult.selected} noticias seleccionadas (>= 8.0) de ${scoreResult.scored} analizadas.\n`);

  // 4. Redacción con Gemini
  console.log("✍️ [4/4] Redactando formato editorial (SEOFOMO)...");
  const draftResult = await runDraftingPipeline();
  console.log(`   ✅ Redacción completada: ${draftResult.drafted} noticias redactadas e insertadas en issue_items.\n`);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log("🎉 =========================================");
  console.log(`✨ PIPELINE COMPLETADO CON ÉXITO EN ${elapsed}s`);
  console.log("👉 Abre http://localhost:3000 para revisar la edición.");
  console.log("🎉 =========================================");

  await getPool().end();
}

main().catch((err) => {
  console.error("\n❌ Error ejecutando pipeline completo:", err);
  process.exit(1);
});
