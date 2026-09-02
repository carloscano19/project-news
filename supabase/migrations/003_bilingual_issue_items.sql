-- =============================================================
-- Project News — Migración 003: Soporte bilingüe en issue_items
-- =============================================================

-- 1. Añadir columnas bilingües estructuradas
ALTER TABLE issue_items
  ADD COLUMN IF NOT EXISTS headline_es TEXT,
  ADD COLUMN IF NOT EXISTS headline_en TEXT,
  ADD COLUMN IF NOT EXISTS what_happened_es TEXT,
  ADD COLUMN IF NOT EXISTS what_happened_en TEXT,
  ADD COLUMN IF NOT EXISTS why_it_matters_es TEXT,
  ADD COLUMN IF NOT EXISTS why_it_matters_en TEXT;

-- 2. Migrar datos existentes en español
UPDATE issue_items
SET 
  headline_es = COALESCE(headline_es, headline),
  what_happened_es = COALESCE(
    what_happened_es, 
    TRIM(REPLACE(SPLIT_PART(implication_summary, '**Qué significa:**', 1), '**Qué pasó:**', ''))
  ),
  why_it_matters_es = COALESCE(
    why_it_matters_es, 
    TRIM(SPLIT_PART(implication_summary, '**Qué significa:**', 2))
  )
WHERE headline_es IS NULL OR what_happened_es IS NULL;
