/**
 * app/api/score/route.ts
 * POST /api/score — endpoint para disparar el scoring desde el panel web.
 */
import { NextResponse } from "next/server";
import { runScoringPipeline } from "@/lib/scoring";

export async function POST() {
  try {
    const result = await runScoringPipeline();
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
