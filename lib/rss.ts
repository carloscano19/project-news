/**
 * lib/rss.ts
 * Módulo de ingesta RSS: lee los feeds de todas las fuentes activas
 * y guarda los ítems nuevos en raw_items (deduplicando por URL).
 */
import RSSParser from "rss-parser";
import { getPool } from "@/lib/db";
import type { PoolClient } from "pg";

// ────────────────────────────────────────────────────────────
// Tipos internos
// ────────────────────────────────────────────────────────────
export interface Source {
  id: string;
  name: string;
  rss_url: string;
}

export interface IngestResult {
  source: string;
  fetched: number;
  inserted: number;
  skipped: number;
  error?: string;
}

// ── Parsers ────────────────────────────────────────────────────
// strictParser: for well-formed feeds
// looseParser:  for feeds with minor XML issues (e.g. SEOFOMO attribute-without-value)
const baseOptions: RSSParser.ParserOptions<Record<string, unknown>, Record<string, unknown>> = {
  timeout: 20_000,
  headers: {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
  },
};

const strictParser = new RSSParser(baseOptions);
// xml2js options: explicitArray keeps the default; 'strict: false' makes the SAX parser lenient
const looseParser = new RSSParser({ ...baseOptions, xml2js: { strict: false, trim: true } });

export async function fetchFeed(rssUrl: string) {
  try {
    const feed = await strictParser.parseURL(rssUrl);
    return feed.items ?? [];
  } catch (strictErr: unknown) {
    // If it looks like an XML parse error, retry with the lenient parser
    const msg = strictErr instanceof Error ? strictErr.message : String(strictErr);
    if (msg.includes("Attribute without value") || msg.includes("Non-whitespace") || msg.includes("Unencoded")) {
      const feed = await looseParser.parseURL(rssUrl);
      return feed.items ?? [];
    }
    throw strictErr;
  }
}

// ────────────────────────────────────────────────────────────
// Guardar un ítem en raw_items (ignorar duplicados por URL)
// ────────────────────────────────────────────────────────────
async function saveItem(
  client: PoolClient,
  sourceId: string,
  item: RSSParser.Item
): Promise<"inserted" | "skipped"> {
  const url = item.link ?? item.guid;
  if (!url) return "skipped";

  const title = item.title?.trim() ?? "(sin título)";
  const bodyRaw = item.contentSnippet ?? item.content ?? item.summary ?? null;
  const publishedAt = item.pubDate ? new Date(item.pubDate) : null;

  try {
    const res = await client.query(
      `INSERT INTO raw_items (source_id, title, body_raw, url, published_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (url) DO NOTHING
       RETURNING id`,
      [sourceId, title, bodyRaw, url, publishedAt]
    );
    return res.rowCount && res.rowCount > 0 ? "inserted" : "skipped";
  } catch {
    return "skipped";
  }
}

// ────────────────────────────────────────────────────────────
// Ingestar una sola fuente
// ────────────────────────────────────────────────────────────
export async function ingestSource(source: Source): Promise<IngestResult> {
  const pool = getPool();
  const client = await pool.connect();

  let fetched = 0;
  let inserted = 0;
  let skipped = 0;

  try {
    const items = await fetchFeed(source.rss_url);
    fetched = items.length;

    for (const item of items) {
      const result = await saveItem(client, source.id, item);
      if (result === "inserted") inserted++;
      else skipped++;
    }

    return { source: source.name, fetched, inserted, skipped };
  } catch (err: unknown) {
    return {
      source: source.name,
      fetched,
      inserted,
      skipped,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    client.release();
  }
}

// ────────────────────────────────────────────────────────────
// Ingestar TODAS las fuentes activas con RSS
// ────────────────────────────────────────────────────────────
export async function ingestAllSources(): Promise<IngestResult[]> {
  const pool = getPool();
  const client = await pool.connect();

  let sources: Source[];
  try {
    const { rows } = await client.query<Source>(
      `SELECT id, name, rss_url
       FROM sources
       WHERE active = true AND rss_url IS NOT NULL
       ORDER BY name`
    );
    sources = rows;
  } finally {
    client.release();
  }

  if (sources.length === 0) {
    console.log("⚠️  No hay fuentes activas con RSS.");
    return [];
  }

  // Procesar en serie para no saturar la DB ni los servidores externos
  const results: IngestResult[] = [];
  for (const source of sources) {
    const result = await ingestSource(source);
    results.push(result);
  }

  return results;
}
