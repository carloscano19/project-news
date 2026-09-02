#!/usr/bin/env tsx
/**
 * scripts/draft.ts
 * Paso 6: Redacción con Gemini (titular + implicación) de las noticias seleccionadas.
 *
 * Ejecutar: npm run pipeline:draft
 */
import "dotenv/config";
import { runDraftingPipeline } from "@/lib/drafting";
import { query, getPool } from "@/lib/db";

async function main() {
  console.log("✍️ Iniciando redacción de noticias seleccionadas con Gemini...\n");

  const result = await runDraftingPipeline();

  if (result.drafted === 0) {
    console.log("⚠️ No hay grupos en estado 'selected' para redactar.");
    await getPool().end();
    return;
  }

  console.log(`✅ ${result.drafted} noticias redactadas e insertadas en issue_items para la edición:\n`);

  // Consultar el resultado final almacenado con fuentes originales y puntuación
  const finalItems = await query<{
    sort_order: number;
    headline_es: string;
    headline_en: string;
    what_happened_es: string;
    what_happened_en: string;
    why_it_matters_es: string;
    why_it_matters_en: string;
    category: string;
    relevance_score: string;
    sources: string;
    urls: string;
  }>(`
    SELECT 
      ii.sort_order,
      ii.headline_es,
      ii.headline_en,
      ii.what_happened_es,
      ii.what_happened_en,
      ii.why_it_matters_es,
      ii.why_it_matters_en,
      ii.category,
      tg.relevance_score,
      STRING_AGG(DISTINCT s.name, ', ') as sources,
      STRING_AGG(DISTINCT ri.url, '\n   🔗 ') as urls
    FROM issue_items ii
    JOIN topic_groups tg ON tg.id = ii.topic_group_id
    JOIN topic_group_items tgi ON tgi.topic_group_id = tg.id
    JOIN raw_items ri ON ri.id = tgi.raw_item_id
    JOIN sources s ON s.id = ri.source_id
    WHERE ii.weekly_issue_id = $1
    GROUP BY ii.id, ii.sort_order, ii.headline_es, ii.headline_en, ii.what_happened_es, ii.what_happened_en, ii.why_it_matters_es, ii.why_it_matters_en, ii.category, tg.relevance_score
    ORDER BY ii.sort_order ASC
  `, [result.weekId]);

  console.log("═".repeat(90));
  for (const item of finalItems) {
    console.log(`\n📌 #${item.sort_order} [${item.category.toUpperCase()}] (Score: ${Number(item.relevance_score).toFixed(1)}/10)`);
    console.log(`🇪🇸 [ES] ${item.headline_es}`);
    console.log(`   📌 ${item.what_happened_es}`);
    console.log(`   💡 ${item.why_it_matters_es}`);
    console.log(`🇬🇧 [EN] ${item.headline_en}`);
    console.log(`   📌 ${item.what_happened_en}`);
    console.log(`   💡 ${item.why_it_matters_en}`);
    console.log(`🏷️ Fuentes: ${item.sources}`);
    console.log(`🔗 ${item.urls}`);
  }
  console.log("\n" + "═".repeat(90));
  console.log("\n👉 Siguiente: Visualizar la edición en la web (Paso 7)");

  await getPool().end();
}

main().catch((err) => {
  console.error("\n❌ Error en redacción:", err);
  process.exit(1);
});
