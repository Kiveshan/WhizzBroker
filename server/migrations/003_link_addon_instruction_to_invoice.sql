-- Migration: Link add-on instructions to add-on invoices (1:1)
-- An add-on instruction is a row in m1_controller with shipment type "Add-On" (type 5).
-- An add-on invoice is a row in add_ons (ADN-YYYYMMDD-### numbers).
-- This adds a one-to-one link so an add-on instruction cannot be completed
-- without being attached to an existing add-on invoice.

BEGIN;

-- Link column on the instruction, pointing at the add-on invoice.
-- Nullable so non-add-on instructions and not-yet-linked add-ons are unaffected.
-- ON DELETE SET NULL: deleting an add-on invoice simply unlinks the instruction.
ALTER TABLE public.m1_controller
  ADD COLUMN IF NOT EXISTS addon_id INTEGER;

ALTER TABLE public.m1_controller
  ADD CONSTRAINT m1_controller_addon_id_fkey
  FOREIGN KEY (addon_id) REFERENCES public.add_ons(addon_id) ON DELETE SET NULL;

-- Enforce one-to-one: an add-on invoice can be linked to at most one instruction.
-- Partial index so the many NULLs (non-add-on / unlinked) don't collide.
CREATE UNIQUE INDEX IF NOT EXISTS idx_m1_controller_addon_id_unique
  ON public.m1_controller(addon_id)
  WHERE addon_id IS NOT NULL;

-- Speeds up the backfill match query (client + reference lookup against add_ons).
CREATE INDEX IF NOT EXISTS idx_add_ons_client_refs
  ON public.add_ons(client_id, booking_ref, client_ref);

COMMIT;
