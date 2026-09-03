/**
 * lib/issues.ts
 * Consultas para obtener ediciones semanales y archivo histórico.
 */
import { query } from "@/lib/db";
import { IssueItemData, WeeklyIssueData } from "@/app/components/BilingualIssueView";

export interface ArchiveIssueSummary extends Record<string, unknown> {
  id: string;
  week_start_date: string | Date;
  status: string;
  items_count: number;
}

/**
 * Obtiene todas las ediciones publicadas y completas para la vista /archivo.
 */
export async function getPublishedArchiveIssues(): Promise<ArchiveIssueSummary[]> {
  const rows = await query<{
    id: string;
    week_start_date: string | Date;
    status: string;
    items_count: string | number;
  }>(`
    SELECT 
      wi.id, 
      wi.week_start_date, 
      wi.status,
      COUNT(ii.id) as items_count
    FROM weekly_issues wi
    JOIN issue_items ii ON ii.weekly_issue_id = wi.id
    WHERE wi.status = 'published'
    GROUP BY wi.id, wi.week_start_date, wi.status
    HAVING COUNT(ii.id) > 0
    ORDER BY wi.week_start_date DESC
  `);

  return rows.map((r) => ({
    id: r.id,
    week_start_date: r.week_start_date,
    status: r.status,
    items_count: Number(r.items_count),
  }));
}

/**
 * Obtiene los datos de una edición concreta (o la más reciente si no se pasa fecha).
 */
export async function getWeeklyIssueData(dateStr?: string) {
  try {
    let issue: WeeklyIssueData | null = null;

    if (dateStr) {
      // Buscar por fecha específica YYYY-MM-DD
      const issues = await query<WeeklyIssueData>(`
        SELECT id, week_start_date, status
        FROM weekly_issues
        WHERE week_start_date::date = $1::date
          AND status = 'published'
        LIMIT 1
      `, [dateStr]);

      if (issues.length > 0) {
        issue = issues[0];
      }
    } else {
      // Portada: edición más reciente (preferiblemente published, o fallback con items)
      const issues = await query<WeeklyIssueData>(`
        SELECT id, week_start_date, status
        FROM weekly_issues
        ORDER BY week_start_date DESC
        LIMIT 1
      `);

      if (issues.length > 0) {
        issue = issues[0];
      }
    }

    if (!issue) {
      return { issue: null, items: [], error: null };
    }

    const items = await query<IssueItemData>(`
      SELECT 
        ii.id,
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
        STRING_AGG(DISTINCT ri.url, '|||') as source_urls
      FROM issue_items ii
      JOIN topic_groups tg ON tg.id = ii.topic_group_id
      JOIN topic_group_items tgi ON tgi.topic_group_id = tg.id
      JOIN raw_items ri ON ri.id = tgi.raw_item_id
      JOIN sources s ON s.id = ri.source_id
      WHERE ii.weekly_issue_id = $1
      GROUP BY 
        ii.id, 
        ii.sort_order, 
        ii.headline_es, 
        ii.headline_en, 
        ii.what_happened_es, 
        ii.what_happened_en, 
        ii.why_it_matters_es, 
        ii.why_it_matters_en, 
        ii.category, 
        tg.relevance_score
      ORDER BY ii.sort_order ASC
    `, [issue.id]);

    return {
      issue,
      items,
      error: null,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ Error en getWeeklyIssueData:", errorMsg);
    return { issue: null, items: [], error: errorMsg };
  }
}
