/**
 * lib/scoring.ts
 * Paso 5: Scoring de relevancia con Gemini API.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getPool, query } from "@/lib/db";

export const SCORE_THRESHOLD = 8.0;

export interface GroupToScore {
  id: string;
  representative_title: string;
  sources: string;
  articles: Array<{
    title: string;
    body_raw: string | null;
    url: string;
    source: string;
  }>;
}

export interface ScoreOutput {
  id: string;
  representative_title: string;
  score: number;
  reasoning: string;
  status: "selected" | "rejected";
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
      temperature: 0.2,
    },
  });
}

const SYSTEM_SCORING_PROMPT = `
Eres el editor jefe y curador experto de "Project News", una publicación técnica semanal de élite sobre Search & Growth que cubre cuatro pilares con el MISMO peso:
1. **SEO & GEO**: Rastreo, indexación, Core Updates, directrices técnicas, Search Console, visibilidad orgánica.
2. **AI Search & Modelos**: AI Overviews, ChatGPT Search, Perplexity, citas de IA, optimización para agentes y LLMs.
3. **Data & Analytics**: Google Analytics 4 (GA4), Google Tag Manager (GTM), medición server-side, atribución, consent mode, privacidad de datos y APIs de tracking.
4. **Paid Media**: Google Ads, Meta Ads / Paid Social, Smart Bidding, Performance Max, formatos de anuncios, subastas y APIs publicitarias.

Tu objetivo es filtrar el ruido diario y seleccionar únicamente noticias con ALTA SEÑAL e impacto práctico real en cualquiera de estos cuatro pilares, sin sesgo estructural hacia uno sobre otro. Una actualización importante de Google Ads o de GA4/GTM debe puntuar igual de alto que una de Google Search o AI Overviews.

Para cada grupo de noticias, evalúalo de 0.0 a 10.0 según:
1. **Impacto Práctico**: ¿Afecta a ingresos, visibilidad, medición, atribución, presupuesto publicitario, tráfico o decisiones técnicas operativas?
2. **Novedad y Señal**: ¿Es un lanzamiento oficial, cambio de producto/algoritmo, estudio con datos rigurosos o directriz técnica? (vs opinión especulativa, relaciones públicas o recap genérico).
3. **Filtro Anti-ruido**:
   - Puntuación MUY BAJA (< 4.0): noticias corporativas no operativas (ej. apertura de sedes, litigios menores no vinculantes, notas de prensa de RRHH), fallos temporales irrelevantes, posts promocionales o resúmenes diarios de foros ("Daily Search Forum Recap").
   - Puntuación MEDIA (4.0 - 6.9): artículos de opinión sin datos contrastados, tutoriales básicos para principiantes, notas de prensa rutinarias sin cambios de plataforma.
   - Puntuación ALTA (>= 7.0) / ÉLITE (>= 8.0): cambios oficiales en Google Search/Ads, Meta Ads o GA4/GTM; nuevas funciones críticas en Search Console o Ads Editor; deprecaciones de APIs; estudios de atribución/IA con muestras masivas; cambios regulatorios con impacto inmediato en tracking o subastas.

Responde ÚNICAMENTE en formato JSON con este esquema:
{
  "results": [
    {
      "id": "ID_DEL_GRUPO",
      "score": 8.5,
      "reasoning": "Breve explicación en español de 1-2 frases justificando la nota con base en su impacto para Search, Data o Paid Media."
    }
  ]
}
`;

export async function scoreTopicGroups(
  groups: GroupToScore[],
  threshold = SCORE_THRESHOLD
): Promise<ScoreOutput[]> {
  if (groups.length === 0) return [];

  const model = getGeminiModel();

  const payload = groups.map((g) => ({
    id: g.id,
    representative_title: g.representative_title,
    sources: g.sources,
    articles: g.articles.map((a) => ({
      title: a.title,
      source: a.source,
      snippet: a.body_raw ? a.body_raw.substring(0, 300) : null,
    })),
  }));

  const prompt = `${SYSTEM_SCORING_PROMPT}

Evalúa los siguientes grupos de noticias:
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
        console.warn(`  ⚠️ Gemini 503/429 (intento ${attempts}/4). Reintentando en ${attempts * 3}s...`);
        await new Promise((r) => setTimeout(r, attempts * 3000));
      } else {
        throw err;
      }
    }
  }

  if (!result) throw new Error("No se pudo obtener respuesta de Gemini tras varios reintentos");
  const responseText = result.response.text();
  
  let parsed: { results: Array<{ id: string; score: number; reasoning: string }> };
  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new Error(`Error parseando respuesta JSON de Gemini: ${responseText}`);
  }

  return parsed.results.map((res) => {
    const group = groups.find((g) => g.id === res.id);
    const score = Number(res.score);
    const status: "selected" | "rejected" = score >= threshold ? "selected" : "rejected";
    return {
      id: res.id,
      representative_title: group?.representative_title ?? "",
      score,
      reasoning: res.reasoning,
      status,
    };
  });
}

export async function loadPendingGroups(): Promise<GroupToScore[]> {
  const rows = await query<{
    id: string;
    representative_title: string;
    raw_item_id: string;
    item_title: string;
    body_raw: string | null;
    item_url: string;
    source_name: string;
  }>(`
    SELECT 
      tg.id,
      tg.representative_title,
      ri.id as raw_item_id,
      ri.title as item_title,
      ri.body_raw,
      ri.url as item_url,
      s.name as source_name
    FROM topic_groups tg
    JOIN topic_group_items tgi ON tgi.topic_group_id = tg.id
    JOIN raw_items ri ON ri.id = tgi.raw_item_id
    JOIN sources s ON s.id = ri.source_id
    WHERE tg.status = 'pending'
    ORDER BY tg.created_at DESC
  `);

  const groupMap = new Map<string, GroupToScore>();

  for (const row of rows) {
    if (!groupMap.has(row.id)) {
      groupMap.set(row.id, {
        id: row.id,
        representative_title: row.representative_title,
        sources: row.source_name,
        articles: [],
      });
    }

    const g = groupMap.get(row.id)!;
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
 * Procesa todos los grupos pendientes por lotes y guarda las notas y estados en Supabase.
 */
export async function runScoringPipeline(batchSize = 15, threshold = SCORE_THRESHOLD) {
  const pending = await loadPendingGroups();
  if (pending.length === 0) {
    return { scored: 0, selected: 0, rejected: 0, results: [] };
  }

  const allResults: ScoreOutput[] = [];

  for (let i = 0; i < pending.length; i += batchSize) {
    const batch = pending.slice(i, i + batchSize);
    console.log(`  🤖 Evaluando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(pending.length / batchSize)} (${batch.length} temas)...`);
    
    const scores = await scoreTopicGroups(batch, threshold);
    
    // Guardar notas y estado en la DB
    for (const score of scores) {
      await query(
        `UPDATE topic_groups 
         SET relevance_score = $1, status = $2 
         WHERE id = $3`,
        [score.score, score.status, score.id]
      );
    }

    allResults.push(...scores);
  }

  const selectedCount = allResults.filter((r) => r.status === "selected").length;
  const rejectedCount = allResults.filter((r) => r.status === "rejected").length;

  return {
    scored: allResults.length,
    selected: selectedCount,
    rejected: rejectedCount,
    results: allResults,
  };
}
