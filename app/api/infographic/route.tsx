/**
 * app/api/infographic/route.tsx
 *
 * Infografía vertical de LinkedIn (1080×1350 px) de alto impacto visual.
 * Diseñada para captar atención en feed: números gigantes, iconos vectoriales con
 * fondo sólido por categoría, titulares de gran tamaño (23-24px), borde superior de 10px
 * y bloque de CTA con fondo Naranja Señal (#FF4D2E).
 *
 * Stack: satori (JSX → SVG) + @resvg/resvg-js (SVG → PNG) en Node.js runtime.
 */
import { NextRequest, NextResponse } from "next/server";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { createElement as h } from "react";
import fs from "fs";
import path from "path";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
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
  week_start_date: string | Date;
}

/* ───── Colores & etiquetas por categoría ────────────────────────── */
const CATS: Record<
  string,
  { label_es: string; label_en: string; color: string; chipBg: string; chipText: string }
> = {
  "google-updates":  { label_es: "Google Updates",    label_en: "Google Updates",    color: "#4A7BC8", chipBg: "rgba(74,123,200,0.18)",   chipText: "#2C589E" },
  "ai-search":       { label_es: "IA Search & GEO",   label_en: "AI Search & GEO",   color: "#FF4D2E", chipBg: "rgba(255,77,46,0.18)",    chipText: "#D93214" },
  "technical-seo":   { label_es: "SEO Técnico",       label_en: "Technical SEO",      color: "#2E9B85", chipBg: "rgba(46,155,133,0.18)",   chipText: "#1B7462" },
  "seo-strategy":    { label_es: "Estrategia & Datos", label_en: "Strategy & Data",   color: "#8B6FC7", chipBg: "rgba(139,111,199,0.18)",  chipText: "#6A49AB" },
  "local-ecommerce": { label_es: "Local & Comercio",  label_en: "Local & Commerce",   color: "#D9943B", chipBg: "rgba(217,148,59,0.18)",   chipText: "#9E661B" },
};
const CAT_DEFAULT = { label_es: "Noticia", label_en: "Story", color: "#FF4D2E", chipBg: "rgba(255,77,46,0.18)", chipText: "#D93214" };

/* ───── Iconos Vectoriales Nativos (Paths limpios de Lucide) ─────── */
function renderCategoryIcon(category: string, size = 22) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#FFFFFF",
    strokeWidth: 2.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (category) {
    case "ai-search":
      // Icono Search
      return h("svg", props,
        h("circle", { cx: 11, cy: 11, r: 8 }),
        h("line", { x1: 21, y1: 21, x2: 16.65, y2: 16.65 })
      );
    case "google-updates":
      // Icono TrendingUp
      return h("svg", props,
        h("polyline", { points: "23 6 13.5 15.5 8.5 10.5 1 18" }),
        h("polyline", { points: "17 6 23 6 23 12" })
      );
    case "technical-seo":
      // Icono Code
      return h("svg", props,
        h("polyline", { points: "16 18 22 12 16 6" }),
        h("polyline", { points: "8 6 2 12 8 18" })
      );
    case "seo-strategy":
      // Icono BarChart
      return h("svg", props,
        h("line", { x1: 18, y1: 20, x2: 18, y2: 10 }),
        h("line", { x1: 12, y1: 20, x2: 12, y2: 4 }),
        h("line", { x1: 6, y1: 20, x2: 6, y2: 14 })
      );
    case "local-ecommerce":
      // Icono ShoppingBag
      return h("svg", props,
        h("path", { d: "M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" }),
        h("line", { x1: 3, y1: 6, x2: 21, y2: 6 }),
        h("path", { d: "M16 10a4 4 0 0 1-8 0" })
      );
    default:
      return h("svg", props,
        h("circle", { cx: 12, cy: 12, r: 10 })
      );
  }
}

