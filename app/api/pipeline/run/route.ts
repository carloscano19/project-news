/**
 * app/api/pipeline/run/route.ts
 * Endpoint protegido para ejecutar el pipeline completo en orden:
 * Ingesta → Agrupación → Scoring → Redacción.
 * 
 * Invocado automáticamente por Vercel Cron o llamadas autorizadas con Bearer CRON_SECRET.
 */
import { NextRequest, NextResponse } from "next/server";
import { ingestAllSources } from "@/lib/rss";
import { groupRawItems } from "@/lib/grouping";
import { runScoringPipeline, SCORE_THRESHOLD } from "@/lib/scoring";
import { runDraftingPipeline } from "@/lib/drafting";

export const maxDuration = 300; // 5 minutos de tiempo máximo de ejecución en Serverless Functions
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // 1. Verificación de seguridad
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("❌ CRON_SECRET no está configurado en las variables de entorno.");
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured on server" },
      { status: 500 }
    );
  }

  // Comprobar Bearer token (soporta tanto "Bearer <secret>" como "<secret>")
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (token !== cronSecret) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  console.log("🚀 [PIPELINE] Iniciando ejecución automática semanal...");

  try {
    // Etapa 1: Ingesta RSS
    console.log("📡 [1/4] Ingestando feeds RSS...");
    const ingestResults = await ingestAllSources();
    const totalInserted = ingestResults.reduce((acc, r) => acc + r.inserted, 0);
    const ingestErrors = ingestResults.filter((r) => r.error);
    console.log(`✅ [1/4] Ingesta lista: ${totalInserted} items nuevos.`);

    // Etapa 2: Agrupación temática
    console.log("🧩 [2/4] Agrupando artículos por tema...");
    const groupResult = await groupRawItems();
    console.log(`✅ [2/4] Agrupación lista: ${groupResult.groupsCreated} grupos creados.`);

    // Etapa 3: Scoring con Gemini
    console.log("🎯 [3/4] Evaluando relevancia editorial con Gemini...");
    const scoreResult = await runScoringPipeline(15, SCORE_THRESHOLD);
    console.log(`✅ [3/4] Scoring listo: ${scoreResult.selected} noticias seleccionadas (>= ${SCORE_THRESHOLD}).`);

    // Etapa 4: Redacción con Gemini
    console.log("✍️ [4/4] Redactando edición formato SEOFOMO...");
    const draftResult = await runDraftingPipeline();
    console.log(`✅ [4/4] Redacción lista: ${draftResult.drafted} noticias generadas.`);

    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

    return NextResponse.json({
      ok: true,
      message: "Pipeline ejecutado con éxito",
      duration: `${durationSeconds}s`,
      summary: {
        raw_items_inserted: totalInserted,
        groups_created: groupResult.groupsCreated,
        topics_scored: scoreResult.scored,
        topics_selected: scoreResult.selected,
        items_drafted: draftResult.drafted,
      },
      ingestErrors: ingestErrors.length > 0 ? ingestErrors : undefined,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ Error ejecutando el pipeline:", errorMsg);
    return NextResponse.json(
      {
        ok: false,
        error: errorMsg,
        duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      },
      { status: 500 }
    );
  }
}

// También soportamos POST por si se invoca vía Webhook o cURL
export async function POST(request: NextRequest) {
  return GET(request);
}
