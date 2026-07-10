-- Migration: Introduce instruction groups.
-- One "instruction" a controller creates can now contain multiple sub-instructions
-- (each still an m1_controller row, keeping containers/legs/documents/payments/
-- credit-note references intact). This adds the parent table and links every
-- existing instruction to its own single-child group so legacy data renders in
-- the new grouped UIs with no special-casing.
--
-- Rules enforced at the application level (not expressible cleanly in DDL here):
--   - all children of a group share the group's client
--   - group status is driven by the finalise flow (New -> In Progress -> Completed)

BEGIN;

CREATE TABLE IF NOT EXISTS public.instruction_group (
    group_key integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    client integer,
    status text DEFAULT 'New',
    created_at date DEFAULT CURRENT_DATE,
    group_ref text,
    -- provenance: set only for groups created by this migration's backfill,
    -- pointing at the single legacy instruction the group was created for
    backfill_m1key integer
);

ALTER TABLE public.instruction_group
    DROP CONSTRAINT IF EXISTS instruction_group_client_fkey;
ALTER TABLE public.instruction_group
    ADD CONSTRAINT instruction_group_client_fkey FOREIGN KEY (client)
    REFERENCES public.m5_client (m5clientkey) ON DELETE RESTRICT;

-- Link column on the child instruction. RESTRICT: a group may not be deleted
-- while it still has children (the app deletes children first, mirroring the
-- existing FC instruction delete flow).
ALTER TABLE public.m1_controller
    ADD COLUMN IF NOT EXISTS instruction_group_id integer;

ALTER TABLE public.m1_controller
    DROP CONSTRAINT IF EXISTS m1_controller_instruction_group_id_fkey;
ALTER TABLE public.m1_controller
    ADD CONSTRAINT m1_controller_instruction_group_id_fkey
    FOREIGN KEY (instruction_group_id)
    REFERENCES public.instruction_group (group_key) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_m1_controller_instruction_group_id
    ON public.m1_controller (instruction_group_id);

-- Backfill: one group per existing instruction, copying client/status/created_at
-- verbatim. Guarded by instruction_group_id IS NULL so a rerun is a no-op.
WITH new_groups AS (
    INSERT INTO public.instruction_group (client, status, created_at, backfill_m1key)
    SELECT m.client, m.status, m.created_at, m.m1key
    FROM public.m1_controller m
    WHERE m.instruction_group_id IS NULL
    RETURNING group_key, backfill_m1key
)
UPDATE public.m1_controller m
SET instruction_group_id = g.group_key
FROM new_groups g
WHERE m.m1key = g.backfill_m1key;

COMMIT;

-- Verify: both counts must be 0
SELECT
    (SELECT COUNT(*) FROM public.m1_controller WHERE instruction_group_id IS NULL) AS children_without_group,
    (SELECT COUNT(*) FROM public.instruction_group g
     WHERE g.backfill_m1key IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.m1_controller m WHERE m.instruction_group_id = g.group_key)
    ) AS backfilled_groups_without_child;
