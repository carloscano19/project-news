"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

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
  backLink?: {
    href: string;
    label_es: string;
    label_en: string;
  };
}

type Lang = "es" | "en";

// Configuración de colores y estilos por categoría
const CATEGORY_CONFIG: Record<
  string,
  {
    color: string;
    borderTop: string;
    chipBg: string;
    chipText: string;
    activeChipStyle: { backgroundColor: string; color: string; borderColor: string };
  }
> = {
  "google-updates": {
    color: "#4A7BC8", // Azul Google Updates
    borderTop: "#4A7BC8",
    chipBg: "rgba(74, 123, 200, 0.12)",
    chipText: "#3A67AF",
    activeChipStyle: {
      backgroundColor: "#4A7BC8",
      color: "#FFFFFF",
      borderColor: "#4A7BC8",
    },
  },
  "ai-search": {
    color: "#FF4D2E", // Naranja Señal Core
    borderTop: "#FF4D2E",
    chipBg: "rgba(255, 77, 46, 0.12)",
    chipText: "#D93A1E",
    activeChipStyle: {
      backgroundColor: "#FF4D2E",
      color: "#FFFFFF",
      borderColor: "#FF4D2E",
    },
  },
  "technical-seo": {
    color: "#2E9B85", // Verde azulado técnico
    borderTop: "#2E9B85",
    chipBg: "rgba(46, 155, 133, 0.12)",
    chipText: "#227C6A",
    activeChipStyle: {
      backgroundColor: "#2E9B85",
      color: "#FFFFFF",
      borderColor: "#2E9B85",
    },
  },
  "seo-strategy": {
    color: "#8B6FC7", // Púrpura estrategia
    borderTop: "#8B6FC7",
    chipBg: "rgba(139, 111, 199, 0.12)",
    chipText: "#7357AE",
    activeChipStyle: {
      backgroundColor: "#8B6FC7",
      color: "#FFFFFF",
      borderColor: "#8B6FC7",
    },
  },
  "local-ecommerce": {
    color: "#D9943B", // Ámbar comercio local
    borderTop: "#D9943B",
    chipBg: "rgba(217, 148, 59, 0.12)",
    chipText: "#B37525",
    activeChipStyle: {
      backgroundColor: "#D9943B",
      color: "#FFFFFF",
      borderColor: "#D9943B",
    },
  },
};

