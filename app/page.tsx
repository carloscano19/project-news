import { query } from "@/lib/db";
import BilingualIssueView, {
  type IssueItemData,
  type WeeklyIssueData,
} from "./components/BilingualIssueView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getWeeklyIssueData() {
  try {
    // 1. Obtener la edición más reciente
    const issues = await query<WeeklyIssueData>(`
      SELECT id, week_start_date, status
      FROM weekly_issues
      ORDER BY week_start_date DESC
      LIMIT 1
    `);

    if (issues.length === 0) {
      return { issue: null, items: [], error: null };
    }

    const currentIssue = issues[0];

    // 2. Obtener los ítems redactados con las columnas bilingües
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
    `, [currentIssue.id]);

    return {
      issue: currentIssue,
      items,
      error: null,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ Error en getWeeklyIssueData:", errorMsg);
    return { issue: null, items: [], error: errorMsg };
  }
}

export default async function Home() {
  const { issue, items, error } = await getWeeklyIssueData();

  return <BilingualIssueView issue={issue} items={items} error={error} />;
}
