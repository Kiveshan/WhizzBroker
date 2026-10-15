-- Migration: Rate titles.
--
-- The client is a brokerage: controllers pick a rate by a free-text title
-- (e.g. "DBN-JHB Express"), not by starting point + destination, and the same
-- lane can carry several differently priced rates. So:
--
--   * m5_client_rate and rate_card_rate get a required title; starting_point
--     and destination become optional.
--   * The title is the rate's identity: unique per client (own rates) and per
--     card, compared case-insensitively with whitespace collapsed
--     (rate_title_key). A client's own rate overrides a card rate with the
--     same title key.
--   * Instructions record the chosen title in m1_controller.rate_title; rate
--     lookups go by (client, title). Instructions captured before this
--     migration have no title unless backfilled below, and fall back to
--     (client, pickup, dropoff).
--
-- Existing rates are backfilled with "Start → Destination" (de-duplicated
-- with a " (2)" suffix if a client or card had the same lane twice), so
-- current pricing is unchanged.
--
-- Requires 014_shared_rate_cards.sql.

BEGIN;

-- Normalised comparison key for titles. IMMUTABLE so it can back indexes.
CREATE OR REPLACE FUNCTION public.rate_title_key(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$ SELECT lower(regexp_replace(btrim(coalesce(t, '')), '\s+', ' ', 'g')) $$;

CREATE OR REPLACE FUNCTION public.rate_default_title(start_point text, dest text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(btrim(coalesce(start_point, '')), '\s+', ' ', 'g')
         || ' → ' ||
         regexp_replace(btrim(coalesce(dest, '')), '\s+', ' ', 'g')
$$;

-- ---------- Client rates ----------

ALTER TABLE public.m5_client_rate ADD COLUMN IF NOT EXISTS title text;

WITH numbered AS (
  SELECT client_rate_id,
         rate_default_title(starting_point, destination) AS base,
         ROW_NUMBER() OVER (
           PARTITION BY clientid, rate_title_key(rate_default_title(starting_point, destination))
           ORDER BY client_rate_id
         ) AS n
  FROM public.m5_client_rate
  WHERE title IS NULL OR btrim(title) = ''
)
UPDATE public.m5_client_rate cr
SET title = CASE WHEN numbered.n = 1 THEN numbered.base ELSE numbered.base || ' (' || numbered.n || ')' END
FROM numbered
WHERE cr.client_rate_id = numbered.client_rate_id;

ALTER TABLE public.m5_client_rate ALTER COLUMN title SET NOT NULL;
ALTER TABLE public.m5_client_rate DROP CONSTRAINT IF EXISTS m5_client_rate_title_not_blank;
ALTER TABLE public.m5_client_rate ADD CONSTRAINT m5_client_rate_title_not_blank CHECK (btrim(title) <> '');

CREATE UNIQUE INDEX IF NOT EXISTS uq_m5_client_rate_title
    ON public.m5_client_rate (clientid, rate_title_key(title));

-- ---------- Rate card routes ----------

ALTER TABLE public.rate_card_rate ADD COLUMN IF NOT EXISTS title text;

WITH numbered AS (
  SELECT rate_card_rate_id,
         rate_default_title(starting_point, destination) AS base,
         ROW_NUMBER() OVER (
           PARTITION BY rate_card_id, rate_title_key(rate_default_title(starting_point, destination))
           ORDER BY rate_card_rate_id
         ) AS n
  FROM public.rate_card_rate
  WHERE title IS NULL OR btrim(title) = ''
)
UPDATE public.rate_card_rate rr
SET title = CASE WHEN numbered.n = 1 THEN numbered.base ELSE numbered.base || ' (' || numbered.n || ')' END
FROM numbered
WHERE rr.rate_card_rate_id = numbered.rate_card_rate_id;

ALTER TABLE public.rate_card_rate ALTER COLUMN title SET NOT NULL;
ALTER TABLE public.rate_card_rate DROP CONSTRAINT IF EXISTS rate_card_rate_title_not_blank;
ALTER TABLE public.rate_card_rate ADD CONSTRAINT rate_card_rate_title_not_blank CHECK (btrim(title) <> '');
ALTER TABLE public.rate_card_rate ALTER COLUMN starting_point DROP NOT NULL;
ALTER TABLE public.rate_card_rate ALTER COLUMN destination DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_rate_card_rate_title
    ON public.rate_card_rate (rate_card_id, rate_title_key(title));

-- ---------- Instructions ----------

ALTER TABLE public.m1_controller ADD COLUMN IF NOT EXISTS rate_title text;

-- Give existing instructions the title of the client rate they were priced
-- from, where that rate still exists (exact route match, as lookups did).
UPDATE public.m1_controller m
SET rate_title = cr.title
FROM public.m5_client_rate cr
WHERE m.rate_title IS NULL
  AND cr.clientid = m.client
  AND cr.starting_point = m.pickup
  AND cr.destination = m.dropoff;

-- ---------- Effective-rate view ----------
-- Same rows and order as 014; title and title_key are appended (CREATE OR
-- REPLACE VIEW can only add columns at the end).
CREATE OR REPLACE VIEW public.client_effective_rate AS
SELECT
    cr.clientid,
    cr.starting_point,
    cr.destination,
    cr."6m_rate",
    cr."12m_rate",
    cr.surcharges,
    cr.surcharge12m,
    cr.hazardous,
    cr.vgm,
    cr.set_rate,
    cr.fuel_surcharge,
    'client'::text AS rate_source,
    cr.client_rate_id AS source_rate_id,
    NULL::integer AS rate_card_id,
    NULL::text AS rate_card_name,
    0 AS source_rank,
    COALESCE((
        SELECT json_agg(json_build_object(
                   'charge_id', e.charge_id,
                   'charge_name', e.charge_name,
                   'amount', e.amount
               ) ORDER BY e.charge_id)
        FROM public.client_rate_extra_charge e
        WHERE e.client_rate_id = cr.client_rate_id
    ), '[]'::json) AS extra_charges,
    cr.title,
    public.rate_title_key(cr.title) AS title_key
FROM public.m5_client_rate cr
UNION ALL
SELECT
    crc.clientid,
    rr.starting_point,
    rr.destination,
    rr."6m_rate",
    rr."12m_rate",
    rr.surcharges,
    rr.surcharge12m,
    rr.hazardous,
    rr.vgm,
    rr.set_rate,
    COALESCE(crc.fuel_surcharge, rr.fuel_surcharge) AS fuel_surcharge,
    'card'::text AS rate_source,
    rr.rate_card_rate_id AS source_rate_id,
    rc.rate_card_id,
    rc.name AS rate_card_name,
    crc.priority AS source_rank,
    COALESCE((
        SELECT json_agg(json_build_object(
                   'charge_id', e.charge_id,
                   'charge_name', e.charge_name,
                   'amount', e.amount
               ) ORDER BY e.charge_id)
        FROM public.rate_card_extra_charge e
        WHERE e.rate_card_rate_id = rr.rate_card_rate_id
    ), '[]'::json) AS extra_charges,
    rr.title,
    public.rate_title_key(rr.title) AS title_key
FROM public.client_rate_card crc
JOIN public.rate_card rc ON rc.rate_card_id = crc.rate_card_id AND rc.status = true
JOIN public.rate_card_rate rr ON rr.rate_card_id = rc.rate_card_id;

COMMIT;

-- Verify: both counts must be 0
SELECT
  (SELECT COUNT(*) FROM public.m5_client_rate WHERE title IS NULL) AS client_rates_without_title,
  (SELECT COUNT(*) FROM public.rate_card_rate WHERE title IS NULL) AS card_routes_without_title,
  (SELECT COUNT(*) FROM public.m1_controller WHERE rate_title IS NOT NULL) AS instructions_with_title;
