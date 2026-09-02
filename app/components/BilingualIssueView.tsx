"use client";

import { useState, useEffect } from "react";

export interface IssueItemData extends Record<string, unknown> {
  id: string;
  sort_order: number;
  headline_es: string | null;
  headline_en: string | null;
  what_happened_es: string | null;
  what_happened_en: string | null;
  why_it_matters_es: string | null;
  why_it_matters_en: string | null;
  category: string;
  relevance_score: number;
  sources: string;
  source_urls: string;
}

export interface WeeklyIssueData extends Record<string, unknown> {
  id: string;
  week_start_date: string;
  status: string;
}

interface Props {
  issue: WeeklyIssueData | null;
  items: IssueItemData[];
  error: string | null;
}

type Lang = "es" | "en";

const UI_DICTIONARY = {
  es: {
    locale: "es-ES",
    badge: "EDICIÓN SEMANAL",
    title: "Resumen Semanal SEO, GEO e IA Search",
    subtitle:
      "Curación automática de alta señal: las noticias y cambios más relevantes de la semana con su impacto práctico directo.",
    weekOf: "Semana del",
    previewMode: (count: number) => `Modo Preview (${count} noticias)`,
    pipelineStatus: "Pipeline de Automatización — Estado",
    pipelineComplete: "Pipeline Completo (Fase 1)",
    pipelineSteps: {
      ingest: "Ingesta RSS (8 fuentes)",
      group: "Agrupación (59 grupos)",
      score: "Scoring Gemini (≥ 8.0)",
      draft: "Redacción Bilingüe",
    },
    selectedNews: (count: number) => `Noticias Seleccionadas (${count})`,
    sortedBy: "Ordenadas por impacto y relevancia",
    relevance: "Relevancia",
    whatHappened: "Qué pasó",
    whyItMatters: "Qué significa",
    sources: "Fuentes citadas",
    readOriginal: "Leer original",
    empty: "No se han encontrado noticias redactadas para esta edición.",
    errorTitle: "Error al conectar con la base de datos:",
    footer: "Project News · Pipeline automatizado con Gemini API, Next.js y Supabase.",
    categories: {
      "google-updates": "Actualizaciones de Google",
      "ai-search": "AI Search & GEO",
      "technical-seo": "SEO Técnico",
      "seo-strategy": "Estrategia SEO & Datos",
      "local-ecommerce": "Local & E-commerce",
    } as Record<string, string>,
  },
  en: {
    locale: "en-US",
    badge: "WEEKLY ISSUE",
    title: "SEO, GEO & AI Search Weekly Digest",
    subtitle:
      "High-signal automated curation: the week's most impactful news and changes with their direct practical takeaway.",
    weekOf: "Week of",
    previewMode: (count: number) => `Preview Mode (${count} stories)`,
    pipelineStatus: "Automation Pipeline — Status",
    pipelineComplete: "Pipeline Complete (Phase 1)",
    pipelineSteps: {
      ingest: "RSS Ingestion (8 sources)",
      group: "Topic Grouping (59 groups)",
      score: "Gemini Scoring (≥ 8.0)",
      draft: "Bilingual Drafting",
    },
    selectedNews: (count: number) => `Selected Stories (${count})`,
    sortedBy: "Ranked by impact and relevance",
    relevance: "Relevance",
    whatHappened: "What happened",
    whyItMatters: "Why it matters",
    sources: "Cited sources",
    readOriginal: "Read original",
    empty: "No stories found for this edition.",
    errorTitle: "Database connection error:",
    footer: "Project News · Automated pipeline with Gemini API, Next.js & Supabase.",
    categories: {
      "google-updates": "Google Updates",
      "ai-search": "AI Search & GEO",
      "technical-seo": "Technical SEO",
      "seo-strategy": "SEO Strategy & Data",
      "local-ecommerce": "Local & E-commerce",
    } as Record<string, string>,
  },
};

const CATEGORY_STYLES: Record<string, string> = {
  "google-updates": "bg-blue-100 text-blue-800 border-blue-200",
  "ai-search": "bg-purple-100 text-purple-800 border-purple-200",
  "technical-seo": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "seo-strategy": "bg-amber-100 text-amber-800 border-amber-200",
  "local-ecommerce": "bg-rose-100 text-rose-800 border-rose-200",
};

