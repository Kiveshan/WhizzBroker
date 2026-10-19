-- Migration: De-duplicate legs_m2 and make its uniqueness rule NULL-safe.
-- Ported from Whizz-Away 0816b704 (their 009_dedupe_and_guard_legs_m2.sql).
--
-- The existing legs_m2_unique_assignment constraint
--   UNIQUE (m1key, legnumber, driverid, truckregnumber, containernumber, vgm, date)
-- does not prevent duplicate leg-assignment rows whenever any of those columns is
-- NULL, because Postgres treats NULL <> NULL for uniqueness purposes. vgm (and
-- sometimes driverid/date) is frequently NULL for container-based legs, so a
-- double-submit from UpdateInstruction's saveService.js could insert
-- byte-identical rows undetected.
--
-- Broker compatibility: createAssignment (group assignment flow) gives every
-- subbie load its own legnumber (MAX + 1 per m1key), so its rows never share
-- (m1key, legnumber) and are unaffected. The only new rejection is two
-- concurrent assignments of the same subbie, same date, to the same instruction
-- racing to the same MAX + 1 legnumber — which would otherwise produce two
-- loads under one legnumber (and deleteLeg removes by legnumber).
--
-- Unlike Whizz-Away, container.legkey (migration 012) references legs_m2 with
-- ON DELETE SET NULL, so containers on a duplicate row are moved onto the
-- surviving row first rather than being silently released.

BEGIN;

-- Step 1: point containers held by a duplicate at the surviving row (the lowest
-- legkey in each duplicate group).
WITH keep AS (
  SELECT legkey,
         MIN(legkey) OVER (
           PARTITION BY m1key, legnumber,
                        COALESCE(driverid, -1),
                        COALESCE(truckregnumber, ''),
                        COALESCE(containernumber, ''),
                        COALESCE(vgm, -1),
                        COALESCE(date, 'epoch'::date)
         ) AS keep_legkey
  FROM public.legs_m2
)
UPDATE public.container c
SET legkey = k.keep_legkey
FROM keep k
WHERE c.legkey = k.legkey
  AND k.legkey <> k.keep_legkey;

-- Step 2: remove existing exact-duplicate rows, keeping the lowest legkey.
DELETE FROM public.legs_m2 a
USING public.legs_m2 b
WHERE a.legkey > b.legkey
  AND a.m1key = b.m1key
  AND a.legnumber = b.legnumber
  AND a.driverid IS NOT DISTINCT FROM b.driverid
  AND a.truckregnumber IS NOT DISTINCT FROM b.truckregnumber
  AND a.containernumber IS NOT DISTINCT FROM b.containernumber
  AND a.vgm IS NOT DISTINCT FROM b.vgm
  AND a.date IS NOT DISTINCT FROM b.date;

-- Step 3: replace the leaky UNIQUE constraint with an equivalent index that
-- treats NULLs as equal (via COALESCE to sentinel values). Its leading m1key
-- column still covers the legs_m2.m1key lookups migration 007 relied on.
ALTER TABLE public.legs_m2
  DROP CONSTRAINT IF EXISTS legs_m2_unique_assignment;

CREATE UNIQUE INDEX IF NOT EXISTS legs_m2_unique_assignment_idx
  ON public.legs_m2 (
    m1key,
    legnumber,
    COALESCE(driverid, -1),
    COALESCE(truckregnumber, ''),
    COALESCE(containernumber, ''),
    COALESCE(vgm, -1),
    COALESCE(date, 'epoch'::date)
  );

COMMIT;
