"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArchiveIssueSummary } from "@/lib/issues";

type Lang = "es" | "en";

interface Props {
  issues: ArchiveIssueSummary[];
}

const UI_DICTIONARY = {
  es: {
    locale: "es-ES",
    brandTag: "Señal entre ruido",
    archiveTitle: "Archivo de Ediciones",
    archiveSubtitle:
      "Histórico completo de ediciones semanales filtradas y curadas en Search, IA, Data y Paid Media. Consulta las noticias de semanas anteriores.",
    currentIssueLink: "Edición actual",
    weekOf: "Semana del",
    storiesCount: (n: number) => `${n} ${n === 1 ? "noticia filtrada" : "noticias filtradas"}`,
    published: "Publicada",
    viewIssue: "Ver edición completa",
    empty: "No hay ediciones archivadas disponibles en este momento.",
    footer: "Project News · Archivo histórico de curación automatizada sobre Search, IA, Data y Paid Media.",
  },
  en: {
    locale: "en-US",
    brandTag: "Signal through noise",
    archiveTitle: "Issue Archive",
    archiveSubtitle:
      "Complete historical record of filtered and curated weekly issues in Search, AI, Data & Paid Media. Browse past editions.",
    currentIssueLink: "Current issue",
    weekOf: "Week of",
    storiesCount: (n: number) => `${n} ${n === 1 ? "curated story" : "curated stories"}`,
    published: "Published",
    viewIssue: "View full issue",
    empty: "No archived issues available at this time.",
    footer: "Project News · Historical archive of automated curation for Search, AI, Data and Paid Media.",
  },
};

export default function ArchiveView({ issues }: Props) {
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

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#F5F3EE] selection:bg-[#FF4D2E] selection:text-white">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Cabecera */}
        <header className="mb-12">
          {/* Top Bar */}
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

            <div className="flex items-center gap-3">
              {/* Enlace a Edición Actual */}
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181C22] border border-[#242A34] text-xs font-semibold text-[#F5F3EE] hover:bg-[#252C37] hover:border-[#38414E] transition-all shadow-sm"
              >
                <span>←</span>
                <span>{t.currentIssueLink}</span>
              </Link>

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

          {/* Título de la sección */}
          <div className="mt-8">
            <h1 className="font-editorial text-4xl sm:text-5xl font-normal tracking-tight text-[#F5F3EE] leading-[1.15]">
              {t.archiveTitle}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-[#7C8591] max-w-2xl leading-relaxed">
              {t.archiveSubtitle}
            </p>
          </div>
        </header>

        {/* Listado de Ediciones */}
        {issues.length > 0 ? (
          <div className="space-y-4">
            {issues.map((iss, idx) => {
              const dateObj = new Date(iss.week_start_date);
              const dateIso = !isNaN(dateObj.getTime())
                ? dateObj.toISOString().split("T")[0]
                : String(iss.week_start_date).slice(0, 10);

              const formattedDate = !isNaN(dateObj.getTime())
                ? dateObj.toLocaleDateString(t.locale, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : dateIso;

              return (
                <article
                  key={iss.id}
                  className="rounded-2xl bg-[#F5F3EE] p-6 sm:p-7 text-[#121417] shadow-md border border-[#E6E2D8] hover:shadow-lg transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs font-bold text-[#7C8591] tabular-nums">
                        #{String(issues.length - idx).padStart(2, "0")}
                      </span>
                      <span className="text-xs text-[#7C8591]">·</span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E4F4EC] text-[#1E7E4B]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#2ECC71]" />
                        <span>{t.published}</span>
                      </span>
                      <span className="text-xs text-[#7C8591]">·</span>
                      <span className="text-xs font-medium text-[#555E68]">
                        {t.storiesCount(iss.items_count)}
                      </span>
                    </div>

                    <h2 className="font-editorial text-2xl sm:text-3xl font-normal text-[#121417]">
                      {t.weekOf} {formattedDate}
                    </h2>
                  </div>

                  {/* Botón hacia la edición */}
                  <Link
                    href={`/edicion/${dateIso}`}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#121417] text-[#FAF8F5] text-sm font-bold hover:bg-[#FF4D2E] transition-colors shrink-0 shadow-sm"
                  >
                    <span>{t.viewIssue}</span>
                    <span className="text-xs">↗</span>
                  </Link>
                </article>
              );
            })}
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
