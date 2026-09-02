import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface IssueItem extends Record<string, unknown> {
  id: string;
  sort_order: number;
  headline: string;
  implication_summary: string;
  category: string;
  relevance_score: number;
  sources: string;
  source_urls: string;
}

interface WeeklyIssue extends Record<string, unknown> {
  id: string;
  week_start_date: string;
  status: string;
}

async function getWeeklyIssueData() {
  try {
    // 1. Obtener la edición más reciente
    const issues = await query<WeeklyIssue>(`
      SELECT id, week_start_date, status
      FROM weekly_issues
      ORDER BY week_start_date DESC
      LIMIT 1
    `);

    if (issues.length === 0) {
      console.warn("⚠️ getWeeklyIssueData: No se encontraron filas en weekly_issues.");
      return { issue: null, items: [], error: null };
    }

    const currentIssue = issues[0];

    // 2. Obtener los ítems redactados de la edición
    const items = await query<IssueItem>(`
      SELECT 
        ii.id,
        ii.sort_order,
        ii.headline,
        ii.implication_summary,
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
      GROUP BY ii.id, ii.sort_order, ii.headline, ii.implication_summary, ii.category, tg.relevance_score
      ORDER BY ii.sort_order ASC
    `, [currentIssue.id]);

    console.log(`✅ getWeeklyIssueData: Cargados ${items.length} items para la edición ${currentIssue.week_start_date}`);

    return {
      issue: currentIssue,
      items,
      error: null,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ Error en getWeeklyIssueData (Supabase):", errorMsg);
    return { issue: null, items: [], error: errorMsg };
  }
}

// Map de colores y etiquetas por categoría
const CATEGORY_MAP: Record<string, { label: string; badgeClass: string }> = {
  "google-updates": {
    label: "Google Updates",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
  },
  "ai-search": {
    label: "AI Search & GEO",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-200",
  },
  "technical-seo": {
    label: "Technical SEO",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  "seo-strategy": {
    label: "SEO Strategy & Data",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
  },
  "local-ecommerce": {
    label: "Local & E-commerce",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
  },
};

export default async function Home() {
  const { issue, items, error } = await getWeeklyIssueData();

  return (
    <main className="min-h-screen bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8 font-sans text-zinc-900">
      <div className="mx-auto max-w-4xl">
        
        {/* Encabezado Editorial */}
        <header className="mb-10 pb-8 border-b border-zinc-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-900 text-white mb-3">
                <span>📰 PROJECT NEWS</span>
                <span>•</span>
                <span>EDICIÓN SEMANAL</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950">
                Resumen Semanal SEO, GEO e IA Search
              </h1>
              <p className="mt-2 text-base text-zinc-600">
                Curación automática de alta señal: las noticias y cambios más relevantes de la semana con su impacto práctico directo.
              </p>
            </div>

            {issue && (
              <div className="sm:text-right shrink-0 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Semana del
                </span>
                <span className="text-sm font-semibold text-zinc-800 block">
                  {new Date(issue.week_start_date).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-md uppercase">
                  Modo Preview ({items.length} noticias)
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Estado del Pipeline completado */}
        <section className="mb-10 p-5 rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Pipeline de Automatización — Estado
            </h2>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Pipeline Completo (Fase 1 Local)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-100 text-xs">
            <div className="flex items-center gap-1.5 text-zinc-700 font-medium">
              <span className="text-emerald-600 font-bold">✓</span> Ingesta RSS (8 fuentes)
            </div>
            <div className="flex items-center gap-1.5 text-zinc-700 font-medium">
              <span className="text-emerald-600 font-bold">✓</span> Agrupación (59 grupos)
            </div>
            <div className="flex items-center gap-1.5 text-zinc-700 font-medium">
              <span className="text-emerald-600 font-bold">✓</span> Scoring Gemini (≥ 8.0)
            </div>
            <div className="flex items-center gap-1.5 text-zinc-700 font-medium">
              <span className="text-emerald-600 font-bold">✓</span> Redacción Formato SEOFOMO
            </div>
          </div>
        </section>

        {/* Listado de Noticias de la Edición */}
        {items.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900">
                Noticias Seleccionadas ({items.length})
              </h2>
              <span className="text-xs text-zinc-500">
                Ordenadas por impacto y relevancia
              </span>
            </div>

            {items.map((item, index) => {
              const categoryConfig = CATEGORY_MAP[item.category] || {
                label: item.category,
                badgeClass: "bg-zinc-100 text-zinc-800 border-zinc-200",
              };

              const urlList = item.source_urls ? item.source_urls.split("|||") : [];

              return (
                <article
                  key={item.id}
                  className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm hover:border-zinc-300 transition-colors"
                >
                  {/* Categoría, Puntuación y Orden */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-zinc-900 text-white text-xs font-bold">
                        {index + 1}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${categoryConfig.badgeClass}`}
                      >
                        {categoryConfig.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 bg-zinc-100 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-700 border border-zinc-200">
                      <span>⭐ Relevancia:</span>
                      <span className="font-bold text-zinc-900">
                        {Number(item.relevance_score).toFixed(1)}/10
                      </span>
                    </div>
                  </div>

                  {/* Titular */}
                  <h3 className="text-xl font-bold tracking-tight text-zinc-900 mb-3">
                    {item.headline}
                  </h3>

                  {/* Resumen "Qué pasó / Qué significa" */}
                  <div className="text-sm text-zinc-700 bg-zinc-50 p-4 rounded-xl border border-zinc-100 mb-4 leading-relaxed">
                    {item.implication_summary.split("**Qué significa:**").map((part, i) => {
                      if (i === 0) {
                        return (
                          <p key={i} className="mb-2">
                            <span className="font-bold text-zinc-900">📌 Qué pasó: </span>
                            {part.replace("**Qué pasó:**", "").trim()}
                          </p>
                        );
                      }
                      return (
                        <p key={i}>
                          <span className="font-bold text-zinc-900">💡 Qué significa: </span>
                          {part.trim()}
                        </p>
                      );
                    })}
                  </div>

                  {/* Fuentes originales y enlaces */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-3 border-t border-zinc-100">
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <span className="font-medium text-zinc-700">Fuentes citadas:</span>
                      <span>{item.sources}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {urlList.map((url, uIdx) => (
                        <a
                          key={uIdx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <span>Leer original {urlList.length > 1 ? `#${uIdx + 1}` : ""}</span>
                          <span>↗</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-red-50 rounded-xl border border-red-200 text-red-700 text-sm">
            <p className="font-bold mb-1">Error al conectar con la base de datos:</p>
            <p className="font-mono text-xs text-red-600">{error}</p>
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-xl border border-zinc-200 text-zinc-500">
            No se han encontrado noticias redactadas para esta edición. Ejecuta el pipeline para generarlas.
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-xs text-zinc-400 pb-8">
          Project News · Pipeline automatizado con Gemini API, Next.js y Supabase.
        </footer>
      </div>
    </main>
  );
}
