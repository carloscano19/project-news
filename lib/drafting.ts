/**
 * lib/drafting.ts
 * Paso 6: Redacción bilingüe (ES / EN) con Gemini API.
 * 
 * Formato SEOFOMO (SRS §1, §3.4):
 * - Titular claro y directo en español e inglés.
 * - Formato: "Qué pasó / What happened" y "Qué significa / Why it matters".
 * - Categorización técnica: 'google-updates', 'ai-search', 'seo-strategy', 'technical-seo', 'local-ecommerce'.
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
  category:
    | "google-updates"
    | "ai-search"
    | "seo-strategy"
    | "technical-seo"
    | "local-ecommerce"
    | "data-analytics"
    | "paid-media";
  es: {
    headline: string;
    what_happened: string;
    why_it_matters: string;
  };
  en: {
    headline: string;
    what_happened: string;
    why_it_matters: string;
  };
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
Eres el redactor jefe de "Project News", una newsletter técnica y directa sobre Search, SEO, GEO, Data & Analytics y Paid Media (estilo SEOFOMO).
Tu estilo es conciso, pragmático y sin relleno comercial.

Para cada grupo de noticias seleccionado, debes redactar la versión en **ESPAÑOL** y en **INGLÉS**:
1. **headline**: Titular claro y atractivo (máx 12-15 palabras).
2. **what_happened**: 1 frase concisa con el hecho/dato objetivo.
3. **why_it_matters**: 1-2 frases explicando la implicación práctica para rankings, visibilidad en IA, tráfico, analítica o campañas de pago.
4. **category**: Asigna una de las siguientes categorías exactas:
   - 'google-updates' (cambios de algoritmo orgánico, Search Console, políticas de Google)
   - 'ai-search' (ChatGPT Search, AI Overviews, LLMs, Perplexity, citaciones IA)
   - 'technical-seo' (Schema, rastreo, indexación, Core Web Vitals, arquitectura web)
   - 'seo-strategy' (estudios de datos, presupuestos, link building, contenido)
   - 'local-ecommerce' (Google Maps, Merchant Center orgánico, comercio local)
   - 'data-analytics' (GA4, Google Tag Manager, server-side tracking, atribución, privacidad, consent mode)
   - 'paid-media' (Google Ads, Meta Ads, Paid Social, Smart Bidding, Performance Max, formatos publicitarios, APIs de anuncios)

Responde ÚNICAMENTE con un JSON con esta estructura exacta:
{
  "drafts": [
    {
      "topic_group_id": "UUID_DEL_GRUPO",
      "category": "ai-search",
      "es": {
        "headline": "Titular en español",
        "what_happened": "Explicación concisa en 1 frase en español.",
        "why_it_matters": "Implicación práctica en 1-2 frases en español."
      },
      "en": {
        "headline": "Headline in English",
        "what_happened": "Concise 1-sentence explanation in English.",
        "why_it_matters": "Practical takeaway in 1-2 sentences in English."
      }
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

Redacta en español e inglés los siguientes temas seleccionados para la edición semanal:
${JSON.stringify(payload, null, 2)}
`;

  let result;
  let attempts = 0;
  while (attempts < 4) {
    try {
      attempts++;
      result = await model.generateContent(prompt);
      break;
    } catch (err: unknown) {
      const is503or429 = err instanceof Error && (err.message.includes("503") || err.message.includes("429") || err.message.includes("high demand"));
      if (is503or429 && attempts < 4) {
        console.warn(`  ⚠️ Gemini 503/429 en redacción (intento ${attempts}/4). Reintentando en ${attempts * 3}s...`);
        await new Promise((r) => setTimeout(r, attempts * 3000));
      } else {
        throw err;
      }
    }
  }

  if (!result) throw new Error("No se pudo obtener respuesta de Gemini en redacción tras varios reintentos");
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
      AND tg.id NOT IN (SELECT topic_group_id FROM issue_items)
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

export const MAX_ITEMS_PER_CATEGORY = 4;
export const MAX_TOTAL_ITEMS_PER_ISSUE = 18;

/**
 * Genera la redacción bilingüe solo para los grupos seleccionados pendientes y los añade a issue_items
 */
