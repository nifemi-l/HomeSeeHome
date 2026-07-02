-- Incremental migration: allow Feature.x_pos/y_pos/z_pos to be NULL (safe for existing DBs).
-- NULL marks a feature as not yet placed in the 3D view (list-view items start unplaced).
-- Idempotent: DROP NOT NULL is a no-op if already nullable.

ALTER TABLE Feature ALTER COLUMN x_pos DROP NOT NULL;
ALTER TABLE Feature ALTER COLUMN y_pos DROP NOT NULL;
ALTER TABLE Feature ALTER COLUMN z_pos DROP NOT NULL;
