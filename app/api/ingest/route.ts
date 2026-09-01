/**
 * app/api/ingest/route.ts
 * POST /api/ingest — dispara la ingesta RSS desde el panel web.
 * En producción proteger con un token secreto; en local basta así.
 */
import { NextResponse } from "next/server";
import { ingestAllSources } from "@/lib/rss";

export async function POST() {
  try {
    const results = await ingestAllSources();
    const totalInserted = results.reduce((acc, r) => acc + r.inserted, 0);
    const errors = results.filter((r) => r.error);

    return NextResponse.json({
      ok: true,
      totalInserted,
      results,
      errors: errors.map((e) => ({ source: e.source, error: e.error })),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
