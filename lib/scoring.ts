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
Eres el editor jefe y curador experto de "Project News", una newsletter técnica semanal de élite sobre SEO, GEO (Generative Engine Optimization) e IA Search.
Tienes 15 años de experiencia en el sector y tu objetivo es filtrar el ruido diario y seleccionar únicamente noticias con alta señal e impacto práctico.

Para cada grupo de noticias, debes evaluarlo con una puntuación de 0.0 a 10.0 según estos criterios:
1. **Impacto Práctico (0-10)**: ¿Afecta a rankings, tráfico, indexación, visibilidad en AI Overviews / ChatGPT Search, o estrategias de optimización?
2. **Novedad y Señal**: ¿Es una actualización de algoritmo, cambio de producto oficial, estudio con datos reales o directriz técnica? (vs especulación o recap genérico).
3. **Filtro Anti-ruido**:
   - Puntuación MUY BAJA (< 4.0): noticias corporativas no relacionadas con Search (ej. OpenAI abriendo oficina o acuerdos escolares), fallos temporales irrelevantes, posts promocionales o resúmenes diarios de foros ("Daily Search Forum Recap").
   - Puntuación MEDIA (4.0 - 6.9): artículos de opinión sin datos, tutoriales básicos ya conocidos, noticias de nicho con bajo impacto.
   - Puntuación ALTA (>= 7.0): cambios oficiales en Google/Bing/ChatGPT Search, nuevas funciones en Search Console, estudios de visibilidad en IA, cambios de directrices SEO/GEO, herramientas o datos de impacto real.

Responde ÚNICAMENTE en formato JSON con este esquema:
{
  "results": [
    {
      "id": "ID_DEL_GRUPO",
      "score": 8.5,
      "reasoning": "Breve explicación en español de 1-2 frases justificando la nota con base en su impacto para SEO/GEO."
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

  const result = await model.generateContent(prompt);
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
