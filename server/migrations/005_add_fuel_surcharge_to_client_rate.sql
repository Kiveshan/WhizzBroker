BEGIN;

-- Fuel surcharge percentage applied to a client's base route rates.
-- Stored per rate row so it can be set the same across all of a client's
-- rates or customised per route. When an instruction is created/updated the
-- percentage uplifts the base rates (6m, 12m, break-bulk/set rate) that are
-- pulled for the selected route.
ALTER TABLE m5_client_rate
  ADD COLUMN IF NOT EXISTS fuel_surcharge NUMERIC;

COMMIT;
