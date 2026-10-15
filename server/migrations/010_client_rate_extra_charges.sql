-- Migration: Custom extra charges per client rate.
-- A client rate (m5_client_rate row = one route for one client) can now carry
-- any number of named extra charges (e.g. "Toll fee" 350.00). These appear as
-- additional lines on the combined group invoice and feed the instruction cost
-- calculation.
--
-- ON DELETE CASCADE: charges belong to their rate row. NOTE FOR APP CODE:
-- saveClientRates currently deletes and reinserts all of a client's rates,
-- which would silently cascade-delete these charges. That save flow must be
-- changed to update rates in place (or re-insert the charges in the same
-- transaction) before the extra-charges UI ships.

BEGIN;

CREATE TABLE IF NOT EXISTS public.client_rate_extra_charge (
    charge_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    client_rate_id integer NOT NULL,
    charge_name text NOT NULL,
    amount numeric(12,2) NOT NULL DEFAULT 0,
    created_at date DEFAULT CURRENT_DATE,
    CONSTRAINT client_rate_extra_charge_amount_check CHECK (amount >= 0)
);

ALTER TABLE public.client_rate_extra_charge
    DROP CONSTRAINT IF EXISTS client_rate_extra_charge_client_rate_id_fkey;
ALTER TABLE public.client_rate_extra_charge
    ADD CONSTRAINT client_rate_extra_charge_client_rate_id_fkey
    FOREIGN KEY (client_rate_id)
    REFERENCES public.m5_client_rate (client_rate_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_client_rate_extra_charge_rate_id
    ON public.client_rate_extra_charge (client_rate_id);

COMMIT;

-- Verify
SELECT COUNT(*) AS extra_charges FROM public.client_rate_extra_charge;
