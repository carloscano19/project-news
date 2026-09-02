/**
 * app/api/infographic/route.tsx
 *
 * Genera una infografía vertical 1080×1350 px en PNG descargable,
 * con los top-6 titulares de la edición actual.
 *
 * Stack: satori (JSX → SVG) + @resvg/resvg-js (SVG → PNG)
 * Ambas librerías corren en Node.js runtime (no Edge), lo que permite
 * leer fuentes desde el filesystem y acceder a la BD con pg.
 *
 * Soporta ?lang=es|en (por defecto "es").
 */
import { NextRequest, NextResponse } from "next/server";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { createElement as h } from "react";
import fs from "fs";
import path from "path";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
// Forzar Node.js runtime para acceder al filesystem y pg sin restricciones
export const runtime = "nodejs";

/* ───── Tipos ────────────────────────────────────────────────────── */
interface TopItemRow extends Record<string, unknown> {
  sort_order: number;
  headline_es: string | null;
  headline_en: string | null;
  category: string;
  relevance_score: string | number;
  sources: string;
}
interface IssueRow extends Record<string, unknown> {
  id: string;
  week_start_date: string;
}

/* ───── Colores & etiquetas por categoría ────────────────────────── */
const CATS: Record<
  string,
  { label_es: string; label_en: string; color: string; chipBg: string; chipText: string }
> = {
  "google-updates":  { label_es: "Google Updates",    label_en: "Google Updates",    color: "#4A7BC8", chipBg: "rgba(74,123,200,0.15)",   chipText: "#3A67AF" },
  "ai-search":       { label_es: "IA Search & GEO",   label_en: "AI Search & GEO",   color: "#FF4D2E", chipBg: "rgba(255,77,46,0.15)",    chipText: "#D93A1E" },
  "technical-seo":   { label_es: "SEO Técnico",       label_en: "Technical SEO",      color: "#2E9B85", chipBg: "rgba(46,155,133,0.15)",   chipText: "#227C6A" },
  "seo-strategy":    { label_es: "Estrategia & Datos", label_en: "Strategy & Data",   color: "#8B6FC7", chipBg: "rgba(139,111,199,0.15)",  chipText: "#7357AE" },
  "local-ecommerce": { label_es: "Local & Comercio",  label_en: "Local & Commerce",   color: "#D9943B", chipBg: "rgba(217,148,59,0.15)",   chipText: "#B37525" },
};
const CAT_DEFAULT = { label_es: "Noticia", label_en: "Story", color: "#FF4D2E", chipBg: "rgba(255,77,46,0.15)", chipText: "#D93A1E" };

/* ───── Carga de fuentes (una vez, desde /public/fonts/) ─────────── */
function loadFonts() {
  const base = path.join(process.cwd(), "public", "fonts");
  return {
    regular: fs.readFileSync(path.join(base, "inter-400.woff")),
    bold: fs.readFileSync(path.join(base, "inter-700.woff")),
  };
}

