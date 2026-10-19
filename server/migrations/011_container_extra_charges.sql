-- Migration: Selected extra charges per container.
-- Extends client_rate_extra_charge (010) down to the instruction: when a
-- container is captured, the operator can select which of the client rate's
-- optional extra charges apply to that specific container. We snapshot the
-- charge name + amount at capture time (rather than referencing
-- client_rate_extra_charge by id) so edits to the client rate later don't
-- silently change amounts already billed on an existing instruction.

BEGIN;

CREATE TABLE IF NOT EXISTS public.container_extra_charge (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    containerkey integer NOT NULL,
    charge_name text NOT NULL,
    amount numeric(12,2) NOT NULL DEFAULT 0,
    created_at date DEFAULT CURRENT_DATE,
    CONSTRAINT container_extra_charge_amount_check CHECK (amount >= 0)
);

ALTER TABLE public.container_extra_charge
    DROP CONSTRAINT IF EXISTS container_extra_charge_containerkey_fkey;
ALTER TABLE public.container_extra_charge
    ADD CONSTRAINT container_extra_charge_containerkey_fkey
    FOREIGN KEY (containerkey)
    REFERENCES public.container (containerkey) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_container_extra_charge_containerkey
    ON public.container_extra_charge (containerkey);

COMMIT;

-- Verify
SELECT COUNT(*) AS container_extra_charges FROM public.container_extra_charge;