const UI_DICTIONARY = {
  es: {
    locale: "es-ES",
    brandTag: "Señal entre ruido",
    title: "Lo que importa esta semana en SEO, GEO e IA Search",
    subtitle:
      "Curación algorítmica y editorial con filtro estricto de relevancia: descartamos el ruido diario y extraemos solo los cambios con impacto práctico.",
    weekOf: "Semana del",
    pipelineSummary: (filtered: number, total: number) =>
      `${total} noticias analizadas → ${filtered} superaron el filtro de señal (≥ 8.0)`,
    allFilter: "Todas",
    leadStoryBadge: "Noticia principal",
    signalScore: "Señal",
    whatHappened: "Qué pasó",
    whyItMatters: "Qué significa",
    sources: "Fuentes citadas",
    readOriginal: "Leer original",
    downloadInfographic: "Descargar infografía",
    downloading: "Generando...",
    archiveLink: "Ediciones anteriores",
    archiveFooterText: "Ver archivo histórico de ediciones",
    showingCount: (current: number, total: number) =>
      `Mostrando ${current} de ${total} noticias`,
    empty: "No hay noticias disponibles para esta categoría.",
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
    weekOf: "Week of",
    pipelineSummary: (filtered: number, total: number) =>
      `${total} articles analyzed → ${filtered} passed the signal threshold (≥ 8.0)`,
    allFilter: "All",
    leadStoryBadge: "Lead story",
    signalScore: "Signal",
    whatHappened: "What happened",
    whyItMatters: "Why it matters",
    sources: "Cited sources",
    readOriginal: "Read original",
    downloadInfographic: "Download infographic",
    downloading: "Generating...",
    archiveLink: "Past issues",
    archiveFooterText: "View historical archive of past editions",
    showingCount: (current: number, total: number) =>
      `Showing ${current} of ${total} stories`,
    empty: "No stories available for this category.",
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
  const opacity = 0.35 + normalized * 0.65;
  return {
    barColor: `rgba(255, 77, 46, ${opacity.toFixed(2)})`,
    badgeBg: `rgba(255, 77, 46, ${(0.08 + normalized * 0.12).toFixed(2)})`,
    badgeText: score >= 9.0 ? "#FF4D2E" : `rgba(215, 60, 30, ${Math.max(0.75, opacity)})`,
    borderGlow: score >= 9.0 ? "shadow-[0_0_12px_rgba(255,77,46,0.25)]" : "",
  };
}

export default function BilingualIssueView({ issue, items, error, backLink }: Props) {
  const [lang, setLang] = useState<Lang>("es");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

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

  // Conteo de noticias por categoría
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [items]);

  // Lista única de categorías presentes en los datos
  const availableCategories = useMemo(() => {
    return Object.keys(categoryCounts);
  }, [categoryCounts]);

  // Filtrado reactivo de items
  const filteredItems = useMemo(() => {
    if (selectedCategory === "all") return items;
    return items.filter((item) => item.category === selectedCategory);
  }, [items, selectedCategory]);

  const formattedDate = issue
    ? new Date(issue.week_start_date).toLocaleDateString(t.locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  // Si el filtro es "all", el primer item es el Lead Hero
  const showHero = selectedCategory === "all" && filteredItems.length > 0;
  const leadItem = showHero ? filteredItems[0] : null;
  const gridItems = showHero ? filteredItems.slice(1) : filteredItems;

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#F5F3EE] selection:bg-[#FF4D2E] selection:text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        
        {/* Cabecera Editorial */}
        <header className="mb-10">
          {/* Top Bar: Brand + Idioma */}
          <div className="flex items-center justify-between pb-6 border-b border-[#1F242C]">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-[#FF4D2E]" />
              <Link
                href="/"
                className="font-medium tracking-tight text-sm text-[#F5F3EE] hover:text-[#FF4D2E] transition-colors"
              >
                Project News
              </Link>
              <span className="text-xs text-[#7C8591]">/</span>
              <span className="text-xs text-[#7C8591]">{t.brandTag}</span>
            </div>

            {/* Acciones Top: Enlace Archivo/Back + Descarga + Idioma */}
            <div className="flex items-center gap-3">
              {/* Enlace al archivo o de retorno */}
              {backLink ? (
                <Link
                  href={backLink.href}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181C22] border border-[#242A34] text-xs font-semibold text-[#F5F3EE] hover:bg-[#252C37] hover:border-[#38414E] transition-all shadow-sm"
                >
                  <span>{lang === "es" ? backLink.label_es : backLink.label_en}</span>
                </Link>
              ) : (
                <Link
                  href="/archivo"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181C22] border border-[#242A34] text-xs font-semibold text-[#F5F3EE] hover:bg-[#252C37] hover:border-[#38414E] transition-all shadow-sm"
                  title={t.archiveLink}
                >
                  <span className="text-xs">📚</span>
                  <span className="hidden sm:inline">{t.archiveLink}</span>
                </Link>
              )}

              {/* Botón de descarga de infografía */}
              <a
                href={`/api/infographic?lang=${lang}&v=5`}
                download={`project-news-infographic-${lang}.png`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181C22] border border-[#242A34] text-xs font-semibold text-[#F5F3EE] hover:bg-[#252C37] hover:border-[#38414E] transition-all shadow-sm group"
                title={t.downloadInfographic}
              >
                <span className="text-sm transition-transform group-hover:-translate-y-0.5">📥</span>
                <span className="hidden md:inline">{t.downloadInfographic}</span>
              </a>

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

          {/* Barra de Metadatos y Pipeline */}
          {issue && (
            <div className="mt-8 pt-4 pb-4 border-y border-[#1F242C] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#7C8591]">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#F5F3EE]">
                  {t.weekOf} {formattedDate}
                </span>
                <span>·</span>
                <span>
                  {items.length} {lang === "es" ? "noticias filtradas" : "filtered stories"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2ECC71]" />
                <span>{t.pipelineSummary(items.length, 63)}</span>
              </div>
            </div>
          )}

          {/* Chips de Filtrado por Categoría */}
          {items.length > 0 && (
            <nav className="mt-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none" aria-label="Filtro de categorías">
              {/* Chip "Todas" */}
              <button
                onClick={() => setSelectedCategory("all")}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border shrink-0 ${
                  selectedCategory === "all"
                    ? "bg-[#F5F3EE] text-[#121417] border-[#F5F3EE] shadow-sm font-bold"
                    : "bg-[#181C22] text-[#7C8591] border-[#242A34] hover:text-[#F5F3EE] hover:border-[#38414E]"
                }`}
              >
                <span>{t.allFilter}</span>
                <span className="text-[11px] opacity-75 font-normal">
                  ({items.length})
                </span>
              </button>

              {/* Chips por categoría con color activo dinámico */}
              {availableCategories.map((catKey) => {
                const isSelected = selectedCategory === catKey;
                const config = CATEGORY_CONFIG[catKey] || {
                  color: "#7C8591",
                  borderTop: "#7C8591",
                  chipBg: "rgba(124, 133, 145, 0.12)",
                  chipText: "#7C8591",
                  activeChipStyle: {
                    backgroundColor: "#F5F3EE",
                    color: "#121417",
                    borderColor: "#F5F3EE",
                  },
                };
                const label = t.categories[catKey] || catKey;
                const count = categoryCounts[catKey] || 0;

                return (
                  <button
                    key={catKey}
                    onClick={() => setSelectedCategory(catKey)}
                    style={
                      isSelected
                        ? config.activeChipStyle
                        : undefined
                    }
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border shrink-0 ${
                      isSelected
                        ? "shadow-sm font-bold"
                        : "bg-[#181C22] text-[#7C8591] border-[#242A34] hover:text-[#F5F3EE] hover:border-[#38414E]"
                    }`}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: isSelected ? "#FFFFFF" : config.color,
                      }}
                    />
                    <span>{label}</span>
                    <span className="text-[11px] opacity-75 font-normal">
                      ({count})
                    </span>
                  </button>
                );
              })}
            </nav>
          )}
        </header>

        {/* Listado de Contenido */}
        {filteredItems.length > 0 ? (
          <div className="space-y-8">
            
            {/* HERO STORY (#1) — Solo visible cuando estamos en "Todas" */}
            {leadItem && (
              (() => {
                const config = CATEGORY_CONFIG[leadItem.category] || {
                  color: "#FF4D2E",
                  borderTop: "#FF4D2E",
                  chipBg: "rgba(255, 77, 46, 0.12)",
                  chipText: "#D93A1E",
                };
                const intensity = getSignalIntensity(leadItem.relevance_score);
                const categoryLabel = t.categories[leadItem.category] || leadItem.category;
                const headline = lang === "en" ? leadItem.headline_en || leadItem.headline_es : leadItem.headline_es || leadItem.headline_en;
                const whatHappened = lang === "en" ? leadItem.what_happened_en || leadItem.what_happened_es : leadItem.what_happened_es || leadItem.what_happened_en;
                const whyItMatters = lang === "en" ? leadItem.why_it_matters_en || leadItem.why_it_matters_es : leadItem.why_it_matters_es || leadItem.why_it_matters_en;
                const urlList = leadItem.source_urls ? leadItem.source_urls.split("|||") : [];

                return (
                  <article className="relative rounded-2xl bg-[#FAF8F5] p-7 sm:p-9 text-[#121417] shadow-xl border border-white/10 overflow-hidden">
                    {/* Borde superior de categoría */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{ backgroundColor: config.borderTop }}
                    />

                    {/* Header de la tarjeta Hero */}
                    <div className="flex items-center justify-between gap-3 mb-4 pt-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-bold text-[#7C8591] tabular-nums">
                          01
                        </span>
                        <span className="text-xs text-[#7C8591]">·</span>
                        <span
                          className="text-xs font-semibold px-2.5 py-0.5 rounded-md"
                          style={{
                            backgroundColor: config.chipBg,
                            color: config.chipText,
                          }}
                        >
                          {categoryLabel}
                        </span>
                        <span className="text-[11px] font-medium bg-[#121417] text-[#FAF8F5] px-2 py-0.5 rounded-full">
                          {t.leadStoryBadge}
                        </span>
                      </div>

                      {/* Badge Señal */}
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${intensity.borderGlow}`}
                        style={{
                          backgroundColor: intensity.badgeBg,
                          color: intensity.badgeText,
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: intensity.barColor }}
                        />
                        <span>{Number(leadItem.relevance_score).toFixed(1)}</span>
                        <span className="font-normal text-[10px] opacity-80">
                          {t.signalScore}
                        </span>
                      </div>
                    </div>

                    {/* Titular Hero */}
                    <h2 className="font-editorial font-normal tracking-tight text-[#121417] text-2xl sm:text-3xl lg:text-[34px] leading-[1.2] mb-5">
                      {headline}
                    </h2>

                    {/* Bloque Qué pasó / Qué significa */}
                    <div className="bg-[#ECE8DF] rounded-xl p-5 mb-5 space-y-3 text-[15px] leading-relaxed text-[#2D333B]">
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

                    {/* Pie Hero: Fuentes y enlace */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#555E68] pt-2 border-t border-[#E5E0D5]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#7C8591]">{t.sources}:</span>
                        <span className="font-medium text-[#121417]">
                          {leadItem.sources}
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
              })()
            )}

            {/* GRID RESPONSIVE (1 col móvil, 2 cols tablet, 3 cols desktop) */}
            {gridItems.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gridItems.map((item, idx) => {
                  const globalIndex = showHero ? idx + 2 : idx + 1;
                  const config = CATEGORY_CONFIG[item.category] || {
                    color: "#7C8591",
                    borderTop: "#7C8591",
                    chipBg: "rgba(124, 133, 145, 0.12)",
                    chipText: "#7C8591",
                  };
                  const intensity = getSignalIntensity(item.relevance_score);
                  const categoryLabel = t.categories[item.category] || item.category;
                  const headline = lang === "en" ? item.headline_en || item.headline_es : item.headline_es || item.headline_en;
                  const whatHappened = lang === "en" ? item.what_happened_en || item.what_happened_es : item.what_happened_es || item.what_happened_en;
                  const whyItMatters = lang === "en" ? item.why_it_matters_en || item.why_it_matters_es : item.why_it_matters_es || item.why_it_matters_en;
                  const urlList = item.source_urls ? item.source_urls.split("|||") : [];

                  return (
                    <article
                      key={item.id}
                      className="relative rounded-2xl bg-[#F5F3EE] p-5 sm:p-6 text-[#121417] shadow-md border border-[#E6E2D8] flex flex-col justify-between overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      {/* Borde superior de categoría de 3px */}
                      <div
                        className="absolute top-0 left-0 right-0 h-[3px]"
                        style={{ backgroundColor: config.borderTop }}
                      />

                      {/* Contenido Principal */}
                      <div>
                        {/* Header de la tarjeta */}
                        <div className="flex items-center justify-between gap-2 mb-3 pt-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#7C8591] tabular-nums">
                              {String(globalIndex).padStart(2, "0")}
                            </span>
                            <span
                              className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                              style={{
                                backgroundColor: config.chipBg,
                                color: config.chipText,
                              }}
                            >
                              {categoryLabel}
                            </span>
                          </div>

                          {/* Badge de Señal */}
                          <div
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold shrink-0"
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
                          </div>
                        </div>

                        {/* Titular */}
                        <h3 className="font-editorial font-normal tracking-tight text-[#121417] text-lg sm:text-xl leading-[1.25] mb-4">
                          {headline}
                        </h3>

                        {/* Bloque Qué pasó / Qué significa compacto */}
                        <div className="bg-[#ECE8DF] rounded-xl p-3.5 mb-4 space-y-2.5 text-[13px] leading-relaxed text-[#2D333B]">
                          {whatHappened && (
                            <div>
                              <span className="font-bold text-[#121417] text-xs block mb-0.5">
                                {t.whatHappened}
                              </span>
                              <p className="text-[#3A4048]">{whatHappened}</p>
                            </div>
                          )}
                          {whyItMatters && (
                            <div className="pt-2 border-t border-[#DFD9CD]">
                              <span className="font-bold text-[#121417] text-xs block mb-0.5">
                                {t.whyItMatters}
                              </span>
                              <p className="text-[#3A4048]">{whyItMatters}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Pie de tarjeta: Fuentes y enlace original */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#555E68] pt-2 border-t border-[#E5E0D5] mt-auto">
                        <span className="text-[#7C8591] truncate max-w-[60%]">
                          {item.sources}
                        </span>

                        <div className="flex items-center gap-2 shrink-0">
                          {urlList.map((url, uIdx) => (
                            <a
                              key={uIdx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 font-medium text-[#121417] hover:text-[#FF4D2E] transition-colors underline underline-offset-4 decoration-[#DFD9CD] hover:decoration-[#FF4D2E]"
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
            )}
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
        <footer className="mt-16 text-center text-xs text-[#7C8591] pb-10 border-t border-[#1F242C] pt-8 space-y-3">
          <p>{t.footer}</p>
          <div>
            <Link
              href="/archivo"
              className="inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-[#FF4D2E] transition-colors underline underline-offset-4 decoration-[#28303C] hover:decoration-[#FF4D2E]"
            >
              <span>{t.archiveFooterText}</span>
              <span className="text-[10px]">↗</span>
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
