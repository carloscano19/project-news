/**
 * app/api/draft/route.ts
 * POST /api/draft — endpoint para disparar la redacción desde la web.
 */
import { NextResponse } from "next/server";
import { runDraftingPipeline } from "@/lib/drafting";

export async function POST() {
  try {
    const result = await runDraftingPipeline();
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
