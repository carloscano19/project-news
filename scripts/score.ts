#!/usr/bin/env tsx
/**
 * scripts/score.ts
 * Paso 5: Scoring de relevancia de topic_groups con Gemini API.
 *
 * Ejecutar: npm run pipeline:score
 */
import "dotenv/config";
import { runScoringPipeline, SCORE_THRESHOLD } from "@/lib/scoring";
import { getPool } from "@/lib/db";

async function main() {
  console.log(`🎯 Evaluando relevancia de los grupos temáticos con Gemini (Umbral: ${SCORE_THRESHOLD}/10)...\n`);

  const result = await runScoringPipeline(15, SCORE_THRESHOLD);

  console.log("\n" + "─".repeat(85));
  console.log(`📊 Total evaluados: ${result.scored}`);
  console.log(`✅ Seleccionados (>= ${SCORE_THRESHOLD}): ${result.selected}`);
  console.log(`❌ Descartados (< ${SCORE_THRESHOLD}): ${result.rejected}`);
  console.log("─".repeat(85) + "\n");

  if (result.selected > 0) {
    console.log("⭐ TOP NOTICIAS SELECCIONADAS PARA LA NEWSLETTER:\n");
    const selected = result.results
      .filter((r) => r.status === "selected")
      .sort((a, b) => b.score - a.score);

    for (const [idx, item] of selected.entries()) {
      console.log(`${(idx + 1).toString().padStart(2)}. [${item.score.toFixed(1)}/10] ${item.representative_title}`);
      console.log(`    💡 ${item.reasoning}\n`);
    }
  }

  console.log("👉 Siguiente: npm run pipeline:draft (Paso 6 — Redacción con Gemini)");

  await getPool().end();
}

main().catch((err) => {
  console.error("\n❌ Error en scoring:", err);
  process.exit(1);
});
