BEGIN;

-- Enforce one expense record per purchase order number.
-- This makes upload-slip idempotent when paired with INSERT .. ON CONFLICT (orderno) DO UPDATE.
ALTER TABLE expenses_m2
  ADD CONSTRAINT expenses_m2_orderno_unique UNIQUE (orderno);

COMMIT;