export default function BilingualIssueView({ issue, items, error }: Props) {
  const [lang, setLang] = useState<Lang>("es");
  const [mounted, setMounted] = useState(false);

  // Leer preferencia guardada al montar el componente
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("project_news_lang") as Lang | null;
    if (saved === "es" || saved === "en") {
      setLang(saved);
    }
  }, []);

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem("project_news_lang", newLang);
  };

  const t = UI_DICTIONARY[lang];

  // Formateo de fecha según locale
  const formattedDate = issue
    ? new Date(issue.week_start_date).toLocaleDateString(t.locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <main className="min-h-screen bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8 font-sans text-zinc-900">
      <div className="mx-auto max-w-4xl">
        
        {/* Encabezado Editorial con Selector de Idioma */}
        <header className="mb-10 pb-8 border-b border-zinc-200">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-900 text-white">
                  <span>📰 PROJECT NEWS</span>
                  <span>•</span>
                  <span>{t.badge}</span>
                </div>

                {/* Selector de idioma Toggle */}
                <div className="inline-flex items-center bg-zinc-200 p-0.5 rounded-lg text-xs font-bold shadow-inner">
                  <button
                    onClick={() => handleLangChange("es")}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      lang === "es"
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                    aria-label="Español"
                  >
                    🇪🇸 ES
                  </button>
                  <button
                    onClick={() => handleLangChange("en")}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      lang === "en"
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                    aria-label="English"
                  >
                    🇬🇧 EN
                  </button>
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950">
                {t.title}
              </h1>
              <p className="mt-2 text-base text-zinc-600 leading-relaxed">
                {t.subtitle}
              </p>
            </div>

            {issue && (
              <div className="sm:text-right shrink-0 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  {t.weekOf}
                </span>
                <span className="text-sm font-semibold text-zinc-800 block capitalize">
                  {formattedDate}
                </span>
                <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-md uppercase">
                  {t.previewMode(items.length)}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Estado del Pipeline */}
        <section className="mb-10 p-5 rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              {t.pipelineStatus}
            </h2>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {t.pipelineComplete}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-100 text-xs">
            <div className="flex items-center gap-1.5 text-zinc-700 font-medium">
              <span className="text-emerald-600 font-bold">✓</span> {t.pipelineSteps.ingest}
            </div>
            <div className="flex items-center gap-1.5 text-zinc-700 font-medium">
              <span className="text-emerald-600 font-bold">✓</span> {t.pipelineSteps.group}
            </div>
            <div className="flex items-center gap-1.5 text-zinc-700 font-medium">
              <span className="text-emerald-600 font-bold">✓</span> {t.pipelineSteps.score}
            </div>
            <div className="flex items-center gap-1.5 text-zinc-700 font-medium">
              <span className="text-emerald-600 font-bold">✓</span> {t.pipelineSteps.draft}
            </div>
          </div>
        </section>

        {/* Listado de Noticias de la Edición */}
        {items.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900">
                {t.selectedNews(items.length)}
              </h2>
              <span className="text-xs text-zinc-500">{t.sortedBy}</span>
            </div>

            {items.map((item, index) => {
              const categoryLabel =
                t.categories[item.category] || item.category;
              const categoryBadge =
                CATEGORY_STYLES[item.category] ||
                "bg-zinc-100 text-zinc-800 border-zinc-200";

              const headline =
                lang === "en"
                  ? item.headline_en || item.headline_es
                  : item.headline_es || item.headline_en;

              const whatHappened =
                lang === "en"
                  ? item.what_happened_en || item.what_happened_es
                  : item.what_happened_es || item.what_happened_en;

              const whyItMatters =
                lang === "en"
                  ? item.why_it_matters_en || item.why_it_matters_es
                  : item.why_it_matters_es || item.why_it_matters_en;

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
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${categoryBadge}`}
                      >
                        {categoryLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 bg-zinc-100 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-700 border border-zinc-200">
                      <span>⭐ {t.relevance}:</span>
                      <span className="font-bold text-zinc-900">
                        {Number(item.relevance_score).toFixed(1)}/10
                      </span>
                    </div>
                  </div>

                  {/* Titular */}
                  <h3 className="text-xl font-bold tracking-tight text-zinc-900 mb-3">
                    {headline}
                  </h3>

                  {/* Resumen "Qué pasó / Qué significa" estructurado */}
                  <div className="text-sm text-zinc-700 bg-zinc-50 p-4 rounded-xl border border-zinc-100 mb-4 leading-relaxed space-y-2">
                    {whatHappened && (
                      <p>
                        <span className="font-bold text-zinc-900">
                          📌 {t.whatHappened}:{" "}
                        </span>
                        {whatHappened}
                      </p>
                    )}
                    {whyItMatters && (
                      <p>
                        <span className="font-bold text-zinc-900">
                          💡 {t.whyItMatters}:{" "}
                        </span>
                        {whyItMatters}
                      </p>
                    )}
                  </div>

                  {/* Fuentes originales y enlaces */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-3 border-t border-zinc-100">
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <span className="font-medium text-zinc-700">
                        {t.sources}:
                      </span>
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
                          <span>
                            {t.readOriginal}{" "}
                            {urlList.length > 1 ? `#${uIdx + 1}` : ""}
                          </span>
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
            <p className="font-bold mb-1">{t.errorTitle}</p>
            <p className="font-mono text-xs text-red-600">{error}</p>
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-xl border border-zinc-200 text-zinc-500">
            {t.empty}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-xs text-zinc-400 pb-8">
          {t.footer}
        </footer>
      </div>
    </main>
  );
}
