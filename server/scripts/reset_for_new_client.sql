-- Reset the database for a new client.
--
-- Wipes every trace of the outgoing client's operational data while preserving
-- the reference data the application cannot rebuild on its own.
--
-- KEPT, and why:
--   roles           - role enum; FK parent of usertable/m5_employee, mirrored in
--                     server/config/roles.js and the client route matrix.
--   shipment        - shipment-type enum; FK parent of m1_controller.
--   expense_types   - generic expense categories, not client-specific.
--   tax_deductions  - SARS PAYE brackets (statutory). NOTE: rows are effective
--                     2024-03-01 and are stale for the current tax year; refresh
--                     them separately, but do not drop the table.
--   usertable       - ONLY the System admin row(s) (roleid 7). Login checks
--                     usertable before m5_employee (models/auth/authModel.js),
--                     and only a System admin can flip a newly-registered
--                     company from 'pending' to 'active'
--                     (models/admin/adminModel.js). Deleting it would leave
--                     nobody able to approve the incoming client's signup.
--                     m5_employee holds no roleid-7 rows, so this is the only
--                     admin account in the system.
--
-- The outgoing client's company profile (usertable, roleid <> 7) IS deleted.
-- The new client re-creates it by registering through the normal signup flow,
-- which inserts the usertable company row and its roleid-1 business manager
-- together (models/auth/authModel.js), after which the System admin approves.
--
-- NOT handled here: S3 objects. documents.s3key plus the document_url/s3key
-- columns on m5_employee, m5_trucks, m5_trailers, expenses_m2 and
-- purchase_orders reference files that survive this wipe. Clean the bucket
-- separately so the previous client's documents do not persist into the new
-- client's tenancy.

BEGIN;

-- One statement so Postgres resolves the FK graph across the whole set at once.
-- CASCADE is a formality: every FK into these tables originates inside the set
-- or points at a preserved lookup table.
TRUNCATE TABLE
    public.add_ons,
    public.aging_analysis,
    public.audit_log,
    public.base_salary_history,
    public.client_rate_extra_charge,
    public.container,
    public.container_extra_charge,
    public.credit_notes,
    public.documents,
    public.employee_deduction_history,
    public.expenses_m2,
    public.instruction_group,
    public.invoice,
    public.legs_m2,
    public.m1_controller,
    public.m1_controller_weight,
    public.m5_client,
    public.m5_client_rate,
    public.m5_driver_rate,
    public.m5_employee,
    public.m5_trailers,
    public.m5_trucks,
    public.payment_m3,
    public.purchase_orders,
    public.statements,
    public.subcontractor_statements,
    public.supplier_expense_types,
    public.suppliers,
    public.wages
RESTART IDENTITY CASCADE;

-- usertable is filtered rather than truncated: keep System admins, drop the
-- outgoing client's company profile. Matched on roleid so an extra admin
-- account added later is preserved too.
DELETE FROM public.usertable
WHERE roleid IS DISTINCT FROM 7;

COMMIT;

-- Verify: every row below must read 0 except the four preserved lookup tables
-- and usertable (which keeps its System admin row(s)).
SELECT 'roles'          AS table_name, COUNT(*) AS rows, 'keep: 9 expected'  AS note FROM public.roles
UNION ALL SELECT 'shipment',       COUNT(*), 'keep: 5 expected'   FROM public.shipment
UNION ALL SELECT 'expense_types',  COUNT(*), 'keep: 12 expected'  FROM public.expense_types
UNION ALL SELECT 'tax_deductions', COUNT(*), 'keep: 129 expected' FROM public.tax_deductions
UNION ALL SELECT 'usertable (admins)', COUNT(*), 'keep: >=1 expected' FROM public.usertable WHERE roleid = 7
UNION ALL SELECT 'usertable (non-admin)', COUNT(*), 'must be 0' FROM public.usertable WHERE roleid IS DISTINCT FROM 7
UNION ALL SELECT 'm5_client',      COUNT(*), 'must be 0' FROM public.m5_client
UNION ALL SELECT 'm5_employee',    COUNT(*), 'must be 0' FROM public.m5_employee
UNION ALL SELECT 'm1_controller',  COUNT(*), 'must be 0' FROM public.m1_controller
UNION ALL SELECT 'instruction_group', COUNT(*), 'must be 0' FROM public.instruction_group
UNION ALL SELECT 'legs_m2',        COUNT(*), 'must be 0' FROM public.legs_m2
UNION ALL SELECT 'container',      COUNT(*), 'must be 0' FROM public.container
UNION ALL SELECT 'documents',      COUNT(*), 'must be 0' FROM public.documents
ORDER BY 1;
