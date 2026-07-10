BEGIN;

-- Per-driver KSM DN Number selection for cross-haul break bulk (shipment type 4).
-- Sourced from m1_controller_weight.ksm_dm_no; stored on each driver row in legs_m2.
ALTER TABLE legs_m2
  ADD COLUMN IF NOT EXISTS dn TEXT;

COMMIT;
