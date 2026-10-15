# Staging → production: test report and go/no-go (15 Oct 2026)

Scope: everything on `staging` from `43e986a` to `5c567f1` (items 1–11 below).
Target tested: the local `staging` branch against a throwaway copy of the local
DB (`pg_dump WhizzBroker | psql wb_verify_tmp`). Kiveshan's DB was only read
(`default_transaction_read_only = on`). Migrations 007 and 017 were applied to
the copy before testing, so every functional test ran on the post-migration
schema prod will have.

**Verdict: GO, but only once the four blockers below are done.** No code defect
blocks the release. One decision (H1, role-5 drivers on group legs) should be
made before the first rate edit or month-audit "apply" in production.

How the testing was done:
- **Server:** `routes/index.js` mounted in-process with signed JWTs for every
  role, real handlers, against the copy. `server.js` was also started as Elastic
  Beanstalk runs it (`NODE_ENV=deployed`).
- **Client:** `CI=true npm test`: 27 suites, **431/431 pass** (run before and
  after the fix below). `npm run build`: compiles, with lint warnings only.
- **Syntax:** `node --check` on all 135 server `.js` files: 0 failures.

---

## Blockers: do these or don't deploy

| # | What | Why | How to check |
|---|------|-----|--------------|
| B1 | **Company record on prod must be TDA's, including bank details** | Statements, invoices and wage slips now take the letterhead and *bank account* from the active `usertable` row with `roleid = 1` (`COMPANY_SQL` in `statementDerivation.js`, `/api/company/details`). On the local DB that row is **"KSM Carriers", account "KSM CARRIERS", Standard 043162274**. If prod looks the same, clients are told to pay KSM's account. | `SELECT userid, companyname, bank, name_of_acc, account_num, branch_code, vat_reg_num FROM usertable WHERE roleid = 1 AND status = 'active';` There must be exactly one row, with TDA's details. |
| B2 | **Migrations 007, then 014 → 021, in order, after a snapshot** | The code reads columns and tables created by 014–020. 007 is not applied on the local DB (still `CASCADE`): without it, deleting a client cascades into its instructions, payments and credit notes. | First run `psql … -f server/scripts/checkMigrationState.sql` (read-only, new in this release). It lists each migration as applied or not. Then see "Migration runbook" below. |
| B3 | **Elastic Beanstalk environment properties** | `JWT_SECRET` is now mandatory. Verified: with `NODE_ENV=deployed` and no `JWT_SECRET`, `server.js` exits 1 with "Refusing to start in production". `S3_BUCKET_NAME` is no longer defaulted to `sherwyn-whizz-away`: unset, the app starts but logs "document uploads and downloads will fail". | Set `JWT_SECRET` (long random, stable). Keep `NODE_ENV=deployed`. Set `S3_BUCKET_NAME`, `Employee_AWS_BUCKET_NAME` and `Trucks_AWS_BUCKET_NAME` to the **WhizzBroker** bucket(s). The local `.env` points all three at Whizz-Away's `sherwyn-whizz-away`; don't copy that. |
| B4 | **Merge `staging` into `main`** | `.github/workflows/deploy-main.yaml` deploys only on push to `main`. `origin/staging` is now at `5c567f1` (pushed today with Kiveshan's OK). | Open a PR from staging to main and merge it **after** B1–B3. The merge triggers the deploy. |

Safe to delete once deployed: the `API_SECRET` EB property, and the
EventBridge rule plus Lambda that called `POST /api/statements/generate`. The
route is gone: it returns 401 without a token and 404 with an admin token.

### Migration runbook

1. Snapshot RDS.
2. `checkMigrationState.sql`: note which of 007 and 014–021 are missing.
3. Preflight for 016, which **deletes** exact-duplicate `legs_m2` rows. Local count: 0.
   ```sql
   SELECT count(*) FROM legs_m2 a JOIN legs_m2 b ON a.legkey > b.legkey
     AND a.m1key = b.m1key AND a.legnumber = b.legnumber
     AND a.driverid IS NOT DISTINCT FROM b.driverid
     AND a.truckregnumber IS NOT DISTINCT FROM b.truckregnumber
     AND a.containernumber IS NOT DISTINCT FROM b.containernumber
     AND a.vgm IS NOT DISTINCT FROM b.vgm AND a.date IS NOT DISTINCT FROM b.date;
   ```
   If it isn't 0, those rows are double-counted pay today. Look at them before they go.
4. Preflight for 021, which validates the `m5_client_rate.clientid` FK and fails on orphans:
   `SELECT * FROM m5_client_rate r WHERE NOT EXISTS (SELECT 1 FROM m5_client c WHERE c.m5clientkey = r.clientid);`
5. **Maintenance window for 017**: it rewrites ~20 tables under `ACCESS EXCLUSIVE`
   locks and drops and recreates `client_effective_rate`. Run it with the app stopped,
   or out of hours. The pre-flight `SELECT` at the top of the file lists every value
   it will round (locally: one add-on, one payment and some driver rates by
   < half a cent, plus `NaN` salaries → `NULL`).
6. Apply them in order with `psql -v ON_ERROR_STOP=1 -f …`: 007, then 014, 015,
   016, 017, 018, 019, 020, 021. Each file wraps its DDL in BEGIN/COMMIT or is
   idempotent.

Measured on the copy (~12k legs, 867 instructions): **007 took 0.3 s, 017 took 0.6 s**.
After 017 only the five intended float columns are left: the four weight
columns and `credit_notes.vat`. `client_effective_rate` kept its 19 columns and
170 rows. Only the rate columns changed, to `numeric`.

Re-running 007 or 015–021 on a migrated DB is a no-op. **Don't re-run 014 after
015**: it fails with "cannot drop columns from view" and rolls back cleanly, so
nothing breaks, but it is not idempotent.

---

## Findings, ranked

### High: needs a decision

**H1. Role-5 drivers on group legs are paid the subcontractor rate, then
"corrected" down to the driver rate.**
The Group Assignment dropdown lists `roleid IN (5, 6)`, and
`resolveAssignmentRate` always prices at the **subcontractor** rate ("these
assignments are always subbies"). Everything downstream goes by the employee's
role instead:
- **Rate refresh** (Manage → edit rate → Continue →
  `POST /api/driver-rates/:id/refresh-legs`) **cut leg 228155 from R2,205.78 to
  R168.00** on the copy (rate 429, role-5 driver 208, In Progress).
- **Month audit** lists these legs as `MISMATCH … NEGATIVE+BIG` (e.g. 228161:
  stored R1,675, "expected" R147). Pressing **apply** would cut them.
- **Commission report** and **subcontractor statements** count only `roleid = 6`.
  A role-5 group leg is missing from the commission's cost (so commission is
  overstated) and never appears on any subcontractor statement.

On the local DB: 3 legs on real groups (228144, 228146, 228161), plus 4 more on
backfilled groups (228151, 228155, 228156, 228158).
Pick one of these:
(a) group assignment lists only `roleid = 6`, and the legs above get reassigned;
(b) refresh, month audit, commission and statements treat any leg priced by the
group flow as a subcontractor leg.
(a) is the smaller change. Until it's decided, don't press "apply" in the month
audit for June, July or October 2026.

### Medium

**M1. Reports are guarded on the client only.** `/api/client-subbie-commission`,
`/api/income-per-client`, `/profit-loss-report`, `/api/vat-recon`,
`/api/aging-analysis`, `/api/debtor-age-analysis`, the turnover endpoints and
`/api/invoices/*` all answer every staff role (2, 3, 8) with 200. In
`routeRoles.js`, `/reports`, `/analytics-reports` and similar screens are for
roles 1 and 4 only. This wasn't in the role-guard brief (8523759), so it's a
gap rather than a regression. Adding `requireRoles(...MANAGEMENT_ROLES)` per
route in `analyticsRoutes.js`, `profitLossRoutes.js` and `vat-reconRoutes.js`
is mechanical, but first check which non-management screens call them (the
debtors aging screen does).

**M2. Instruction 1771 is invoiced twice.** It's on legacy `BB002` (2026-06-14,
R81,000) and on group invoice `INV-2026-62` (2026-05-06). The statement counts
it once, under INV-2026-62 (group preferred). The commission report counts it
under BB002 (latest date). So client 39's May and June figures differ between
the two screens. It's the only instruction like this. Data fix: void one of the
two invoices.

