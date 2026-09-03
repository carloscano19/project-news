/**
 * lib/grouping.ts
 * Paso 4: Deduplicación y agrupación de raw_items por tema.
 *
 * Estrategia MVP (sin embeddings):
 * - Agrupa ítems de la misma semana por similitud de título usando
 *   n-grams de palabras clave (bag-of-words simplificado).
 * - Dos ítems se consideran del mismo tema si comparten >= SIMILARITY_THRESHOLD
 *   de palabras clave significativas (stop words filtradas).
 * - En fases posteriores esto se puede sustituir por embeddings de Gemini.
 */
import { getPool } from "@/lib/db";
import type { PoolClient } from "pg";

// ── Configuración ──────────────────────────────────────────────
const SIMILARITY_THRESHOLD = 0.35; // Jaccard mínimo para agrupar

// Stop words en ES + EN (palabras que no aportan semántica)
const STOP_WORDS = new Set([
  // EN
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "is","are","was","were","be","been","being","have","has","had","do","does",
  "did","will","would","could","should","may","might","can","this","that",
  "these","those","it","its","as","by","from","up","about","into","through",
  "during","new","how","what","why","when","where","who","which","more",
  "their","they","he","she","we","you","your","our","his","her","all","not",
  "no","so","if","than","then","just","also","both","each","other","some",
  "such","out","said","get","use","make","like","time","first","one","two",
  "s","re","ve","ll","d","t",
  // ES
  "el","la","los","las","un","una","de","del","en","con","por","para",
  "que","se","su","sus","al","es","son","fue","era","ya","pero","como",
  "más","si","ha","han","esto","esta","estos","estas","lo","le","les",
]);

// ── Utilidades de similitud ────────────────────────────────────
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúüñ\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

// ── Tipos internos ─────────────────────────────────────────────
interface RawItemRow {
  id: string;
  title: string;
  source_name: string;
  published_at: Date | null;
}

export interface GroupingResult {
  weekIssueId: string;
  groupsCreated: number;
  itemsGrouped: number;
}

// ── Obtener o crear la weekly_issue de esta semana ─────────────
async function getOrCreateWeeklyIssue(client: PoolClient): Promise<string> {
  // Calcular el lunes de la semana actual (ISO)
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day; // días hasta el lunes
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  const weekStart = monday.toISOString().split("T")[0]; // YYYY-MM-DD

  const existing = await client.query<{ id: string }>(
    "SELECT id FROM weekly_issues WHERE week_start_date = $1",
    [weekStart]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;

  const created = await client.query<{ id: string }>(
    `INSERT INTO weekly_issues (week_start_date, status)
     VALUES ($1, 'draft') RETURNING id`,
    [weekStart]
  );
  return created.rows[0].id;
}

// ── Algoritmo de agrupación ────────────────────────────────────
function groupItems(items: RawItemRow[]): RawItemRow[][] {
  const groups: RawItemRow[][] = [];
  const tokenCache = new Map<string, Set<string>>();

  for (const item of items) {
    const tokens = tokenize(item.title);
    tokenCache.set(item.id, tokens);

    let assignedGroup = -1;

    for (let g = 0; g < groups.length; g++) {
      // Comparar con el primer ítem del grupo (representante)
      const repTokens = tokenCache.get(groups[g][0].id)!;
      const sim = jaccardSimilarity(tokens, repTokens);
      if (sim >= SIMILARITY_THRESHOLD) {
        assignedGroup = g;
        break;
      }
    }

    if (assignedGroup === -1) {
      groups.push([item]);
    } else {
      groups[assignedGroup].push(item);
    }
  }

  return groups;
}

// ── Función principal exportada ────────────────────────────────
export async function groupRawItems(): Promise<GroupingResult> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // 1. Obtener/crear la edición de esta semana
    const weekIssueId = await getOrCreateWeeklyIssue(client);

    // 2. Leer ítems de raw_items de los últimos 14 días aún no agrupados (margen de seguridad anti-retrasos)
    const { rows: items } = await client.query<RawItemRow>(
      `SELECT ri.id, ri.title, s.name AS source_name, ri.published_at
       FROM raw_items ri
       JOIN sources s ON s.id = ri.source_id
       WHERE (
           (ri.published_at IS NOT NULL AND ri.published_at >= NOW() - INTERVAL '14 days')
           OR (ri.published_at IS NULL AND ri.ingested_at >= NOW() - INTERVAL '14 days')
         )
         AND ri.id NOT IN (
           SELECT raw_item_id FROM topic_group_items
         )
       ORDER BY ri.published_at DESC NULLS LAST, ri.ingested_at DESC`
    );

    if (items.length === 0) {
      return { weekIssueId, groupsCreated: 0, itemsGrouped: 0 };
    }

    // 3. Agrupar por similitud
    const groups = groupItems(items);

    // 4. Persistir grupos en topic_groups + topic_group_items
    let groupsCreated = 0;
    let itemsGrouped = 0;

    for (const group of groups) {
      // El título del primer ítem (más reciente) es el representativo
      const representativeTitle = group[0].title;

      const { rows: [newGroup] } = await client.query<{ id: string }>(
        `INSERT INTO topic_groups (week_id, representative_title, status)
         VALUES ($1, $2, 'pending') RETURNING id`,
        [weekIssueId, representativeTitle]
      );

      for (const item of group) {
        await client.query(
          `INSERT INTO topic_group_items (topic_group_id, raw_item_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [newGroup.id, item.id]
        );
        itemsGrouped++;
      }

      groupsCreated++;
    }

    return { weekIssueId, groupsCreated, itemsGrouped };
  } finally {
    client.release();
  }
}
