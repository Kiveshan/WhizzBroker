-- Migration: Assign individual containers to an assignment leg.
--
-- Assignments used to be one leg per child instruction (legnumber = 1, the whole
-- instruction implicitly going to one subcontractor). The controller now picks
-- the instruction, then picks which containers of it a given subcontractor is
-- taking, so an instruction can have several legs — one per subbie load.
--
-- container.legkey is the link. A container belongs to at most one leg, which is
-- exactly the rule the assignment UI needs: containers with legkey IS NOT NULL
-- are already spoken for and must not be offered again. ON DELETE SET NULL means
-- removing an assignment automatically releases its containers back into the
-- pool rather than orphaning them.

BEGIN;

ALTER TABLE public.container
    ADD COLUMN IF NOT EXISTS legkey integer;

ALTER TABLE public.container
    DROP CONSTRAINT IF EXISTS container_legkey_fkey;
ALTER TABLE public.container
    ADD CONSTRAINT container_legkey_fkey
    FOREIGN KEY (legkey)
    REFERENCES public.legs_m2 (legkey) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_container_legkey
    ON public.container (legkey);

-- Backfill in-flight grouped instructions: their single legnumber = 1 leg
-- covered every container of the instruction, so point every container at it.
-- Scoped to grouped instructions deliberately — legacy ungrouped instructions
-- use the multi-leg UpdateInstruction flow, which already tracks containers per
-- leg via legs_m2.containernumber and must not be rewritten here.
UPDATE public.container c
SET legkey = l.legkey
FROM public.legs_m2 l
JOIN public.m1_controller m ON m.m1key = l.m1key
WHERE c.m1key = l.m1key
  AND c.legkey IS NULL
  AND l.legnumber = 1
  AND m.instruction_group_id IS NOT NULL;

COMMIT;

-- Verify
SELECT COUNT(*) FILTER (WHERE legkey IS NOT NULL) AS assigned_containers,
       COUNT(*) FILTER (WHERE legkey IS NULL)     AS unassigned_containers
FROM public.container;
