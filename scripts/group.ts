#!/usr/bin/env tsx
/**
 * scripts/group.ts
 * Paso 4: Deduplicación y agrupación de raw_items en topic_groups.
 *
 * Ejecutar: npm run pipeline:group
 */
import "dotenv/config";
import { groupRawItems } from "@/lib/grouping";
import { query, getPool } from "@/lib/db";

async function main() {
  console.log("🧩 Agrupando noticias por similitud temática...\n");

  const result = await groupRawItems();

  console.log(`📌 Edición semanal ID: ${result.weekIssueId}`);
  console.log(`📦 Grupos creados: ${result.groupsCreated}`);
  console.log(`📄 Ítems agrupados: ${result.itemsGrouped}\n`);

  if (result.groupsCreated > 0) {
    // Mostrar resumen de grupos creados con sus fuentes asociadas
    const groups = await query<{
      id: string;
      representative_title: string;
      item_count: string;
      sources: string;
    }>(`
      SELECT 
        tg.id,
        tg.representative_title,
        COUNT(tgi.raw_item_id) as item_count,
        STRING_AGG(DISTINCT s.name, ', ') as sources
      FROM topic_groups tg
      JOIN topic_group_items tgi ON tgi.topic_group_id = tg.id
      JOIN raw_items ri ON ri.id = tgi.raw_item_id
      JOIN sources s ON s.id = ri.source_id
      WHERE tg.week_id = $1
      GROUP BY tg.id, tg.representative_title
      ORDER BY item_count DESC, tg.created_at DESC
    `, [result.weekIssueId]);

    console.log("─".repeat(80));
    console.log(`${"Grupo / Título representativo".padEnd(50)} ${"Items".padStart(6)} ${"Fuentes"}`);
    console.log("─".repeat(80));

    for (const g of groups) {
      const title = g.representative_title.length > 47 
        ? g.representative_title.substring(0, 44) + "..." 
        : g.representative_title;
      console.log(`${title.padEnd(50)} ${g.item_count.padStart(6)}   ${g.sources}`);
    }
    console.log("─".repeat(80));
    console.log("\n👉 Siguiente: npm run pipeline:score (Paso 5 — Scoring con Gemini)");
  } else {
    console.log("ℹ️ No había ítems pendientes de agrupar para la semana actual.");
  }

  await getPool().end();
}

main().catch((err) => {
  console.error("\n❌ Error en agrupación:", err);
  process.exit(1);
});
