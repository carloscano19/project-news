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
    brandTag: "Señal entre ruido",
    title: "Lo que importa esta semana en SEO, GEO e IA Search",
    subtitle:
      "Curación algorítmica y editorial con filtro estricto de relevancia: descartamos el ruido diario y extraemos solo los cambios con impacto práctico.",
    edition: "Edición",
    weekOf: "Semana del",
    pipelineActive: "Pipeline activo",
    pipelineSummary: (filtered: number, total: number) =>
      `${total} noticias analizadas → ${filtered} superaron el filtro de señal (≥ 8.0)`,
    leadStoryBadge: "Noticia principal",
    signalScore: "Señal",
    whatHappened: "Qué pasó",
    whyItMatters: "Qué significa",
    sources: "Fuentes citadas",
    readOriginal: "Leer fuente original",
    empty: "No hay noticias disponibles para esta edición.",
    errorTitle: "Error al conectar con la base de datos:",
    footer: "Project News · Curación automatizada de alta señal para consultores y líderes de Search.",
    categories: {
      "google-updates": "Actualizaciones de Google",
      "ai-search": "IA Search y GEO",
      "technical-seo": "SEO técnico",
      "seo-strategy": "Estrategia y datos",
      "local-ecommerce": "Local y comercio",
    } as Record<string, string>,
  },
  en: {
    locale: "en-US",
    brandTag: "Signal through noise",
    title: "What truly matters this week in SEO, GEO & AI Search",
    subtitle:
      "Algorithmic and editorial curation with a strict relevance threshold: filtering out daily noise to highlight only practical, high-impact developments.",
    edition: "Issue",
    weekOf: "Week of",
    pipelineActive: "Active pipeline",
    pipelineSummary: (filtered: number, total: number) =>
      `${total} articles analyzed → ${filtered} passed the signal threshold (≥ 8.0)`,
    leadStoryBadge: "Lead story",
    signalScore: "Signal",
    whatHappened: "What happened",
    whyItMatters: "Why it matters",
    sources: "Cited sources",
    readOriginal: "Read original source",
    empty: "No stories available for this issue.",
    errorTitle: "Database connection error:",
    footer: "Project News · High-signal automated curation for search leaders and consultants.",
    categories: {
      "google-updates": "Google updates",
      "ai-search": "AI Search & GEO",
      "technical-seo": "Technical SEO",
      "seo-strategy": "Strategy & data",
      "local-ecommerce": "Local & commerce",
    } as Record<string, string>,
  },
};

/**
 * Calcula la intensidad de color y opacidad proporcional al score (8.0 a 10.0)
 */
function getSignalIntensity(score: number) {
  const normalized = Math.max(0, Math.min(1, (score - 8.0) / (10.0 - 8.0)));
  // Opacidad entre 0.35 (en el corte 8.0) y 1.0 (en 10.0)
  const opacity = 0.35 + normalized * 0.65;
  return {
    barColor: `rgba(255, 77, 46, ${opacity.toFixed(2)})`,
    badgeBg: `rgba(255, 77, 46, ${(0.08 + normalized * 0.12).toFixed(2)})`,
    badgeText: score >= 9.0 ? "#FF4D2E" : `rgba(215, 60, 30, ${Math.max(0.75, opacity)})`,
    borderGlow: score >= 9.0 ? "shadow-[0_0_12px_rgba(255,77,46,0.25)]" : "",
    isHighSignal: score >= 9.0,
  };
}