/* ───── Carga de fuentes WOFF ────────────────────────────────────── */
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
    /* 1 · Obtener edición más reciente */
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

    /* 3 · Textos y localización */
    const dateObj = new Date(currentIssue.week_start_date);
    const dateStr = dateObj.toLocaleDateString(
      lang === "es" ? "es-ES" : "en-US",
      { day: "numeric", month: "long", year: "numeric" }
    );

    const T = {
      badge:      lang === "es" ? "EDICIÓN SEMANAL"  : "WEEKLY ISSUE",
      sub:        lang === "es" ? "SEÑAL ENTRE RUIDO" : "SIGNAL THROUGH NOISE",
      title1:     lang === "es" ? "Lo que de verdad importa en" : "What truly matters this week in",
      title2:     "SEO, GEO e IA Search",
      dateLabel:  lang === "es" ? `Semana del ${dateStr}` : `Week of ${dateStr}`,
      filterNote: lang === "es" ? "Filtro de señal (score 8.0+)" : "Signal filter (score 8.0+)",
      score:      lang === "es" ? "SEÑAL" : "SIGNAL",
      footerN:    lang === "es" ? "13 NOTICIAS ANALIZADAS EN ESTA EDICIÓN" : "13 STORIES CURATED THIS ISSUE",
      cta:        lang === "es" ? "VER EN PROJECT-NEWS" : "READ ON PROJECT-NEWS",
    };

    /* 4 · Dimensiones exactas */
    const W = 1080, H = 1350;
    const CARD_W = 472, CARD_H = 266;

    const flex = (extra: Record<string, unknown> = {}) => ({ display: "flex", ...extra });

    /* 5 · Construir tarjetas del grid 2×3 */
    const gridCards = items.map((item, idx) => {
      const cat    = CATS[item.category] ?? CAT_DEFAULT;
      const label  = (lang === "es" ? cat.label_es : cat.label_en).toUpperCase();
      const title  = (lang === "en" ? (item.headline_en || item.headline_es) : (item.headline_es || item.headline_en)) ?? "";
      const score  = Number(item.relevance_score).toFixed(1);
      const src    = item.sources.length > 32 ? item.sources.slice(0, 30) + "…" : item.sources;

      return h("div", {
        key: idx,
        style: flex({
          flexDirection: "column",
          justifyContent: "space-between",
          width: CARD_W,
          height: CARD_H,
          backgroundColor: "#F5F3EE",
          borderRadius: 22,
          padding: "18px 22px 18px",
          borderTop: `10px solid ${cat.color}`,
          borderLeft: "2px solid #E5E0D5",
          borderRight: "2px solid #E5E0D5",
          borderBottom: "2px solid #E5E0D5",
          overflow: "hidden",
        }),
      },
        /* ── Header tarjeta: Número Gigante + Icono Sólido + Categoría + Score ── */
        h("div", { style: flex({ alignItems: "center", justifyContent: "space-between" }) },
          h("div", { style: flex({ alignItems: "center" }) },
            /* Círculo con número protagonista (50×50 px) */
            h("div", {
              style: flex({
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: cat.color,
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                fontSize: 26,
                fontWeight: 900,
                marginRight: 10,
                flexShrink: 0,
                border: "2px solid #FFFFFF",
              }),
            }, String(idx + 1)),

            /* Icono de categoría con fondo sólido (40×40 px) */
            h("div", {
              style: flex({
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: cat.color,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
                flexShrink: 0,
              }),
            }, renderCategoryIcon(item.category, 22)),

            /* Chip texto de categoría */
            h("div", {
              style: {
                padding: "5px 10px",
                borderRadius: 7,
                backgroundColor: cat.chipBg,
                color: cat.chipText,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.2px",
              },
            }, label),
          ),

          /* Badge score de relevancia */
          h("div", {
            style: flex({
              alignItems: "center",
              padding: "5px 12px",
              borderRadius: 14,
              backgroundColor: "#181C22",
              color: "#FFFFFF",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "0.5px",
            }),
          },
            h("div", {
              style: {
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: "#FF4D2E",
                marginRight: 6,
              },
            }),
            h("span", { style: { color: "#FFFFFF" } }, `${score}`),
          ),
        ),

        /* ── Titular de Gran Tamaño (23px, negrita contundente) ── */
        h("div", {
          style: {
            fontSize: 23,
            fontWeight: 800,
            color: "#111317",
            lineHeight: 1.25,
            marginTop: 6,
            marginBottom: 6,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 3,
          },
        }, title),

        /* ── Pie de tarjeta: Fuentes y posición ── */
        h("div", {
          style: flex({
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1.5px solid #DFD9CD",
            paddingTop: 10,
            fontSize: 13,
            color: "#6B7280",
          }),
        },
          h("div", { style: flex({ alignItems: "center" }) },
            h("span", { style: { color: "#9CA3AF", marginRight: 5, fontSize: 11, fontWeight: 700 } }, "FUENTE:"),
            h("span", { style: { fontWeight: 700, color: "#1F2937" } }, src),
          ),
          h("div", {
            style: {
              color: cat.color,
              fontWeight: 900,
              fontSize: 13,
              letterSpacing: "0.5px",
            },
          }, `TOP #${idx + 1}`),
        ),
      );
    });

    /* 6 · Layout Raíz 1080×1350 */
    const root = h("div", {
      style: flex({
        flexDirection: "column",
        justifyContent: "space-between",
        width: W,
        height: H,
        backgroundColor: "#0F1115",
        padding: "48px 54px 44px 54px",
        color: "#F5F3EE",
        fontFamily: "Inter",
      }),
    },

      /* ── CABECERA EDITORIAL ── */
      h("div", { style: flex({ flexDirection: "column" }) },
        /* Top bar */
        h("div", {
          style: flex({
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 20,
            borderBottom: "1.5px solid #1F242C",
          }),
        },
          h("div", { style: flex({ alignItems: "center" }) },
            h("div", {
              style: {
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: "#FF4D2E",
                marginRight: 12,
              },
            }),
            h("span", {
              style: {
                fontSize: 24,
                fontWeight: 800,
                color: "#F5F3EE",
                letterSpacing: "-0.5px",
              },
            }, "PROJECT NEWS"),
            h("span", { style: { margin: "0 12px", color: "#4B5563", fontSize: 20 } }, "/"),
            h("span", {
              style: {
                fontSize: 14,
                fontWeight: 700,
                color: "#9CA3AF",
                letterSpacing: "1px",
              },
            }, T.sub),
          ),

          /* Badge edición */
          h("div", {
            style: flex({
              alignItems: "center",
              backgroundColor: "#181C22",
              border: "1.5px solid #28303C",
              borderRadius: 22,
              padding: "9px 20px",
            }),
          },
            h("div", {
              style: {
                width: 9,
                height: 9,
                borderRadius: 5,
                backgroundColor: "#2ECC71",
                marginRight: 10,
              },
            }),
            h("span", {
              style: {
                fontSize: 13,
                fontWeight: 800,
                color: "#F5F3EE",
                letterSpacing: "0.5px",
              },
            }, T.badge),
          ),
        ),

        /* Gran Titular Editorial */
        h("div", { style: flex({ flexDirection: "column", marginTop: 24 }) },
          h("span", {
            style: {
              fontSize: 34,
              fontWeight: 500,
              color: "#9CA3AF",
              letterSpacing: "-0.5px",
            },
          }, T.title1),
          h("span", {
            style: {
              fontSize: 48,
              fontWeight: 900,
              color: "#FFFFFF",
              letterSpacing: "-1px",
              marginTop: 4,
            },
          }, T.title2),
          h("div", { style: flex({ alignItems: "center", marginTop: 12 }) },
            h("div", {
              style: {
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#FF4D2E",
                marginRight: 10,
              },
            }),
            h("span", {
              style: {
                fontSize: 16,
                fontWeight: 600,
                color: "#9CA3AF",
              },
            }, `${T.dateLabel}   ·   ${T.filterNote}`),
          ),
        ),
      ),

      /* ── GRID 2×3 DE NOTICIAS DE ALTO IMPACTO ── */
      h("div", {
        style: flex({
          flexWrap: "wrap",
          gap: "24px 28px",
          justifyContent: "space-between",
          margin: "12px 0",
        }),
      }, ...gridCards),

      /* ── PIE CTA POTENTE (Fondo Naranja Señal #FF4D2E) ── */
      h("div", {
        style: flex({
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#FF4D2E",
          borderRadius: 20,
          padding: "18px 28px",
          boxShadow: "0 8px 24px rgba(255,77,46,0.35)",
        }),
      },
        h("div", { style: flex({ alignItems: "center" }) },
          h("div", {
            style: {
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: "#FFFFFF",
              marginRight: 12,
            },
          }),
          h("span", {
            style: {
              fontSize: 16,
              fontWeight: 900,
              color: "#FFFFFF",
              letterSpacing: "0.5px",
            },
          }, T.footerN),
        ),

        /* Botón Blanco con Texto Naranja y Flecha SVG */
        h("div", {
          style: flex({
            alignItems: "center",
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            padding: "10px 22px",
          }),
        },
          h("span", {
            style: {
              fontSize: 15,
              fontWeight: 900,
              color: "#FF4D2E",
              letterSpacing: "0.2px",
              marginRight: 6,
            },
          }, T.cta),
          h("svg", {
            width: 14,
            height: 14,
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "#FF4D2E",
            strokeWidth: 3,
            strokeLinecap: "round",
            strokeLinejoin: "round",
          },
            h("line", { x1: 7, y1: 17, x2: 17, y2: 7 }),
            h("polyline", { points: "7 7 17 7 17 17" })
          ),
        ),
      ),
    );

    /* 7 · Renderizar con satori → SVG */
    const { regular, bold } = loadFonts();
    const svg = await satori(root, {
      width: W,
      height: H,
      fonts: [
        { name: "Inter", data: regular, weight: 400, style: "normal" },
        { name: "Inter", data: bold,    weight: 700, style: "normal" },
      ],
    });

    /* 8 · Convertir SVG a PNG de 1080x1350 */
    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: W } });
    const pngBuffer = resvg.render().asPng();

    const dateIso = !isNaN(dateObj.getTime())
      ? dateObj.toISOString().slice(0, 10)
      : "latest";
    const filename = `project-news-${dateIso}-${lang}.png`;

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
