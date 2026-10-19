-- Migration: Shared rate cards.
--
-- Until now every route rate lived in m5_client_rate, owned by one client, so
-- a lane priced the same for ten clients had to be captured ten times. A rate
-- card is a named, reusable set of routes (same columns as a client rate,
-- plus its own optional extra charges) that can be assigned to any number of
-- clients; a client can hold several cards.
--
-- Resolution order for (client, starting_point, destination):
--   1. the client's own m5_client_rate row (an override: a client paying a
--      different price on a lane that is also on one of their cards)
--   2. the client's assigned cards, in client_rate_card.priority order
--      (lowest first), so when two cards share a lane the higher-priority
--      card wins.
--
-- Fuel surcharge: stored on each card route (same as client rows), but a
-- client's card assignment may carry its own fuel_surcharge percentage that
-- replaces the card's for that client only. Fuel is usually negotiated per
-- customer, so this avoids overriding every route just to change the %.
--
-- All rate lookups read client_effective_rate instead of m5_client_rate:
--   SELECT ... FROM client_effective_rate
--   WHERE clientid = $1 AND starting_point = $2 AND destination = $3
--   ORDER BY source_rank, source_rate_id DESC LIMIT 1
--
-- Amounts already captured on instructions/containers are not affected by a
-- card edit (base rates and extra charges are snapshotted at capture).

BEGIN;

CREATE TABLE IF NOT EXISTS public.rate_card (
    rate_card_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL,
    description text,
    status boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rate_card_name
    ON public.rate_card (LOWER(name));

-- Mirrors m5_client_rate's columns/types so both sources union cleanly.
CREATE TABLE IF NOT EXISTS public.rate_card_rate (
    rate_card_rate_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rate_card_id integer NOT NULL
        REFERENCES public.rate_card (rate_card_id) ON DELETE CASCADE,
    starting_point character varying NOT NULL,
    destination character varying NOT NULL,
    "6m_rate" double precision,
    "12m_rate" double precision,
    surcharges double precision,
    surcharge12m double precision,
    hazardous double precision,
    vgm double precision,
    set_rate double precision,
    fuel_surcharge numeric
);

CREATE INDEX IF NOT EXISTS idx_rate_card_rate_lookup
    ON public.rate_card_rate (rate_card_id, starting_point, destination);

CREATE TABLE IF NOT EXISTS public.rate_card_extra_charge (
    charge_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rate_card_rate_id integer NOT NULL
        REFERENCES public.rate_card_rate (rate_card_rate_id) ON DELETE CASCADE,
    charge_name text NOT NULL,
    amount numeric(12,2) NOT NULL DEFAULT 0,
    created_at date DEFAULT CURRENT_DATE,
    CONSTRAINT rate_card_extra_charge_amount_check CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_rate_card_extra_charge_rate_id
    ON public.rate_card_extra_charge (rate_card_rate_id);

-- Which cards a client uses. ON DELETE RESTRICT on the card: a card still
-- assigned to clients must be unassigned first (the app checks and says so).
CREATE TABLE IF NOT EXISTS public.client_rate_card (
    clientid integer NOT NULL
        REFERENCES public.m5_client (m5clientkey) ON DELETE CASCADE,
    rate_card_id integer NOT NULL
        REFERENCES public.rate_card (rate_card_id) ON DELETE RESTRICT,
    priority integer NOT NULL DEFAULT 1,
    fuel_surcharge numeric,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (clientid, rate_card_id),
    -- 0 is reserved for the client's own override rows in the view below
    CONSTRAINT client_rate_card_priority_check CHECK (priority >= 1),
    CONSTRAINT client_rate_card_fuel_check CHECK (fuel_surcharge IS NULL OR fuel_surcharge >= 0)
);

CREATE INDEX IF NOT EXISTS idx_client_rate_card_card
    ON public.client_rate_card (rate_card_id);

CREATE INDEX IF NOT EXISTS idx_m5_client_rate_lookup
    ON public.m5_client_rate (clientid, starting_point, destination);

-- The single place a client's rate for a route is resolved.
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
    ), '[]'::json) AS extra_charges
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
    ), '[]'::json) AS extra_charges
FROM public.client_rate_card crc
JOIN public.rate_card rc ON rc.rate_card_id = crc.rate_card_id AND rc.status = true
JOIN public.rate_card_rate rr ON rr.rate_card_id = rc.rate_card_id;

COMMIT;

-- Verify
SELECT rate_source, COUNT(*) FROM public.client_effective_rate GROUP BY rate_source;
