/**
 * lib/drafting.ts
 * Paso 6: Redacción con Gemini API.
 * 
 * Formato SEOFOMO (SRS §1, §3.4):
 * - Titular claro y directo en español.
 * - Formato: "¿Qué pasó? — ¿Qué significa?" (resumen conciso de impacto práctico para SEO/GEO).
 * - Categorización automática: 'google-updates', 'ai-search', 'seo-strategy', 'technical-seo', 'local-ecommerce'.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getPool, query } from "@/lib/db";

export interface SelectedGroupForDraft {
  topic_group_id: string;
  week_id: string;
  representative_title: string;
  relevance_score: number;
  sources: string;
  articles: Array<{
    title: string;
    body_raw: string | null;
    url: string;
    source: string;
  }>;
}

export interface DraftedItemOutput {
  topic_group_id: string;
  headline: string;
  implication_summary: string;
  category: "google-updates" | "ai-search" | "seo-strategy" | "technical-seo" | "local-ecommerce";
}

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
    },
  });
}

const SYSTEM_DRAFTING_PROMPT = `
Eres el redactor jefe de "Project News", una newsletter técnica y directa sobre SEO, GEO e IA Search.
Tu estilo está inspirado en SEOFOMO: conciso, ultra pragmático, sin relleno comercial ni obviedades. Escribe en un español impecable, natural y profesional para consultores y responsables SEO.

Para cada grupo de noticias seleccionado, debes redactar:
1. **headline**: Un titular claro, informativo y atractivo en español (máx 12-15 palabras).
2. **implication_summary**: Debe seguir estrictamente la estructura:
   "**Qué pasó:** [Explicación concisa en 1 frase de la novedad/dato]. **Qué significa:** [1-2 frases explicando la implicación práctica directa para rankings, visibilidad en IA, tráfico o estrategia SEO/GEO]."
3. **category**: Asigna una de las siguientes categorías exactas:
   - 'google-updates' (cambios de algoritmo, Search Console, políticas de Google)
   - 'ai-search' (ChatGPT Search, AI Overviews, LLMs, Perplexity, citaciones IA)
   - 'technical-seo' (Schema, rastreo, indexación, Core Web Vitals, arquitectura web)
   - 'seo-strategy' (estudios de datos, presupuestos, link building, contenido)
   - 'local-ecommerce' (Google Maps, Merchant Center, comercio local)

Responde ÚNICAMENTE con un JSON que cumpla esta estructura:
{
  "drafts": [
    {
      "topic_group_id": "UUID_DEL_GRUPO",
      "headline": "Titular en español",
      "implication_summary": "**Qué pasó:** ... **Qué significa:** ...",
      "category": "ai-search"
    }
  ]
}
`;

export async function draftSelectedItems(
  items: SelectedGroupForDraft[]
): Promise<DraftedItemOutput[]> {
  if (items.length === 0) return [];

  const model = getGeminiModel();

  const payload = items.map((g) => ({
    topic_group_id: g.topic_group_id,
    representative_title: g.representative_title,
    sources: g.sources,
    articles: g.articles.map((a) => ({
      title: a.title,
      source: a.source,
      snippet: a.body_raw ? a.body_raw.substring(0, 400) : null,
    })),
  }));

  const prompt = `${SYSTEM_DRAFTING_PROMPT}

Redacta los siguientes temas seleccionados para la edición semanal:
${JSON.stringify(payload, null, 2)}
`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  let parsed: { drafts: DraftedItemOutput[] };
  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new Error(`Error parseando respuesta JSON de redacción: ${responseText}`);
  }

  return parsed.drafts;
}

export async function loadSelectedGroups(): Promise<SelectedGroupForDraft[]> {
  const rows = await query<{
    topic_group_id: string;
    week_id: string;
    representative_title: string;
    relevance_score: string;
    raw_item_id: string;
    item_title: string;
    body_raw: string | null;
    item_url: string;
    source_name: string;
  }>(`
    SELECT 
      tg.id as topic_group_id,
      tg.week_id,
      tg.representative_title,
      tg.relevance_score,
      ri.id as raw_item_id,
      ri.title as item_title,
      ri.body_raw,
      ri.url as item_url,
      s.name as source_name
    FROM topic_groups tg
    JOIN topic_group_items tgi ON tgi.topic_group_id = tg.id
    JOIN raw_items ri ON ri.id = tgi.raw_item_id
    JOIN sources s ON s.id = ri.source_id
    WHERE tg.status = 'selected'
    ORDER BY tg.relevance_score DESC, tg.created_at DESC
  `);

  const groupMap = new Map<string, SelectedGroupForDraft>();

  for (const row of rows) {
    if (!groupMap.has(row.topic_group_id)) {
      groupMap.set(row.topic_group_id, {
        topic_group_id: row.topic_group_id,
        week_id: row.week_id,
        representative_title: row.representative_title,
        relevance_score: Number(row.relevance_score),
        sources: row.source_name,
        articles: [],
      });
    }

    const g = groupMap.get(row.topic_group_id)!;
    g.articles.push({
      title: row.item_title,
      body_raw: row.body_raw,
      url: row.item_url,
      source: row.source_name,
    });
  }

  return Array.from(groupMap.values());
}

/**
 * Genera la redacción de los grupos seleccionados y los guarda en issue_items
 */
export async function runDraftingPipeline() {
  const selectedGroups = await loadSelectedGroups();
  if (selectedGroups.length === 0) {
    return { drafted: 0, items: [] };
  }

  const weekId = selectedGroups[0].week_id;

  console.log(`  ✍️ Redactando ${selectedGroups.length} noticias seleccionadas con Gemini...`);
  const drafts = await draftSelectedItems(selectedGroups);

  // Limpiar issue_items anteriores para esta edición si se re-ejecuta (idempotente)
  await query("DELETE FROM issue_items WHERE weekly_issue_id = $1", [weekId]);

  // Insertar en issue_items ordenados por puntuación
  for (const [index, draft] of drafts.entries()) {
    await query(
      `INSERT INTO issue_items (
        weekly_issue_id, 
        topic_group_id, 
        headline, 
        implication_summary, 
        category, 
        sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        weekId,
        draft.topic_group_id,
        draft.headline,
        draft.implication_summary,
        draft.category,
        index + 1,
      ]
    );
  }

  return {
    weekId,
    drafted: drafts.length,
    items: drafts,
  };
}
