/**
 * app/api/infographic/route.tsx
 * Generación dinámica de infografía vertical 1080x1350 con @vercel/og (ImageResponse).
 * Soporta ?lang=es | ?lang=en.
 */
import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface TopItemRow extends Record<string, unknown> {
  sort_order: number;
  headline_es: string | null;
  headline_en: string | null;
  category: string;
  relevance_score: number;
  sources: string;
}

interface IssueRow extends Record<string, unknown> {
  id: string;
  week_start_date: string;
}

const CATEGORY_STYLES: Record<
  string,
  {
    label_es: string;
    label_en: string;
    color: string;
    chipBg: string;
    chipText: string;
  }
> = {
  "google-updates": {
    label_es: "Google Updates",
    label_en: "Google Updates",
    color: "#4A7BC8",
    chipBg: "rgba(74, 123, 200, 0.15)",
    chipText: "#3A67AF",
  },
  "ai-search": {
    label_es: "IA Search & GEO",
    label_en: "AI Search & GEO",
    color: "#FF4D2E",
    chipBg: "rgba(255, 77, 46, 0.15)",
    chipText: "#D93A1E",
  },
  "technical-seo": {
    label_es: "SEO Técnico",
    label_en: "Technical SEO",
    color: "#2E9B85",
    chipBg: "rgba(46, 155, 133, 0.15)",
    chipText: "#227C6A",
  },
  "seo-strategy": {
    label_es: "Estrategia & Datos",
    label_en: "Strategy & Data",
    color: "#8B6FC7",
    chipBg: "rgba(139, 111, 199, 0.15)",
    chipText: "#7357AE",
  },
  "local-ecommerce": {
    label_es: "Local & Comercio",
    label_en: "Local & Commerce",
    color: "#D9943B",
    chipBg: "rgba(217, 148, 59, 0.15)",
    chipText: "#B37525",
  },
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lang = searchParams.get("lang") === "en" ? "en" : "es";

  try {
    // 1. Obtener la edición más reciente
    const issues = await query<IssueRow>(`
      SELECT id, week_start_date
      FROM weekly_issues
      ORDER BY week_start_date DESC
      LIMIT 1
    `);

    if (issues.length === 0) {
      return new Response("No issues found", { status: 404 });
    }

    const currentIssue = issues[0];

    // 2. Obtener las Top 6 noticias
    const items = await query<TopItemRow>(`
      SELECT 
        ii.sort_order,
        ii.headline_es,
        ii.headline_en,
        ii.category,
        tg.relevance_score,
        STRING_AGG(DISTINCT s.name, ', ') as sources
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
        ii.category, 
        tg.relevance_score
      ORDER BY ii.sort_order ASC
      LIMIT 6
    `, [currentIssue.id]);

    const dateFormatted = new Date(currentIssue.week_start_date).toLocaleDateString(
      lang === "es" ? "es-ES" : "en-US",
      { day: "numeric", month: "long", year: "numeric" }
    );

    const headerBadge = lang === "es" ? "EDICIÓN SEMANAL" : "WEEKLY ISSUE";
    const headerTitle1 = lang === "es" ? "Lo que importa esta semana en" : "What truly matters this week in";
    const headerTitle2 = "SEO, GEO e IA Search";
    const headerSub = lang === "es" 
      ? `Semana del ${dateFormatted} · Filtro de señal (≥ 8.0)`
      : `Week of ${dateFormatted} · Signal filter (≥ 8.0)`;
    const footerCount = lang === "es" ? "13 noticias analizadas en la edición" : "13 curated stories in this issue";
    const footerCta = "project-news-lac.vercel.app ↗";

    return new ImageResponse(
      (
        <div
          style={{
            width: "1080px",
            height: "1350px",
            backgroundColor: "#0F1115",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "60px 60px 50px 60px",
            fontFamily: "sans-serif",
            color: "#F5F3EE",
          }}
        >
          {/* HEADER */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Top Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "24px",
                borderBottom: "1px solid #1F242C",
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    width: "14px",
                    height: "14px",
                    borderRadius: "7px",
                    backgroundColor: "#FF4D2E",
                    marginRight: "12px",
                  }}
                />
                <span
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "#F5F3EE",
                    letterSpacing: "-0.5px",
                  }}
                >
                  Project News
                </span>
                <span style={{ margin: "0 12px", color: "#7C8591", fontSize: "20px" }}>/</span>
                <span style={{ fontSize: "16px", color: "#7C8591" }}>
                  {lang === "es" ? "Señal entre ruido" : "Signal through noise"}
                </span>
              </div>

              {/* Badge Edición */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#181C22",
                  border: "1px solid #242A34",
                  borderRadius: "20px",
                  padding: "8px 18px",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "4px",
                    backgroundColor: "#2ECC71",
                    marginRight: "10px",
                  }}
                />
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#F5F3EE" }}>
                  {headerBadge}
                </span>
              </div>
            </div>

            {/* Titular Header */}
            <div style={{ display: "flex", flexDirection: "column", marginTop: "28px" }}>
              <span style={{ fontSize: "40px", color: "#F5F3EE", fontWeight: 400 }}>
                {headerTitle1}
              </span>
              <span style={{ fontSize: "42px", color: "#FFFFFF", fontWeight: 700, marginTop: "4px" }}>
                {headerTitle2}
              </span>
              <span style={{ fontSize: "18px", color: "#7C8591", marginTop: "10px" }}>
                {headerSub}
              </span>
            </div>
          </div>

          {/* GRID TOP 6 (2 columnas × 3 filas) */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "24px",
              justifyContent: "space-between",
              margin: "24px 0",
            }}
          >
            {items.map((item, idx) => {
              const config = CATEGORY_STYLES[item.category] || {
                label_es: item.category,
                label_en: item.category,
                color: "#FF4D2E",
                chipBg: "rgba(255, 77, 46, 0.15)",
                chipText: "#D93A1E",
              };

              const categoryLabel = lang === "es" ? config.label_es : config.label_en;
              const headline =
                lang === "en"
                  ? item.headline_en || item.headline_es || ""
                  : item.headline_es || item.headline_en || "";

              const score = Number(item.relevance_score).toFixed(1);

              return (
                <div
                  key={idx}
                  style={{
                    width: "468px",
                    height: "245px",
                    backgroundColor: "#F5F3EE",
                    borderRadius: "18px",
                    padding: "20px 22px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    borderTop: `6px solid ${config.color}`,
                    color: "#121417",
                    position: "relative",
                  }}
                >
                  {/* Top: Número Circular + Categoría + Score */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {/* Número circular grande */}
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "18px",
                          backgroundColor: config.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#FFFFFF",
                          fontSize: "18px",
                          fontWeight: 900,
                          marginRight: "10px",
                        }}
                      >
                        {idx + 1}
                      </div>

                      {/* Chip de Categoría */}
                      <div
                        style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          backgroundColor: config.chipBg,
                          color: config.chipText,
                          fontSize: "13px",
                          fontWeight: 700,
                        }}
                      >
                        {categoryLabel}
                      </div>
                    </div>

                    {/* Badge Score */}
                    <div
                      style={{
                        padding: "3px 10px",
                        borderRadius: "12px",
                        backgroundColor: "rgba(255, 77, 46, 0.12)",
                        color: "#D93A1E",
                        fontSize: "13px",
                        fontWeight: 800,
                      }}
                    >
                      ⭐ {score}
                    </div>
                  </div>

                  {/* Titular */}
                  <div
                    style={{
                      fontSize: "19px",
                      fontWeight: 700,
                      color: "#121417",
                      lineHeight: "1.3",
                      marginTop: "6px",
                      marginBottom: "6px",
                    }}
                  >
                    {headline}
                  </div>

                  {/* Pie de tarjeta: Fuentes */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderTop: "1px solid #DFD9CD",
                      paddingTop: "10px",
                      fontSize: "12px",
                      color: "#7C8591",
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{item.sources}</span>
                    <span style={{ color: "#FF4D2E", fontWeight: 700 }}>Top #{idx + 1}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FOOTER / CTA */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#181C22",
              border: "1px solid #242A34",
              borderRadius: "14px",
              padding: "16px 28px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: "9px",
                  height: "9px",
                  borderRadius: "5px",
                  backgroundColor: "#2ECC71",
                  marginRight: "12px",
                }}
              />
              <span style={{ fontSize: "15px", fontWeight: 600, color: "#F5F3EE" }}>
                {footerCount}
              </span>
            </div>

            <span style={{ fontSize: "16px", fontWeight: 700, color: "#FF4D2E" }}>
              {footerCta}
            </span>
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1350,
      }
    );
  } catch (error) {
    console.error("❌ Error generando infografía con ImageResponse:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