export async function runDraftingPipeline() {
  const pendingSelectedGroups = await loadSelectedGroups();
  if (pendingSelectedGroups.length === 0) {
    console.log("  ℹ️ No hay noticias seleccionadas pendientes de redactar.");
    return { drafted: 0, items: [] };
  }

  const weekId = pendingSelectedGroups[0].week_id;

  console.log(`  ✍️ Redactando ${pendingSelectedGroups.length} noticias nuevas en ES/EN con Gemini...`);
  const drafts = await draftSelectedItems(pendingSelectedGroups);

  // Mapa de puntuaciones para ordenar candidatos por relevancia
  const groupScoreMap = new Map<string, number>();
  for (const g of pendingSelectedGroups) {
    groupScoreMap.set(g.topic_group_id, g.relevance_score);
  }

  // Ordenar borradores por score descendente (los de mayor señal van primero)
  const sortedDrafts = [...drafts].sort((a, b) => {
    const scoreA = groupScoreMap.get(a.topic_group_id) ?? 8.0;
    const scoreB = groupScoreMap.get(b.topic_group_id) ?? 8.0;
    return scoreB - scoreA;
  });

  // Consultar conteo actual de items ya existentes en la edición
  const existingItems = await query<{ category: string }>(
    "SELECT category FROM issue_items WHERE weekly_issue_id = $1",
    [weekId]
  );
  let totalCount = existingItems.length;
  const categoryCounts: Record<string, number> = {};
  for (const item of existingItems) {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
  }

  // Aplicar regla de diversidad: máx 4 por categoría, máx 18 en total por edición
  const selectedDrafts: DraftedItemOutput[] = [];
  for (const draft of sortedDrafts) {
    if (totalCount >= MAX_TOTAL_ITEMS_PER_ISSUE) {
      console.log(`  ⏹️ Límite total de la edición alcanzado (${MAX_TOTAL_ITEMS_PER_ISSUE} noticias).`);
      break;
    }

    const cat = draft.category;
    const catCount = categoryCounts[cat] || 0;

    if (catCount >= MAX_ITEMS_PER_CATEGORY) {
      console.log(`  ⏭️ Omitiendo "${draft.es.headline}": categoría "${cat}" ya alcanzó el cupo de ${MAX_ITEMS_PER_CATEGORY}.`);
      continue;
    }

    selectedDrafts.push(draft);
    categoryCounts[cat] = catCount + 1;
    totalCount++;
  }

  // Obtener el último sort_order existente para esta edición
  const maxOrderRows = await query<{ max_order: number | null }>(
    "SELECT MAX(sort_order) as max_order FROM issue_items WHERE weekly_issue_id = $1",
    [weekId]
  );
  let currentOrder = maxOrderRows[0]?.max_order ?? 0;

  // Insertar únicamente los items seleccionados por diversidad
  for (const draft of selectedDrafts) {
    currentOrder++;
    const legacySummary = `**Qué pasó:** ${draft.es.what_happened} **Qué significa:** ${draft.es.why_it_matters}`;

    await query(
      `INSERT INTO issue_items (
        weekly_issue_id, 
        topic_group_id, 
        headline, 
        implication_summary,
        headline_es,
        headline_en,
        what_happened_es,
        what_happened_en,
        why_it_matters_es,
        why_it_matters_en,
        category, 
        sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        weekId,
        draft.topic_group_id,
        draft.es.headline,
        legacySummary,
        draft.es.headline,
        draft.en.headline,
        draft.es.what_happened,
        draft.en.what_happened,
        draft.es.why_it_matters,
        draft.en.why_it_matters,
        draft.category,
        currentOrder,
      ]
    );
  }

  // Marcar la edición semanal como publicada una vez completada la redacción
  await query(
    "UPDATE weekly_issues SET status = 'published' WHERE id = $1",
    [weekId]
  );

  return {
    weekId,
    drafted: drafts.length,
    items: drafts,
  };
}
