-- =============================================================
-- Project News — Migración 001: Esquema inicial
-- Basado en SRS §5 (Modelo de datos)
-- Aplicar con: npx tsx scripts/migrate.ts
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- ENUMS
-- ──────────────────────────────────────────────────────────────
CREATE TYPE source_type AS ENUM ('official', 'aggregator', 'individual');
CREATE TYPE issue_status AS ENUM ('draft', 'preview', 'published');
CREATE TYPE group_status  AS ENUM ('pending', 'selected', 'rejected');

-- ──────────────────────────────────────────────────────────────
-- TABLA: sources
-- Una fila por fuente de información (blog, newsletter, etc.)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE sources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  type        source_type NOT NULL,
  url         TEXT        NOT NULL,          -- URL canónica de la fuente
  rss_url     TEXT,                          -- NULL si no tiene RSS (scraping en fases siguientes)
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX sources_rss_url_idx ON sources (rss_url) WHERE rss_url IS NOT NULL;

-- ──────────────────────────────────────────────────────────────
-- TABLA: raw_items
-- Cada artículo/post ingerido en crudo antes de cualquier procesado.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE raw_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id    UUID        NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  body_raw     TEXT,                          -- Contenido completo o resumen del feed
  url          TEXT        NOT NULL,
  published_at TIMESTAMPTZ,                   -- Fecha del post según el feed
  ingested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Evita duplicados: misma URL no se ingesta dos veces
CREATE UNIQUE INDEX raw_items_url_idx ON raw_items (url);
-- Índice para filtrar por semana de ingesta
CREATE INDEX raw_items_ingested_at_idx ON raw_items (ingested_at DESC);
CREATE INDEX raw_items_source_id_idx   ON raw_items (source_id);

-- ──────────────────────────────────────────────────────────────
-- TABLA: weekly_issues
-- Una fila por edición semanal de la newsletter.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE weekly_issues (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date DATE         NOT NULL UNIQUE,   -- Lunes de la semana (ISO)
  status          issue_status NOT NULL DEFAULT 'draft',
  web_url         TEXT,                            -- URL pública una vez publicada
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX weekly_issues_status_idx ON weekly_issues (status);

-- ──────────────────────────────────────────────────────────────
-- TABLA: topic_groups
-- Agrupación de raw_items que hablan del mismo evento/tema.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE topic_groups (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id              UUID         NOT NULL REFERENCES weekly_issues(id) ON DELETE CASCADE,
  representative_title TEXT         NOT NULL,      -- Título representativo del grupo
  relevance_score      NUMERIC(4,2),               -- 0.00–10.00, asignado por Gemini
  status               group_status NOT NULL DEFAULT 'pending',
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX topic_groups_week_id_idx ON topic_groups (week_id);
CREATE INDEX topic_groups_status_idx  ON topic_groups (status);

-- ──────────────────────────────────────────────────────────────
-- TABLA: topic_group_items
-- Relación N:N entre topic_groups y raw_items.
-- Un raw_item puede pertenecer a un solo grupo (simplificación MVP).
-- ──────────────────────────────────────────────────────────────
CREATE TABLE topic_group_items (
  topic_group_id UUID NOT NULL REFERENCES topic_groups(id) ON DELETE CASCADE,
  raw_item_id    UUID NOT NULL REFERENCES raw_items(id)    ON DELETE CASCADE,
  PRIMARY KEY (topic_group_id, raw_item_id)
);

CREATE INDEX topic_group_items_raw_item_idx ON topic_group_items (raw_item_id);

-- ──────────────────────────────────────────────────────────────
-- TABLA: issue_items
-- Noticias seleccionadas para una edición, con el texto final generado.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE issue_items (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_issue_id    UUID        NOT NULL REFERENCES weekly_issues(id) ON DELETE CASCADE,
  topic_group_id     UUID        NOT NULL REFERENCES topic_groups(id)  ON DELETE CASCADE,
  headline           TEXT        NOT NULL,    -- Titular final (Gemini)
  implication_summary TEXT       NOT NULL,    -- "Qué significa" (Gemini)
  category           TEXT,                    -- e.g. 'google-updates', 'ai-search', 'tools'
  sort_order         SMALLINT    NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX issue_items_weekly_issue_idx ON issue_items (weekly_issue_id, sort_order);
