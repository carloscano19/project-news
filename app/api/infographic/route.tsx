/**
 * app/api/infographic/route.tsx
 *
 * Implementación definitiva de la infografía (Plantilla v5).
 * - Canvas 1200px con tipografía Inter (800/900 en títulos).
 * - Cabecera con título en negro y acento naranja (#FF4D2E).
 * - Hero #1 con borde naranja de 2px, fondo #FFF8F6 e icono 64px.
 * - Grid de 7 noticias (#2 a #8) en 4 columnas con chips de categoría en colores pastel.
 * - Sin ninguna mención de score, señal o umbrales numéricos.
 * - Textos completos y limpios, sin palabras cortadas a la mitad.
 * - Footer hueso claro (#F5F3EE) con botón negro de CTA.
 * - Cabeceras de descarga directa: Content-Type image/png y Content-Disposition attachment.
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
  why_it_matters_es: string | null;
  why_it_matters_en: string | null;
  category: string;
}

interface IssueRow extends Record<string, unknown> {
  id: string;
  week_start_date: string | Date;
}

/* ───── Configuración por categoría (Plantilla v5) ───────────────── */
const CATS: Record<
  string,
  { label_es: string; label_en: string; color: string; pastelBg: string }
> = {
  "google-updates":  { label_es: "Google Updates",    label_en: "Google Updates",    color: "#4A7BC8", pastelBg: "#E1EBFA" },
  "ai-search":       { label_es: "IA Search & GEO",   label_en: "AI Search & GEO",   color: "#FF4D2E", pastelBg: "#FFE3DB" },
  "technical-seo":   { label_es: "SEO Técnico",       label_en: "Technical SEO",      color: "#2E9B85", pastelBg: "#DFF3EE" },
  "seo-strategy":    { label_es: "Estrategia & Datos", label_en: "Strategy & Data",   color: "#8B6FC7", pastelBg: "#EFE9F9" },
  "local-ecommerce": { label_es: "Local & Comercio",  label_en: "Local & Commerce",   color: "#D9943B", pastelBg: "#FBEEDC" },
  "data-analytics":  { label_es: "Data & Analítica",   label_en: "Data & Analytics",   color: "#1E9BD4", pastelBg: "#E0F4FC" },
  "paid-media":      { label_es: "Medios de Pago",     label_en: "Paid Media",         color: "#D6487E", pastelBg: "#FCE9F1" },
};
const CAT_DEFAULT = { label_es: "General", label_en: "General", color: "#FF4D2E", pastelBg: "#FFE3DB" };

/* ───── Iconos Vectoriales Nativos (Paths SVG de Lucide) ─────────── */
function getIconSvg(category: string, color: string, size = 18) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 2.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (category) {
    case "ai-search":
      return h("svg", props,
        h("circle", { cx: 11, cy: 11, r: 7 }),
        h("line", { x1: 21, y1: 21, x2: 16.65, y2: 16.65 })
      );
    case "google-updates":
      return h("svg", props,
        h("polyline", { points: "23 6 13.5 15.5 8.5 10.5 1 18" }),
        h("polyline", { points: "17 6 23 6 23 12" })
      );
    case "technical-seo":
      return h("svg", props,
        h("polyline", { points: "16 18 22 12 16 6" }),
        h("polyline", { points: "8 6 2 12 8 18" })
      );
    case "seo-strategy":
      return h("svg", props,
        h("line", { x1: 18, y1: 20, x2: 18, y2: 10 }),
        h("line", { x1: 12, y1: 20, x2: 12, y2: 4 }),
        h("line", { x1: 6, y1: 20, x2: 6, y2: 14 })
      );
    case "local-ecommerce":
      return h("svg", props,
        h("path", { d: "M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" }),
        h("line", { x1: 3, y1: 6, x2: 21, y2: 6 }),
        h("path", { d: "M16 10a4 4 0 0 1-8 0" })
      );
    case "data-analytics":
      // Icono Database
      return h("svg", props,
        h("ellipse", { cx: 12, cy: 5, rx: 9, ry: 3 }),
        h("path", { d: "M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" }),
        h("path", { d: "M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" })
      );
    case "paid-media":
      // Icono Megaphone
      return h("svg", props,
        h("path", { d: "M3 11l18-5v12L3 14v-3z" }),
        h("path", { d: "M11.6 16.8a3 3 0 1 1-5.8-1.6" })
      );
    default:
      return h("svg", props,
        h("circle", { cx: 12, cy: 12, r: 9 }),
        h("line", { x1: 12, y1: 8, x2: 12, y2: 12 }),
        h("line", { x1: 12, y1: 16, x2: 12.01, y2: 16 })
      );
  }
}