**M3. Error stack traces reach the browser in production.** 43 controller
responses include `error.stack`. Most are gated on
`NODE_ENV === "production"`, but EB runs with `NODE_ENV=deployed`, so the gate
never applies. Only authenticated staff can see them. Fix by checking both
values, or by dropping the stacks.

### Low

- **Orphan invoice** `ikey 578` / `MAC2010C9781` (client 16) has neither
  `m1key` nor `instruction_group_id`. No statement, picker or report can see it.
- **Payment audit naming:** `PAYMENT_CREATED` rows are labelled "payment 41",
  where 41 is the client id from the path. The controller's own audit call
  reads `payment.data?.paymentId`, which doesn't exist (the field is `paykey`).
- **Payment errors come back as HTTP 500** ("has no outstanding balance",
  "same invoice cannot appear twice", overpayment). The message is correct;
  only the status is wrong (should be 400).
- **`COMPANY_SQL` uses `LIMIT 1` with no `ORDER BY`.** If prod ever has two
  active role-1 users, the letterhead is picked arbitrarily. (Prod should have
  exactly one; see B1.)
- **Dead code:** a leftover `isScheduledJob` branch in `middleware/auditTrail.js:255`.
- **CLAUDE.md is stale.** It says the JWT secret is regenerated on every restart;
  it now comes from `JWT_SECRET`, with that fallback only in dev. It also still
  mentions `authenticateScheduledJob`.
