-- Migration 021: index the remaining unindexed foreign-key join columns, and
-- validate the one FK that was added NOT VALID.
--
-- Ported unchanged from Whizz-Away migration 015. The broker-only link
-- columns (instruction_group_id, container.legkey, rate cards, extra charges)
-- are indexed by their own migrations (008-015) and are not repeated here.
--
-- Why: Postgres does not index the referencing side of a FK automatically.
-- Every join from a parent to these children, and every ON DELETE check against
-- them, is a sequential scan. Measured locally (pg_stat_user_tables):
-- container had 32,517 seq scans and 0 index scans across ~11k rows, i.e. every
-- instruction/invoice lookup read the whole table.
--
-- Overlap with 007: the first five indexes below are the ones 007 creates, under
-- the same names. They are repeated (IF NOT EXISTS) because 007 was found not to
-- have been applied to every environment; on a database that has 007 they are
-- no-ops. 007's CASCADE -> RESTRICT changes are NOT repeated here; apply 007
-- itself where it is missing.
--
-- Not indexed on purpose:
--   legs_m2.m1key        leading column of legs_m2_unique_assignment_idx
--   wages.employeeid     leading column of unique_wage_per_employee_month_year
--   lookup-table FKs     (roles, shipment, expense_types, suppliers): a handful
--                        of rows each; deletes from them are rare admin actions
--   documents.client     only checked when a client is deleted (rare admin action)
--   m5_driver_rate.driverid, wages.employerid
--                        always NULL; candidates for removal, not indexing
--   statements / aging_analysis
--                        retired tables, history only
--
-- Plain CREATE INDEX (not CONCURRENTLY) inside a transaction, as in 007: the
-- largest table here is ~17k rows, so the write lock is held for milliseconds.

BEGIN;

-- Same as 007
CREATE INDEX IF NOT EXISTS idx_container_m1key ON public.container (m1key);
CREATE INDEX IF NOT EXISTS idx_invoice_m1key ON public.invoice (m1key);
CREATE INDEX IF NOT EXISTS idx_invoice_clientid ON public.invoice (clientid);
CREATE INDEX IF NOT EXISTS idx_payment_m3_clientid ON public.payment_m3 (clientid);
CREATE INDEX IF NOT EXISTS idx_documents_m1key ON public.documents (m1key);

-- New
CREATE INDEX IF NOT EXISTS idx_payment_m3_invoiceid ON public.payment_m3 (invoiceid);
CREATE INDEX IF NOT EXISTS idx_credit_notes_client_id ON public.credit_notes (client_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_m1key ON public.credit_notes (m1key);
CREATE INDEX IF NOT EXISTS idx_m1_controller_client ON public.m1_controller (client);
CREATE INDEX IF NOT EXISTS idx_m1_controller_weight_m1_key ON public.m1_controller_weight (m1_key);
CREATE INDEX IF NOT EXISTS idx_legs_m2_driverid ON public.legs_m2 (driverid);
CREATE INDEX IF NOT EXISTS idx_legs_m2_m5ratekey ON public.legs_m2 (m5ratekey);
CREATE INDEX IF NOT EXISTS idx_expenses_m2_driverid ON public.expenses_m2 (driverid);
CREATE INDEX IF NOT EXISTS idx_expenses_m2_truckid ON public.expenses_m2 (truckid);
CREATE INDEX IF NOT EXISTS idx_m5_client_rate_clientid ON public.m5_client_rate (clientid);
-- Serves the effective-date lookup in analyticsModel
-- (WHERE userid = $1 AND date <= $2 ORDER BY date DESC LIMIT 1).
CREATE INDEX IF NOT EXISTS idx_base_salary_history_userid_date ON public.base_salary_history (userid, date);

-- m5_client_rate.clientid was added NOT VALID, so existing rows were never
-- checked. Verified 0 orphans before writing this; if this fails, find them with:
--   SELECT * FROM m5_client_rate r
--   WHERE NOT EXISTS (SELECT 1 FROM m5_client c WHERE c.m5clientkey = r.clientid);
ALTER TABLE public.m5_client_rate VALIDATE CONSTRAINT clientid;

COMMIT;

ANALYZE public.container, public.invoice, public.payment_m3, public.documents,
        public.credit_notes, public.m1_controller, public.m1_controller_weight,
        public.legs_m2, public.expenses_m2, public.m5_client_rate,
        public.base_salary_history;

-- Verify: should return only the FKs listed under "Not indexed on purpose"
-- (11 rows).
SELECT c.conrelid::regclass AS tbl, c.conname
FROM pg_constraint c
WHERE c.contype = 'f'
  AND c.connamespace = 'public'::regnamespace
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid
      AND (i.indkey::int2[])[0:cardinality(c.conkey) - 1] @> c.conkey
  )
ORDER BY 1, 2;