export default function BilingualIssueView({ issue, items, error }: Props) {
  const [lang, setLang] = useState<Lang>("es");

  useEffect(() => {
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

  const formattedDate = issue
    ? new Date(issue.week_start_date).toLocaleDateString(t.locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#F5F3EE] selection:bg-[#FF4D2E] selection:text-white">
      {/* Contenedor central */}
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        
        {/* Cabecera Editorial */}
        <header className="mb-12">
          {/* Top Bar: Brand + Idioma */}
          <div className="flex items-center justify-between pb-6 border-b border-[#1F242C]">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-[#FF4D2E]" />
              <span className="font-medium tracking-tight text-sm text-[#F5F3EE]">
                Project News
              </span>
              <span className="text-xs text-[#7C8591]">/</span>
              <span className="text-xs text-[#7C8591]">{t.brandTag}</span>
            </div>

            {/* Selector de idioma ES / EN */}
            <div className="inline-flex items-center rounded-lg bg-[#181C22] p-1 border border-[#242A34] text-xs font-semibold">
              <button
                onClick={() => handleLangChange("es")}
                className={`px-3 py-1 rounded-md transition-all ${
                  lang === "es"
                    ? "bg-[#252C37] text-white shadow-sm font-bold"
                    : "text-[#7C8591] hover:text-[#F5F3EE]"
                }`}
                aria-label="Español"
              >
                ES
              </button>
              <button
                onClick={() => handleLangChange("en")}
                className={`px-3 py-1 rounded-md transition-all ${
                  lang === "en"
                    ? "bg-[#252C37] text-white shadow-sm font-bold"
                    : "text-[#7C8591] hover:text-[#F5F3EE]"
                }`}
                aria-label="English"
              >
                EN
              </button>
            </div>
          </div>

          {/* Título y subtítulo */}
          <div className="mt-8">
            <h1 className="font-editorial text-4xl sm:text-5xl lg:text-[54px] font-normal tracking-tight text-[#F5F3EE] leading-[1.15]">
              {t.title}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-[#7C8591] max-w-3xl leading-relaxed">
              {t.subtitle}
            </p>
          </div>

          {/* Barra de Estado y Metadatos de la Edición */}
          {issue && (
            <div className="mt-8 pt-4 pb-4 border-y border-[#1F242C] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#7C8591]">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#F5F3EE]">
                  {t.weekOf} {formattedDate}
                </span>
                <span>·</span>
                <span>
                  {items.length} {lang === "es" ? "noticias seleccionadas" : "selected stories"}
                </span>
              </div>

              {/* Indicador sutil de pipeline */}
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2ECC71]" />
                <span>
                  {t.pipelineSummary(items.length, 63)}
                </span>
              </div>
            </div>
          )}
        </header>

        {/* Listado de Noticias */}
        {items.length > 0 ? (
          <div className="space-y-6">
            {items.map((item, index) => {
              const isLead = index === 0;
              const intensity = getSignalIntensity(item.relevance_score);

              const categoryLabel =
                t.categories[item.category] || item.category;

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
                  className={`relative rounded-2xl transition-all overflow-hidden ${
                    isLead
                      ? "bg-[#FAF8F5] p-7 sm:p-9 text-[#121417] shadow-xl border border-white/10"
                      : "bg-[#F5F3EE] p-6 sm:p-8 text-[#121417] shadow-md border border-[#E6E2D8]"
                  }`}
                >
                  {/* Barra lateral de intensidad de señal */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5"
                    style={{ backgroundColor: intensity.barColor }}
                  />

                  {/* Header de la tarjeta: Categoría + Score */}
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-[#7C8591] tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-xs text-[#7C8591]">·</span>
                      <span className="text-xs font-semibold text-[#555E68]">
                        {categoryLabel}
                      </span>
                      {isLead && (
                        <span className="text-[11px] font-medium bg-[#121417] text-[#FAF8F5] px-2 py-0.5 rounded-full ml-1">
                          {t.leadStoryBadge}
                        </span>
                      )}
                    </div>

                    {/* Badge de Señal con intensidad */}
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${intensity.borderGlow}`}
                      style={{
                        backgroundColor: intensity.badgeBg,
                        color: intensity.badgeText,
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: intensity.barColor }}
                      />
                      <span>{Number(item.relevance_score).toFixed(1)}</span>
                      <span className="font-normal text-[10px] opacity-80">
                        {t.signalScore}
                      </span>
                    </div>
                  </div>

                  {/* Titular en serif editorial */}
                  <h2
                    className={`font-editorial font-normal tracking-tight text-[#121417] leading-[1.25] mb-5 ${
                      isLead
                        ? "text-2xl sm:text-3xl lg:text-[32px]"
                        : "text-xl sm:text-2xl"
                    }`}
                  >
                    {headline}
                  </h2>

                  {/* Bloque estructurado "Qué pasó / Qué significa" */}
                  <div className="bg-[#ECE8DF] rounded-xl p-5 mb-5 space-y-3 text-[14px] leading-relaxed text-[#2D333B]">
                    {whatHappened && (
                      <div>
                        <span className="font-bold text-[#121417] block mb-0.5">
                          {t.whatHappened}
                        </span>
                        <p className="text-[#3A4048]">{whatHappened}</p>
                      </div>
                    )}
                    {whyItMatters && (
                      <div className="pt-2 border-t border-[#DFD9CD]">
                        <span className="font-bold text-[#121417] block mb-0.5">
                          {t.whyItMatters}
                        </span>
                        <p className="text-[#3A4048]">{whyItMatters}</p>
                      </div>
                    )}
                  </div>

                  {/* Pie de tarjeta: Fuentes y enlace original */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#555E68] pt-2 border-t border-[#E5E0D5]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#7C8591]">{t.sources}:</span>
                      <span className="font-medium text-[#121417]">
                        {item.sources}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {urlList.map((url, uIdx) => (
                        <a
                          key={uIdx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-[#121417] hover:text-[#FF4D2E] transition-colors underline underline-offset-4 decoration-[#DFD9CD] hover:decoration-[#FF4D2E]"
                        >
                          <span>
                            {t.readOriginal}
                            {urlList.length > 1 ? ` #${uIdx + 1}` : ""}
                          </span>
                          <span className="text-[10px]">↗</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-[#181C22] rounded-2xl border border-red-900/40 text-red-400 text-sm">
            <p className="font-bold mb-1">{t.errorTitle}</p>
            <p className="font-mono text-xs text-red-300">{error}</p>
          </div>
        ) : (
          <div className="p-12 text-center bg-[#181C22] rounded-2xl border border-[#242A34] text-[#7C8591]">
            {t.empty}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-xs text-[#7C8591] pb-10 border-t border-[#1F242C] pt-8">
          <p>{t.footer}</p>
        </footer>
      </div>
    </div>
  );
}
