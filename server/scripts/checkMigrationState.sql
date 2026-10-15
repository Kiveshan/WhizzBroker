-- Read-only: reports which migrations in server/migrations look applied on
-- the connected database, by checking for an object each one creates. There is
-- no migration-tracking table, so run this before applying migrations to an
-- environment whose state you don't know (e.g. production).
--
--   psql -h <host> -U <user> -d <db> -f server/scripts/checkMigrationState.sql
--
-- 007 is checked through its effect (client FK on m1_controller is RESTRICT,
-- not CASCADE), because its indexes are re-created by 021 anyway.
SET default_transaction_read_only = on;

SELECT migration, applied FROM (VALUES
  ('001 driver rate effective dates', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'm5_driver_rate' AND column_name = 'effective_from')),
  ('002 expenses_m2 orderno unique',  EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_m2_orderno_unique')),
  ('003 add-on instruction link',     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'm1_controller' AND column_name = 'addon_id')),
  ('004 legs_m2.dn',                  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'legs_m2' AND column_name = 'dn')),
  ('005 client rate fuel surcharge',  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'm5_client_rate' AND column_name = 'fuel_surcharge')),
  ('006 audit_log.entity_type',       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'entity_type')),
  ('007 cascade -> restrict',         EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'm1_controller_client_fkey' AND confdeltype = 'r')),
  ('008 instruction groups',          to_regclass('public.instruction_group') IS NOT NULL),
  ('009 invoice.instruction_group_id', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice' AND column_name = 'instruction_group_id')),
  ('010 client rate extra charges',   to_regclass('public.client_rate_extra_charge') IS NOT NULL),
  ('011 container extra charges',     to_regclass('public.container_extra_charge') IS NOT NULL),
  ('012 container.legkey',            EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'container' AND column_name = 'legkey')),
  ('013 subcontractor lookup indexes', to_regclass('public.idx_m5_employee_roleid_subei_reg_num') IS NOT NULL),
  ('014 shared rate cards',           to_regclass('public.rate_card') IS NOT NULL),
  ('015 rate titles',                 EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'm1_controller' AND column_name = 'rate_title')),
  ('016 legs_m2 NULL-safe unique',    to_regclass('public.legs_m2_unique_assignment_idx') IS NOT NULL),
  ('017 money columns numeric',       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'm1_controller' AND column_name = 'total_cost' AND data_type = 'numeric')),
  ('018 audit_log full coverage',     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'http_method')),
  ('019 client statement exports',    to_regclass('public.client_statement_exports') IS NOT NULL),
  ('020 subcontractor stmt exports',  to_regclass('public.subcontractor_statement_exports') IS NOT NULL),
  ('021 FK indexes',                  to_regclass('public.idx_payment_m3_invoiceid') IS NOT NULL)
) AS m(migration, applied)
ORDER BY migration;
