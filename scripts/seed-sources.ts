#!/usr/bin/env tsx
/**
 * scripts/seed-sources.ts
 * Inserta las fuentes de información del SRS §2 en la tabla "sources".
 * Solo incluye fuentes con RSS en esta fase (Fase 1).
 * Fuentes sin RSS (scraping, X, LinkedIn) se añadirán en fases siguientes.
 *
 * IDEMPOTENTE: usa ON CONFLICT (rss_url) DO NOTHING para no duplicar filas.
 *
 * Ejecutar: npx tsx scripts/seed-sources.ts
 */
import "dotenv/config";
import { getPool } from "@/lib/db";

// ─────────────────────────────────────────────────────────────
// Fuentes con RSS — SRS §2
// rss_url: URL directa del feed (verificadas o marcadas como [PENDIENTE])
// ─────────────────────────────────────────────────────────────
const SOURCES = [
  // ── Oficiales ──────────────────────────────────────────────
  {
    name: "Google Search Central Blog",
    type: "official" as const,
    url: "https://developers.google.com/search/blog",
    rss_url: "https://feeds.feedburner.com/blogspot/amDG", // ✅ FeedBurner histórico oficial sigue activo y sirviendo developers.google.com/search/blog
    active: true,
  },
  {
    name: "OpenAI Blog",
    type: "official" as const,
    url: "https://openai.com/blog",
    rss_url: "https://openai.com/blog/rss.xml",
    active: true,
  },
  {
    name: "Anthropic News",
    type: "official" as const,
    url: "https://www.anthropic.com/news",
    rss_url: null, // ⚠️ PENDIENTE: Anthropic no tiene RSS público confirmado
    active: false, // desactivada hasta confirmar URL del feed
  },

  // ── Agregadoras / newsletters ───────────────────────────────
  {
    name: "Search Engine Land",
    type: "aggregator" as const,
    url: "https://searchengineland.com",
    rss_url: "https://searchengineland.com/feed",
    active: true,
  },
  {
    name: "Search Engine Journal",
    type: "aggregator" as const,
    url: "https://www.searchenginejournal.com",
    rss_url: "https://www.searchenginejournal.com/feed/",
    active: true,
  },
  {
    name: "Search Engine Roundtable",
    type: "aggregator" as const,
    url: "https://www.seroundtable.com",
    rss_url: "https://www.seroundtable.com/index.rdf", // ✅ Feed real (confirmado en <link rel="alternate">)
    active: true,
  },
  {
    name: "Moz Blog",
    type: "aggregator" as const,
    url: "https://moz.com/blog",
    rss_url: "https://moz.com/blog/feed",
    active: true,
  },
  {
    name: "Ahrefs Blog",
    type: "aggregator" as const,
    url: "https://ahrefs.com/blog",
    rss_url: "https://ahrefs.com/blog/feed/",
    active: true,
  },
  {
    name: "SEOFOMO",
    type: "aggregator" as const,
    url: "https://www.seofomo.co",
    rss_url: "https://hub.seofomo.co/feed/", // ✅ Confirmado: redirige desde /rss y /feed
    active: true,
  },

  // ── Voces individuales con blog/RSS ─────────────────────────
  {
    name: "iPullRank (Mike King)",
    type: "individual" as const,
    url: "https://ipullrank.com",
    rss_url: "https://ipullrank.com/feed/",
    active: true,
  },
] satisfies Array<{
  name: string;
  type: "official" | "aggregator" | "individual";
  url: string;
  rss_url: string | null;
  active: boolean;
}>;

async function main() {
  console.log("🌱 Sembrando fuentes en la tabla 'sources'...\n");

  const pool = getPool();
  const client = await pool.connect();

  try {
    let inserted = 0;
    let skipped = 0;
    let pending = 0;

    for (const source of SOURCES) {
      // Check if already exists by name (works for both NULL and non-NULL rss_url)
      const existing = await client.query(
        "SELECT id FROM sources WHERE name = $1",
        [source.name]
      );

      if (existing.rowCount && existing.rowCount > 0) {
        console.log(`  ⏭️  Ya existe: ${source.name}`);
        skipped++;
        continue;
      }

      await client.query(
        `INSERT INTO sources (name, type, url, rss_url, active)
         VALUES ($1, $2, $3, $4, $5)`,
        [source.name, source.type, source.url, source.rss_url, source.active]
      );

      if (!source.rss_url) {
        console.log(`  ⚠️  Registrada (sin RSS aún): ${source.name}`);
        pending++;
      } else {
        console.log(`  ✅ Insertada: ${source.name}`);
        inserted++;
      }
    }

    console.log(`\n📊 Resumen: ${inserted} insertadas, ${pending} sin RSS (desactivadas), ${skipped} ya existían.`);
    console.log("\n⚠️  Fuentes pendientes de URL RSS:");
    SOURCES.filter((s) => !s.rss_url).forEach((s) =>
      console.log(`   - ${s.name} (${s.url})`)
    );
    console.log("\n👉 Siguiente: npm run pipeline:ingest (Paso 3 — Ingesta RSS)");

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
