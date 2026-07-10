-- Migration: Stop deletes from cascading into financial/operational history,
-- close the duplicate-login-email hole, and index the hot FK join columns.
--
-- 1) CASCADE -> RESTRICT on the destructive paths. Before this migration:
--    - deleting a CLIENT cascade-deleted every instruction they ever had,
--      which cascaded on to containers, legs, documents, credit notes
--    - deleting a SHIPMENT TYPE (5-row lookup table) would delete every
--      instruction of that type
--    - deleting a DRIVER RATE (or a whole route via the route editor)
--      cascade-deleted the legs_m2 work records that used it
--    - deleting a CLIENT also cascade-deleted their payment records and
--      credit notes (financial documents with retention requirements)
--    After: those deletes are refused while dependent rows exist. The app's
--    soft-delete (status flag) flows are unaffected. Deliberate cascades are
--    kept: instruction -> containers/legs/documents (the FC delete flow).

BEGIN;

ALTER TABLE public.m1_controller DROP CONSTRAINT IF EXISTS m1_controller_client_fkey;
ALTER TABLE public.m1_controller
    ADD CONSTRAINT m1_controller_client_fkey FOREIGN KEY (client)
    REFERENCES public.m5_client (m5clientkey) ON DELETE RESTRICT;

ALTER TABLE public.m1_controller DROP CONSTRAINT IF EXISTS m1_controller_shipment_type_fkey;
ALTER TABLE public.m1_controller
    ADD CONSTRAINT m1_controller_shipment_type_fkey FOREIGN KEY (shipment_type)
    REFERENCES public.shipment (shipkey) ON DELETE RESTRICT;

ALTER TABLE public.legs_m2 DROP CONSTRAINT IF EXISTS legs_m2_m5ratekey_fkey;
ALTER TABLE public.legs_m2
    ADD CONSTRAINT legs_m2_m5ratekey_fkey FOREIGN KEY (m5ratekey)
    REFERENCES public.m5_driver_rate (m5ratekey) ON DELETE RESTRICT;

ALTER TABLE public.credit_notes DROP CONSTRAINT IF EXISTS fk_credit_notes_client_id;
ALTER TABLE public.credit_notes
    ADD CONSTRAINT fk_credit_notes_client_id FOREIGN KEY (client_id)
    REFERENCES public.m5_client (m5clientkey) ON DELETE RESTRICT;

ALTER TABLE public.credit_notes DROP CONSTRAINT IF EXISTS fk_credit_notes_m1key;
ALTER TABLE public.credit_notes
    ADD CONSTRAINT fk_credit_notes_m1key FOREIGN KEY (m1key)
    REFERENCES public.m1_controller (m1key) ON DELETE RESTRICT;

ALTER TABLE public.payment_m3 DROP CONSTRAINT IF EXISTS payment_m3_clientid_fkey;
ALTER TABLE public.payment_m3
    ADD CONSTRAINT payment_m3_clientid_fkey FOREIGN KEY (clientid)
    REFERENCES public.m5_client (m5clientkey) ON DELETE RESTRICT;

-- 2) No two LOGIN-CAPABLE accounts may share an email. Partial index because
--    drivers/yard staff legitimately share their company's email address but
--    have no password and cannot log in (verified: 0 duplicates among the
--    rows with passwords; e.g. admin@vank.co.za appears 22x without one).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_m5_employee_login_email
    ON public.m5_employee (email)
    WHERE email IS NOT NULL AND email <> '' AND password IS NOT NULL AND password <> '';

-- 3) Indexes for the hot FK join columns (verified missing via pg_indexes).
--    legs_m2.m1key is already covered by the leading column of
--    legs_m2_unique_assignment.
CREATE INDEX IF NOT EXISTS idx_container_m1key ON public.container (m1key);
CREATE INDEX IF NOT EXISTS idx_invoice_m1key ON public.invoice (m1key);
CREATE INDEX IF NOT EXISTS idx_invoice_clientid ON public.invoice (clientid);
CREATE INDEX IF NOT EXISTS idx_payment_m3_clientid ON public.payment_m3 (clientid);
CREATE INDEX IF NOT EXISTS idx_documents_m1key ON public.documents (m1key);

COMMIT;

-- Verify
SELECT conname, confdeltype FROM pg_constraint
WHERE conname IN (
  'm1_controller_client_fkey', 'm1_controller_shipment_type_fkey',
  'legs_m2_m5ratekey_fkey', 'fk_credit_notes_client_id',
  'fk_credit_notes_m1key', 'payment_m3_clientid_fkey'
) ORDER BY conname;