- **Public debug routes** `/test-session`, `/set-session-test` and
  `/check-session-test` are reachable without a login and echo session ids.
  They're harmless but unneeded.

### Fixed in this pass

- `finance-clerk-wage-slip.jsx`: when the deductions call returned no data, the
  slip made up R2,000 of tax, UIF and other deductions, printed them, **and
  saved them to `wages`** through the UPSERT. That branch now takes the existing
  error path (no deductions, nothing saved). This is the same bug 7ce2558 fixed
  on the wage-details PDF.
- Added `server/scripts/checkMigrationState.sql` (read-only migration detector).

---

## Item-by-item evidence

**1. Security ports (849bcda, 50d81c3): PASS**
- `server.js` with `NODE_ENV=deployed`, `JWT_SECRET` set, 21 failed logins from
  `X-Forwarded-For: 203.0.113.7, 10.0.0.5`: 20 × 401, then 429. A different
  client IP right after got 401, not 429, so `trust proxy 2` rate-limits per IP.
  The audit rows record `ip_address = 203.0.113.7`.
- No `JWT_SECRET` under `deployed`: exits 1 (see B3).
- Source maps: the workflow builds with `GENERATE_SOURCEMAP=false`. A local
  build without the flag emits 4 `.map` files, as expected.
- HTTPS redirect: `.platform/nginx/conf.d/elasticbeanstalk/https_redirect.conf`
  is present and keys on `X-Forwarded-Proto`, so ALB health checks aren't
  redirected. It can't be exercised locally; check `http://whizzbroker.co.za`
  returns 301 after deploy.
- `authFetch` 401 → login: in `client/src/utils/authFetch.js`, mirroring `api.js`.
- Migration 016: index present on the local DB; 0 duplicates.