/* ───── Funciones de formateo inteligente de textos ──────────────── */
// Extrae una sola oración concisa con sentido completo terminada en punto
function extractOneSentence(text: string | null | undefined, maxChars = 95): string {
  if (!text) return "";
  const t = text.trim();
  
  // Buscar corte de oración natural (punto seguido de espacio o fin)
  const match = t.match(/^([^.!?]+[.!?])/);
  if (match && match[1]) {
    const first = match[1].trim();
    if (first.length <= maxChars) return first;
  }
  
  // Buscar corte en coma o punto y coma si la primera parte es suficientemente informativa
  const commaMatch = t.match(/^([^,;]+)[,;]/);
  if (commaMatch && commaMatch[1] && commaMatch[1].length >= 35 && commaMatch[1].length <= maxChars) {
    return commaMatch[1].trim() + ".";
  }
  
  // Truncar en el último espacio limpio sin cortar palabras a la mitad
  if (t.length <= maxChars) return t.endsWith(".") ? t : t + ".";
  let cut = t.lastIndexOf(" ", maxChars);
  if (cut === -1) cut = maxChars;
  return t.slice(0, cut).trim().replace(/[\.,;:!\s]+$/, "") + ".";
}

// Mantiene el titular limpio garantizando que no se corte abruptamente
function formatCardTitle(text: string | null | undefined, maxChars = 80): string {
  if (!text) return "";
  const t = text.trim();
  if (t.length <= maxChars) return t;
  
  let cut = t.lastIndexOf(" ", maxChars);
  if (cut === -1) cut = maxChars;
  return t.slice(0, cut).trim().replace(/[\.,;:!\s]+$/, "");
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

    /* 2 · Top 8 noticias por orden de relevancia */
    const items = await query<TopItemRow>(
      `SELECT
        ii.sort_order,
        ii.headline_es,
        ii.headline_en,
        ii.why_it_matters_es,
        ii.why_it_matters_en,
        ii.category
       FROM issue_items ii
       JOIN topic_groups tg ON tg.id = ii.topic_group_id
       WHERE ii.weekly_issue_id = $1
       ORDER BY ii.sort_order ASC
       LIMIT 8`,
      [currentIssue.id]
    );

    if (items.length < 8) {
      console.warn(`Advertencia: solo hay ${items.length} noticias en la edición actual.`);
    }

    const heroItem = items[0];
    const gridItems = items.slice(1, 8);

    /* 3 · Textos y localización según idioma */
    const T = {
      titleMain: lang === "es" ? "Lo más importante en Search, IA" : "Top Developments in Search, AI",
      titleAccent: lang === "es" ? " · Data & Paid" : " · Data & Paid",
      subtitle: lang === "es"
        ? "Las 8 señales que de verdad marcan esta semana."
        : "The 8 key stories shaping the industry this week.",
      heroTag: (catName: string) => `#1 · ${catName.toUpperCase()}`,
      footerMain: lang === "es" ? "Noticias analizadas con rigor" : "Rigorous editorial curation",
      footerSub: lang === "es" ? "Curación automática, cero ruido" : "Automated curation, zero noise",
      cta: lang === "es" ? "LEER LA EDICIÓN COMPLETA" : "READ THE FULL ISSUE",
    };

    const heroCat = CATS[heroItem.category] || CAT_DEFAULT;
    const heroTitle = (lang === "en" ? (heroItem.headline_en || heroItem.headline_es) : (heroItem.headline_es || heroItem.headline_en))?.trim() || "";
    const heroDesc = extractOneSentence(
      lang === "en" ? (heroItem.why_it_matters_en || heroItem.why_it_matters_es) : (heroItem.why_it_matters_es || heroItem.why_it_matters_en),
      130
    );

    /* 4 · Dimensiones exactas de la Plantilla v5 */
    const W = 1200;
    const H = 870;

    const flex = (extra: Record<string, unknown> = {}) => ({ display: "flex", ...extra });

    /* 5 · Construcción del árbol Satori */
    const root = h("div", {
      style: flex({
        flexDirection: "column",
        width: W,
        height: H,
        backgroundColor: "#FFFFFF",
        padding: "44px 48px 40px",
        fontFamily: "Inter",
        color: "#121417",
      }),
    },
      /* ── CABECERA ── */
      h("div", { style: flex({ flexDirection: "column", marginBottom: 22 }) },
        h("div", { style: flex({ fontSize: 40, fontWeight: 900, lineHeight: 1.15, color: "#121417", letterSpacing: "-0.5px" }) },
          h("span", null, T.titleMain),
          h("span", { style: { color: "#FF4D2E" } }, T.titleAccent)
        ),
        h("div", { style: { fontSize: 16, color: "#6B7280", fontWeight: 600, marginTop: 8 } },
          T.subtitle
        )
      ),

      /* ── HERO (#1) ── */
      h("div", {
        style: flex({
          border: "2px solid #FF4D2E",
          borderRadius: 18,
          padding: "24px 26px",
          alignItems: "center",
          marginBottom: 18,
          backgroundColor: "#FFF8F6",
          gap: 20,
        }),
      },
        h("div", {
          style: flex({
            width: 64,
            height: 64,
            borderRadius: 16,
            backgroundColor: "#FF4D2E",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }),
        }, getIconSvg(heroItem.category, "#FFFFFF", 32)),
        h("div", { style: flex({ flexDirection: "column" }) },
          h("div", {
            style: {
              fontSize: 12,
              fontWeight: 800,
              color: "#FF4D2E",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 6,
            },
          }, T.heroTag(lang === "es" ? heroCat.label_es : heroCat.label_en)),
          h("div", {
            style: {
              fontSize: 24,
              fontWeight: 900,
              color: "#121417",
              lineHeight: 1.2,
              marginBottom: 6,
            },
          }, heroTitle),
          h("div", {
            style: {
              fontSize: 15,
              color: "#5B6270",
              fontWeight: 600,
              lineHeight: 1.4,
            },
          }, heroDesc)
        )
      ),

      /* ── GRID (#2 a #8) · 4 COLUMNAS ── */
      h("div", {
        style: flex({
          flexWrap: "wrap",
          gap: 14,
          alignItems: "stretch",
          width: 1104,
        }),
      },
        ...gridItems.map((it, idx) => {
          const cat = CATS[it.category] || CAT_DEFAULT;
          const rawTitle = lang === "en" ? (it.headline_en || it.headline_es) : (it.headline_es || it.headline_en);
          const rawDesc = lang === "en" ? (it.why_it_matters_en || it.why_it_matters_es) : (it.why_it_matters_es || it.why_it_matters_en);

          const title = formatCardTitle(rawTitle, 80);
          const desc = extractOneSentence(rawDesc, 95);

          return h("div", {
            key: idx,
            style: flex({
              flexDirection: "column",
              justifyContent: "flex-start",
              width: 265,
              height: 195,
              border: "1.5px solid #ECEAE4",
              borderRadius: 14,
              padding: "16px",
              backgroundColor: "#FFFFFF",
            }),
          },
            /* Fila superior: número circular + chip con icono pastel */
            h("div", { style: flex({ alignItems: "center", gap: 8, marginBottom: 10 }) },
              h("div", {
                style: flex({
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  color: "#FFFFFF",
                  fontWeight: 800,
                  fontSize: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  backgroundColor: cat.color,
                }),
              }, String(idx + 2)),
              h("div", {
                style: flex({
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  backgroundColor: cat.pastelBg,
                }),
              }, getIconSvg(it.category, cat.color, 18))
            ),
            /* Titular en negrita */
            h("div", {
              style: {
                fontSize: 14,
                fontWeight: 800,
                color: "#121417",
                lineHeight: 1.3,
                marginBottom: 6,
              },
            }, title),
            /* Frase descriptiva concisa */
            h("div", {
              style: {
                fontSize: 12,
                color: "#6B7280",
                fontWeight: 500,
                lineHeight: 1.4,
              },
            }, desc)
          );
        })
      ),

      /* ── FOOTER ── */
      h("div", {
        style: flex({
          marginTop: 22,
          backgroundColor: "#F5F3EE",
          borderRadius: 16,
          padding: "18px 24px",
          justifyContent: "space-between",
          alignItems: "center",
        }),
      },
        h("div", { style: flex({ alignItems: "center", gap: 12 }) },
          h("div", {
            style: flex({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "#FF4D2E",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }),
          },
            h("svg", { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "#FFFFFF", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" },
              h("path", { d: "M22 2L11 13" }),
              h("path", { d: "M22 2l-7 20-4-9-9-4 20-7z" })
            )
          ),
          h("div", { style: flex({ flexDirection: "column" }) },
            h("div", { style: { fontSize: 15, fontWeight: 800, color: "#121417" } }, T.footerMain),
            h("div", { style: { fontSize: 12, color: "#6B7280", fontWeight: 600 } }, T.footerSub)
          )
        ),
        h("div", {
          style: flex({
            backgroundColor: "#121417",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: 13,
            padding: "11px 18px",
            borderRadius: 100,
            alignItems: "center",
            gap: 6,
          }),
        },
          h("span", null, T.cta),
          h("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "#FFFFFF", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" },
            h("line", { x1: 5, y1: 12, x2: 19, y2: 12 }),
            h("polyline", { points: "12 5 19 12 12 19" })
          )
        )
      )
    );

    /* 6 · Renderizado Satori (JSX -> SVG) */
    const { regular, bold } = loadFonts();
    const svg = await satori(root, {
      width: W,
      height: H,
      fonts: [
        { name: "Inter", data: regular, weight: 400, style: "normal" },
        { name: "Inter", data: bold,    weight: 700, style: "normal" },
      ],
    });

    /* 7 · Conversión SVG -> PNG */
    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: W } });
    const pngBuffer = resvg.render().asPng();

    const dateObj = new Date(currentIssue.week_start_date);
    const dateIso = !isNaN(dateObj.getTime())
      ? dateObj.toISOString().slice(0, 10)
      : "latest";
    const filename = `project-news-infographic-${dateIso}-${lang}.png`;

    return new NextResponse(Buffer.from(pngBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("❌ Error generando infografía v5:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
