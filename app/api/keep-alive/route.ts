import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/keep-alive
 * Endpoint ligero para evitar que Supabase congele el proyecto por inactividad.
 * Ejecuta una consulta real a la base de datos y responde 200 OK.
 */
export async function GET(request: Request) {
  const startTime = Date.now();

  try {
    // Consulta trivial para mantener caliente la conexión y activa la base de datos
    const rows = await query<{ now: string; issues_count: string }>(
      "SELECT NOW() as now, (SELECT count(*) FROM weekly_issues) as issues_count"
    );

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      status: "ok",
      database: "connected",
      db_time: rows[0]?.now ?? new Date().toISOString(),
      issues_count: Number(rows[0]?.issues_count ?? 0),
      duration_ms: durationMs,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ Error en /api/keep-alive:", errorMsg);

    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        error: errorMsg,
        duration_ms: durationMs,
      },
      { status: 500 }
    );
  }
}
