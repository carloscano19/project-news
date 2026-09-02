-- =============================================================
-- Project News — Migración 002: Unique index en issue_items
-- Garantiza que un topic_group no pueda insertarse dos veces en issue_items
-- =============================================================

CREATE UNIQUE INDEX IF NOT EXISTS issue_items_topic_group_unique_idx 
ON issue_items (topic_group_id);
