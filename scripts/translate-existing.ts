#!/usr/bin/env tsx
/**
 * scripts/translate-existing.ts
 * Traduce las noticias existentes de issue_items que tengan headline_en IS NULL
 * usando Gemini API (idempotente).
 *
 * Ejecutar: npx tsx scripts/translate-existing.ts
 */
import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { query, getPool } from "@/lib/db";

async function main() {
  console.log("🌐 Buscando noticias en issue_items pendientes de traducción al inglés...\n");

  const pendingRows = await query<{
    id: string;
    headline_es: string;
    what_happened_es: string;
    why_it_matters_es: string;
  }>(`
    SELECT id, headline_es, what_happened_es, why_it_matters_es
    FROM issue_items
    WHERE headline_en IS NULL OR what_happened_en IS NULL OR why_it_matters_en IS NULL
    ORDER BY sort_order ASC
  `);

  if (pendingRows.length === 0) {
    console.log("✅ Todas las noticias ya tienen su versión en inglés. Nada que traducir.");
    await getPool().end();
    return;
  }

  console.log(`📝 Se encontraron ${pendingRows.length} noticias para traducir con Gemini...`);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  const prompt = `
Eres un traductor y editor experto en SEO, GEO e IA Search (estilo newsletter SEOFOMO).
Traduce los siguientes elementos del español al inglés manteniendo un tono profesional, conciso y técnico.

Elementos a traducir:
${JSON.stringify(pendingRows, null, 2)}

Devuelve ÚNICAMENTE un JSON con esta estructura exacta:
{
  "translations": [
    {
      "id": "UUID_DEL_ITEM",
      "headline_en": "Headline in English",
      "what_happened_en": "Concise 1-sentence explanation of what happened.",
      "why_it_matters_en": "Concise 1-2 sentence explanation of the practical SEO/GEO takeaway."
    }
  ]
}
`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  const parsed: {
    translations: Array<{
      id: string;
      headline_en: string;
      what_happened_en: string;
      why_it_matters_en: string;
    }>;
  } = JSON.parse(responseText);

  console.log(`✅ Recibidas ${parsed.translations.length} traducciones. Guardando en Supabase...`);

  for (const t of parsed.translations) {
    await query(
      `UPDATE issue_items
       SET headline_en = $1,
           what_happened_en = $2,
           why_it_matters_en = $3
       WHERE id = $4`,
      [t.headline_en, t.what_happened_en, t.why_it_matters_en, t.id]
    );
  }

  console.log("\n🎉 ¡Traducción de issue_items completada con éxito!");

  await getPool().end();
}

main().catch((err) => {
  console.error("❌ Error en translate-existing:", err);
  process.exit(1);
});