**2. Group-invoice payments (b2a6131, 93755fa): PASS.** Tested on INV-2026-61
(client 41, children 1932 and 1933, R13,798.85):

| Step | Result |
|------|--------|
| Picker | total 13,798.85, due 13,798.85, VAT 15 |
| Pay 7,688.85 | 1932 **paid** 7,588.85, 1933 **partial** 100.00, picker due 6,110 |
| Pay 6,110 | both paid (7,588.85 / 6,210.00); invoice leaves the picker |
| Pay a settled invoice / same invoice twice / R999,999 on INV-2026-60 | all refused, children unchanged |
| Controller (role 2) posts a payment | 403 |
| Delete the 2nd payment | back to paid 7,588.85 / partial 100, due 6,110 |
| Delete the 1st payment | both unpaid 0.00, due 13,798.85 |

- Mixed-VAT group INV-2026-64: 6 children, one at 0% VAT. The picker shows VAT
  `null` and due R535,499.25, which matches the existing R100,000 payment.

**3. Server-side role guards (8523759): PASS.** All 279 API routes × roles
{none, 1–9} were run, with each final handler stubbed so only the guards ran:
- Roles 5, 6 and 9 get 403 on everything except `/user-info` and
  `/api/user-role`. No token gives 401, except the 10 public routes (login,
  logout, register, check-email, landing stats, test routes).
- Manager/Director only (31 routes): employee CRUD, client and rate writes,
  rate cards, driver rates and refresh, subcontractor writes, `PUT /api/companies`,
  and the audit log.
- Debtors (3, 1, 4): payments and client statements, including exports (11 routes).
- Creditors (8, 1, 4): credit notes and subcontractor statements, including exports (10 routes).
- Payroll (1, 3, 4, 8): wages and deductions (14 routes).
- Admin only (8 routes): approvals, companies, month audit.
- Everything else (193 routes) is open to any staff role. See M1.

**4. Subcontractor rate sizing (015495f, 87a4150): PASS, except H1**
- `containerTypeFromMix`: 2×6m → 6m; 1×12m + 3×6m → 12m; 2 abnormal + 1×6m →
  abnormal; a 2/2 tie → 6m.
- Month audit (Apr, May, Jun, Jul, Oct 2026) returns 200. Mixed leg 228147
  (claimed `12m, 6m`) is classed **12m**. Break bulk is excluded.
- Refresh never writes R0: rate 430 has subcontractor rates of R0, and a role-6
  leg set to R999 stayed R999 after refresh.
- Break bulk is never repriced: refreshing rate 211 on instruction 1128 updated
  0 legs (R160 kept).
- Mixed-selection warning on the Group Assignment screen: UI only, see the
  manual script.

**5. Commission report (78166f2): PASS.** Recomputed independently in SQL
(children of invoices dated in the month, ex-VAT, role-6 leg cost):

| Client / month | Report revenue | SQL | Subcontractor cost report / SQL |
|---|---|---|---|
| 43 Sep 2026 | 553,585 | 553,585 | 0 / 0 |
| 41 Jul 2026 | 24,248 | 24,248 | 0 / 0 |
| 9 Apr 2026 | 70,950 | 70,950 | 8,388.58 / 8,388.58 |
| 39 May 2026 | 18,000 | 99,000* | 1,675 / – |

\* Instruction 1771 is double-invoiced (M2). Without it the figures match.
Commission isn't clamped at 0 (it's computed as `netRevenue - subcontractorAmount`).

**6. Branding (7ce2558, f950a63): PASS (code); data is B1.** `git grep -i
"ksm|sherwyn"` finds nothing in source. Only the DB column names
`ksm_dm_no`/`ksm_file_ref` remain. `/api/company/details` returns 200 with the
company record. Wage details no longer invents deductions; the wage slip had
the same bug, fixed above.

