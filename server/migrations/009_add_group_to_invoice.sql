-- Migration: Group-level invoices.
-- Going forward one combined invoice is generated per instruction group (once
-- every child instruction is assigned, documented and the group is finalised).
-- New-style invoices set instruction_group_id and leave m1key NULL; legacy
-- per-instruction invoices keep their m1key and are backfilled with the group
-- their instruction belongs to, so group-aware queries cover both eras.
--
-- Depends on: 008_create_instruction_groups.sql

BEGIN;

ALTER TABLE public.invoice
    ADD COLUMN IF NOT EXISTS instruction_group_id integer;

ALTER TABLE public.invoice
    DROP CONSTRAINT IF EXISTS invoice_instruction_group_id_fkey;
ALTER TABLE public.invoice
    ADD CONSTRAINT invoice_instruction_group_id_fkey
    FOREIGN KEY (instruction_group_id)
    REFERENCES public.instruction_group (group_key) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_invoice_instruction_group_id
    ON public.invoice (instruction_group_id);

-- Exactly one combined invoice per group for new-style invoices (m1key IS NULL).
-- Legacy rows (m1key set) are excluded: a multi-invoice history on the same
-- backfilled group must not make this migration fail.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_invoice_per_group
    ON public.invoice (instruction_group_id)
    WHERE instruction_group_id IS NOT NULL AND m1key IS NULL;

-- Backfill legacy invoices with their instruction's group.
UPDATE public.invoice i
SET instruction_group_id = m.instruction_group_id
FROM public.m1_controller m
WHERE i.m1key = m.m1key
  AND i.instruction_group_id IS NULL;

COMMIT;

-- Verify: legacy invoices left without a group (0 unless invoice.m1key points
-- at a deleted/missing instruction — inspect any rows this reports)
SELECT COUNT(*) AS legacy_invoices_without_group
FROM public.invoice
WHERE m1key IS NOT NULL AND instruction_group_id IS NULL;
