/**
 * app/api/group/route.ts
 * POST /api/group — endpoint para disparar la agrupación de temas.
 */
import { NextResponse } from "next/server";
import { groupRawItems } from "@/lib/grouping";

export async function POST() {
  try {
    const result = await groupRawItems();
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