/* ───── GET /api/infographic?lang=es|en ──────────────────────────── */
export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("lang") === "en" ? "en" : "es";

  try {
    /* 1 · Obtener la edición más reciente */
    const issues = await query<IssueRow>(
      "SELECT id, week_start_date FROM weekly_issues ORDER BY week_start_date DESC LIMIT 1"
    );
    if (!issues.length) return NextResponse.json({ error: "No issues found" }, { status: 404 });

    const currentIssue = issues[0];

    /* 2 · Top 6 noticias */
    const items = await query<TopItemRow>(
      `SELECT
        ii.sort_order,
        ii.headline_es,
        ii.headline_en,
        ii.category,
        tg.relevance_score,
        STRING_AGG(DISTINCT s.name, ', ') AS sources
       FROM issue_items ii
       JOIN topic_groups tg      ON tg.id = ii.topic_group_id
       JOIN topic_group_items tgi ON tgi.topic_group_id = tg.id
       JOIN raw_items ri          ON ri.id = tgi.raw_item_id
       JOIN sources s             ON s.id = ri.source_id
       WHERE ii.weekly_issue_id = $1
       GROUP BY ii.id, ii.sort_order, ii.headline_es, ii.headline_en, ii.category, tg.relevance_score
       ORDER BY ii.sort_order ASC
       LIMIT 6`,
      [currentIssue.id]
    );

    /* 3 · Textos según idioma */
    const dateStr = new Date(currentIssue.week_start_date).toLocaleDateString(
      lang === "es" ? "es-ES" : "en-US",
      { day: "numeric", month: "long", year: "numeric" }
    );
    const T = {
      badge:      lang === "es" ? "EDICIÓN SEMANAL"  : "WEEKLY ISSUE",
      sub:        lang === "es" ? "Señal entre ruido" : "Signal through noise",
      title1:     lang === "es" ? "Lo que importa esta semana en" : "What truly matters this week in",
      title2:     "SEO, GEO e IA Search",
      dateLabel:  lang === "es" ? `Semana del ${dateStr}` : `Week of ${dateStr}`,
      filterNote: lang === "es" ? "Filtro de señal (≥ 8.0)" : "Signal filter (≥ 8.0)",
      score:      lang === "es" ? "Señal" : "Signal",
      footerN:    lang === "es" ? "13 noticias analizadas en la edición" : "13 stories curated this issue",
      cta:        "project-news-lac.vercel.app ↗",
    };

    /* 4 · Helpers de layout */
    const W = 1080, H = 1350;
    const CARD_W = 468, CARD_H = 254;

    // Shorthand estilo para uso repetido
    const flex = (extra: Record<string, unknown> = {}) => ({ display: "flex", ...extra });

    /* 5 · Construir nodos satori para el grid 2×3 */
    const gridCards = items.map((item, idx) => {
      const cat    = CATS[item.category] ?? CAT_DEFAULT;
      const label  = lang === "es" ? cat.label_es : cat.label_en;
      const title  = (lang === "en" ? (item.headline_en || item.headline_es) : (item.headline_es || item.headline_en)) ?? "";
      const score  = Number(item.relevance_score).toFixed(1);
      const src    = item.sources.length > 36 ? item.sources.slice(0, 34) + "…" : item.sources;

      return h("div", {
        key: idx,
        style: flex({
          flexDirection: "column",
          justifyContent: "space-between",
          width: CARD_W,
          height: CARD_H,
          backgroundColor: "#F5F3EE",
          borderRadius: 18,
          padding: "18px 22px 16px",
          borderTop: `6px solid ${cat.color}`,
          overflow: "hidden",
        }),
      },
        /* ── Header tarjeta: número + categoría + score ── */
        h("div", { style: flex({ alignItems: "center", justifyContent: "space-between" }) },
          h("div", { style: flex({ alignItems: "center" }) },
            /* Círculo con número */
            h("div", {
              style: flex({
                width: 34, height: 34, borderRadius: 17,
                backgroundColor: cat.color,
                alignItems: "center", justifyContent: "center",
                color: "#FFFFFF", fontSize: 17, fontWeight: 700,
                marginRight: 10, flexShrink: 0,
              }),
            }, String(idx + 1)),
            /* Chip de categoría */
            h("div", {
              style: {
                padding: "4px 10px", borderRadius: 7,
                backgroundColor: cat.chipBg,
                color: cat.chipText,
                fontSize: 13, fontWeight: 700,
              },
            }, label),
          ),
          /* Badge score */
          h("div", {
            style: {
              padding: "3px 10px", borderRadius: 12,
              backgroundColor: "rgba(255,77,46,0.12)",
              color: "#D93A1E",
              fontSize: 13, fontWeight: 700,
            },
          }, `${score} ${T.score}`),
        ),

        /* ── Titular ── */
        h("div", {
          style: {
            fontSize: 19, fontWeight: 700,
            color: "#121417", lineHeight: 1.3,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 4,
          },
        }, title),

        /* ── Pie: fuentes ── */
        h("div", {
          style: flex({
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #DFD9CD",
            paddingTop: 10,
            fontSize: 12, color: "#7C8591",
          }),
        },
          h("span", { style: { fontWeight: 500 } }, src),
          h("span", { style: { color: "#FF4D2E", fontWeight: 700 } }, `#${idx + 1}`),
        ),
      );
    });

    /* 6 · Layout raíz 1080×1350 */
    const root = h("div", {
      style: flex({
        flexDirection: "column",
        justifyContent: "space-between",
        width: W, height: H,
        backgroundColor: "#0F1115",
        padding: "56px 60px 48px",
        color: "#F5F3EE",
        fontFamily: "Inter",
      }),
    },

      /* ── CABECERA ── */
      h("div", { style: flex({ flexDirection: "column" }) },
        /* Top bar */
        h("div", { style: flex({ alignItems: "center", justifyContent: "space-between", paddingBottom: 22, borderBottom: "1px solid #1F242C" }) },
          h("div", { style: flex({ alignItems: "center" }) },
            h("div", { style: { width: 13, height: 13, borderRadius: 7, backgroundColor: "#FF4D2E", marginRight: 12 } }),
            h("span", { style: { fontSize: 22, fontWeight: 700, color: "#F5F3EE", letterSpacing: -0.5 } }, "Project News"),
            h("span", { style: { margin: "0 10px", color: "#7C8591", fontSize: 18 } }, "/"),
            h("span", { style: { fontSize: 15, color: "#7C8591" } }, T.sub),
          ),
          /* Badge edición */
          h("div", { style: flex({ alignItems: "center", backgroundColor: "#181C22", border: "1px solid #242A34", borderRadius: 20, padding: "8px 18px" }) },
            h("div", { style: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2ECC71", marginRight: 10 } }),
            h("span", { style: { fontSize: 13, fontWeight: 700, color: "#F5F3EE" } }, T.badge),
          ),
        ),
        /* Título + metadatos */
        h("div", { style: flex({ flexDirection: "column", marginTop: 26 }) },
          h("span", { style: { fontSize: 38, fontWeight: 400, color: "#F5F3EE" } }, T.title1),
          h("span", { style: { fontSize: 42, fontWeight: 700, color: "#FFFFFF", marginTop: 4 } }, T.title2),
          h("div", { style: flex({ alignItems: "center", marginTop: 14 }) },
            h("span", { style: { fontSize: 16, color: "#7C8591" } }, `${T.dateLabel}  ·  ${T.filterNote}`),
          ),
        ),
      ),

      /* ── GRID 2×3 ── */
      h("div", { style: flex({ flexWrap: "wrap", gap: 22, justifyContent: "space-between", margin: "8px 0" }) },
        ...gridCards,
      ),

      /* ── PIE / CTA ── */
      h("div", { style: flex({ alignItems: "center", justifyContent: "space-between", backgroundColor: "#181C22", border: "1px solid #242A34", borderRadius: 14, padding: "15px 26px" }) },
        h("div", { style: flex({ alignItems: "center" }) },
          h("div", { style: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#2ECC71", marginRight: 12 } }),
          h("span", { style: { fontSize: 15, fontWeight: 600, color: "#F5F3EE" } }, T.footerN),
        ),
        h("span", { style: { fontSize: 16, fontWeight: 700, color: "#FF4D2E" } }, T.cta),
      ),
    );

    /* 7 · satori → SVG */
    const { regular, bold } = loadFonts();
    const svg = await satori(root, {
      width: W,
      height: H,
      fonts: [
        { name: "Inter", data: regular, weight: 400, style: "normal" },
        { name: "Inter", data: bold,    weight: 700, style: "normal" },
      ],
    });

    /* 8 · SVG → PNG de alta resolución */
    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: W } });
    const pngBuffer = resvg.render().asPng();

    const filename = `project-news-${currentIssue.week_start_date.slice(0, 10)}-${lang}.png`;
    return new NextResponse(Buffer.from(pngBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("❌ Error generando infografía:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