**7. NUMERIC money and employee edit (c1342ce): PASS.** 017 ran cleanly (see
the runbook). All functional tests above ran after 017. Employee 7 (salary
3,000) edited by a Manager sending a blank salary: the salary stays 3,000 and
no salary or deduction history rows are added. Director sets 3,100: salary
3,100, with one row each in `base_salary_history` and
`employee_deduction_history`. Controller: 403.

**8. Audit trail (d71d9c0): PASS**
- Every one of the 95 write routes logged a named action. No `UNMAPPED_*` rows
  for real paths.
- Rejected requests (401/403) and failed logins (`LOGIN_FAILED`, real IP) are logged.
- One row per payment (not duplicated by the middleware plus the controller).
- Audit Log API: Director 200, Debtors clerk 403.
- `diffInstruction` on instruction 1932 gave rate title, total
  (R6,599.00 → R7,000.00), container removed and container type changed. A
  no-op save produced `[]`.

**9. Client statements (1401ea2): PASS.** Derived all 230 statements
(23 clients × Jan–Oct 2026). **0 errors.** Three checks, each holding in all
230:
- each month's opening balance equals the previous month's closing balance;
- opening + invoices + add-ons − payments − credit notes = closing;
- aging buckets sum to closing.

Mixed-VAT INV-2026-64 shows R635,499.25, which matches a hand calculation per
child. Bad keys return 400 and an unknown client returns 404.

Exports:
- First export inserts a snapshot.
- A second export with the same hash returns `reused: true`.
- A stale hash returns **409 `STATEMENT_CHANGED`**.
- Controller: 403.

Debtor age analytics for month M equal the statement as at the end of M−1
(e.g. analytics "Sep" for client 43 = statement Aug: 90+ days 12,546.50). This
is documented and intended: it keeps the old table's meaning.
`/api/statements/generate` is gone (404).

**10. Subcontractor statements (d19ad82): PASS.** All 30 statements for the 4
subcontractors match SQL exactly on leg count, net (`base_rate`) and gross
(`amount`). Group leg 228147 lists its claimed containers ("REW294, 12M").
Exports insert, then reuse on the second call. Debtors clerk: 403.

**11. Generators removed and migration 021 (5c567f1): PASS.** There are no
references to `API_SECRET`, `authenticateScheduledJob` or `statementGenerator`
outside README's history note. All 16 indexes from 021 are present, and no
constraints are left `NOT VALID`.

---

## Manual UI script (Kiveshan)

Do these on local staging once 007 is applied locally too.

1. **Login lockout:** 21 wrong passwords → "Too many attempts". Correct password
   from another browser/IP still works. (Locally every request comes from one IP.)
2. **Expired token:** edit the stored JWT to garbage → the next click on a
   PO view (`authFetch`) and on any `api.js` screen both land on Login.
3. **Group Assignment mixed warning:** select one 6m and one 12m container for a
   subcontractor → the warning appears and says it will pay the 12m rate. Save →
   the leg rate equals the route's subcontractor 12m rate.
4. **Payments:** steps 1–8 of the group-invoice script in the sibling notes
   (INV-2026-61: pay half, reopen, pay rest, delete both).
5. **Client statement:** open client 43, Sep 2026 → INV-2026-64 at R635,499.25,
   payment R100,000, closing R548,045.75. Download PDF → letterhead and bank
   details are TDA's (B1). Download again → no new snapshot (Audit Log shows
   "Re-issued unchanged").
6. **Subcontractor statement:** 2026-07 VAT for the subcontractor on leg 228147 →
   the leg shows "REW294, 12M".
7. **Wage slip and wage details:** generate for an employee with no deductions
   captured → "No deductions captured", R0.00, letterhead from the company record.
8. **Role spot-check:** log in as a Controller → Payments, Statements, Manage
   and Audit Log aren't in the menu, and deep links bounce to the dashboard.
9. **Audit Log (Director):** edit an instruction's rate title → the row shows the
   before → after summary.
10. **Commission report:** client 39, May 2026 → R18,000 (see M2), not R99,000.
