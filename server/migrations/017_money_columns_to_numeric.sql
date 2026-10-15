-- Migration 017: store money as NUMERIC(12,2) instead of double precision.
--
-- Ported from Whizz-Away migration 016 (commit 83f3ef9a), adapted for the
-- broker schema: adds the shared rate card table (rate_card_rate), drops and
-- recreates client_effective_rate (migration 015) around the type change, and
-- leaves out Whizz-Away's expenses_with_po_v (that view does not exist here).
--
-- Why: ~70 money columns were float8, so values carry binary rounding error and
-- some rows already hold sub-cent amounts (e.g. add_ons.amount 1265.2875,
-- payment_m3.amount 22824.9235, legs_m2.driverrate 3248.375). Newer columns
-- (paid_amount, insurance, the export snapshots, surcharge_12m_amount) were
-- already NUMERIC(12,2); this brings the older ones in line.
--
-- App impact: none expected. config/database.js parses NUMERIC with parseFloat
-- and pg-types parses _numeric arrays to floats too, so the JS side receives the
-- same number types as before. Existing SQL that casts to ::numeric for ROUND()
-- keeps working; numeric/float8 comparisons are implicitly cast.
--
-- Data changes made by this migration:
--   1. Every value is rounded to 2dp (half away from zero). The pre-flight
--      query below lists the rows whose stored value changes; each moves by
--      under half a cent.
--   2. NaN becomes NULL. base_salary_history.base and m5_employee.base_salary
--      held NaN (written by employeeModal when the salary field was submitted
--      empty). Every reader already treats it as 0 via `parseFloat(x) || 0`,
--      and NULL reads the same way, so payroll output does not change.
--
-- Deliberately left as float8 (weights in tonnes, not money):
--   m1_controller_weight.weight, legs_m2.vgm, container.weight,
--   m1_controller.weight. legs_m2.vgm is also inside the expression of
--   legs_m2_unique_assignment_idx.
-- Already NUMERIC here: fuel_surcharge, paid_amount, historical_set_rate,
-- surcharge_12m_amount and the extra-charge tables.
-- Also left: credit_notes.vat (never written or read by the app; candidate
-- for removal) and the unconstrained NUMERIC columns on the retired
-- statements / aging_analysis / subcontractor_statements tables.
--
-- Each ALTER TABLE rewrites its table once and holds an ACCESS EXCLUSIVE lock
-- for the duration; the largest table is ~17k rows, so this takes seconds. Run
-- it outside working hours anyway, and take a snapshot first.

-- ---------------------------------------------------------------------------
-- Pre-flight (read-only): rows whose value will change. Review before COMMIT.
-- ---------------------------------------------------------------------------
SELECT 'add_ons.amount' AS col, addon_id::text AS id, amount::text AS before, round(amount::numeric, 2)::text AS after
  FROM add_ons WHERE amount::numeric <> round(amount::numeric, 2)
UNION ALL
SELECT 'payment_m3.amount', paykey::text, amount::text, round(amount::numeric, 2)::text
  FROM payment_m3 WHERE amount::numeric <> round(amount::numeric, 2)
UNION ALL
SELECT 'legs_m2.driverrate', legkey::text, driverrate::text, round(driverrate::numeric, 2)::text
  FROM legs_m2 WHERE driverrate::numeric <> round(driverrate::numeric, 2)
UNION ALL
SELECT 'm5_driver_rate.subie_six_meter_rate', m5ratekey::text, subie_six_meter_rate::text, round(subie_six_meter_rate::numeric, 2)::text
  FROM m5_driver_rate WHERE subie_six_meter_rate::numeric <> round(subie_six_meter_rate::numeric, 2)
UNION ALL
SELECT 'rate_card_rate.6m_rate', rate_card_rate_id::text, "6m_rate"::text, round("6m_rate"::numeric, 2)::text
  FROM rate_card_rate WHERE "6m_rate"::numeric <> round("6m_rate"::numeric, 2)
UNION ALL
SELECT 'm5_client_rate.6m_rate', client_rate_id::text, "6m_rate"::text, round("6m_rate"::numeric, 2)::text
  FROM m5_client_rate WHERE "6m_rate"::numeric <> round("6m_rate"::numeric, 2)
UNION ALL
SELECT 'base_salary_history.base (NaN)', id::text, 'NaN', 'NULL'
  FROM base_salary_history WHERE base = 'NaN'
UNION ALL
SELECT 'm5_employee.base_salary (NaN)', userid::text, 'NaN', 'NULL'
  FROM m5_employee WHERE base_salary = 'NaN'
ORDER BY 1, 2;

BEGIN;

-- client_effective_rate reads the m5_client_rate and rate_card_rate money
-- columns, which blocks the type change. Dropped here and recreated unchanged
-- (definition copied from migration 015) below.
DROP VIEW IF EXISTS public.client_effective_rate;

-- The array check references NULL::double precision; recreated for numeric below.
ALTER TABLE public.credit_notes DROP CONSTRAINT IF EXISTS credit_notes_amount_array_check;

ALTER TABLE public.add_ons
  ALTER COLUMN amount TYPE numeric(12,2) USING NULLIF(amount, 'NaN')::numeric(12,2);

ALTER TABLE public.base_salary_history
  ALTER COLUMN base TYPE numeric(12,2) USING NULLIF(base, 'NaN')::numeric(12,2);

ALTER TABLE public.container
  ALTER COLUMN "Hazardous Amount" TYPE numeric(12,2) USING NULLIF("Hazardous Amount", 'NaN')::numeric(12,2),
  ALTER COLUMN "Surcharge Amount" TYPE numeric(12,2) USING NULLIF("Surcharge Amount", 'NaN')::numeric(12,2),
  ALTER COLUMN "vgm amount"       TYPE numeric(12,2) USING NULLIF("vgm amount", 'NaN')::numeric(12,2);

-- Casting to numeric(12,2)[] applies the typmod (and rounding) to each element.
ALTER TABLE public.credit_notes
  ALTER COLUMN amount TYPE numeric(12,2)[] USING amount::numeric(12,2)[];

ALTER TABLE public.employee_deduction_history
  ALTER COLUMN deduction_bonus            TYPE numeric(12,2) USING NULLIF(deduction_bonus, 'NaN')::numeric(12,2),
  ALTER COLUMN deduction_damage           TYPE numeric(12,2) USING NULLIF(deduction_damage, 'NaN')::numeric(12,2),
  ALTER COLUMN deduction_income_tax       TYPE numeric(12,2) USING NULLIF(deduction_income_tax, 'NaN')::numeric(12,2),
  ALTER COLUMN deduction_loan             TYPE numeric(12,2) USING NULLIF(deduction_loan, 'NaN')::numeric(12,2),
  ALTER COLUMN deduction_other_deductions TYPE numeric(12,2) USING NULLIF(deduction_other_deductions, 'NaN')::numeric(12,2),
  ALTER COLUMN deduction_savings          TYPE numeric(12,2) USING NULLIF(deduction_savings, 'NaN')::numeric(12,2),
  ALTER COLUMN deduction_uif              TYPE numeric(12,2) USING NULLIF(deduction_uif, 'NaN')::numeric(12,2),
  -- A rate, not an amount: keep 4dp so fractional rates survive.
  ALTER COLUMN income_tax_rate            TYPE numeric(7,4)  USING NULLIF(income_tax_rate, 'NaN')::numeric(7,4);

ALTER TABLE public.expenses_m2
  ALTER COLUMN expensecost TYPE numeric(12,2) USING NULLIF(expensecost, 'NaN')::numeric(12,2);

ALTER TABLE public.legs_m2
  ALTER COLUMN driverrate TYPE numeric(12,2) USING NULLIF(driverrate, 'NaN')::numeric(12,2);

ALTER TABLE public.m1_controller
  ALTER COLUMN rateper_12        TYPE numeric(12,2) USING NULLIF(rateper_12, 'NaN')::numeric(12,2),
  ALTER COLUMN rateper_6         TYPE numeric(12,2) USING NULLIF(rateper_6, 'NaN')::numeric(12,2),
  ALTER COLUMN rateper_abnormal  TYPE numeric(12,2) USING NULLIF(rateper_abnormal, 'NaN')::numeric(12,2),
  ALTER COLUMN rateper_breakbulk TYPE numeric(12,2) USING NULLIF(rateper_breakbulk, 'NaN')::numeric(12,2),
  ALTER COLUMN surcharge         TYPE numeric(12,2) USING NULLIF(surcharge, 'NaN')::numeric(12,2),
  ALTER COLUMN total_cost        TYPE numeric(12,2) USING NULLIF(total_cost, 'NaN')::numeric(12,2),
  ALTER COLUMN unitrate          TYPE numeric(12,2) USING NULLIF(unitrate, 'NaN')::numeric(12,2);

ALTER TABLE public.m5_client
  ALTER COLUMN driver_six_meter_rate    TYPE numeric(12,2) USING NULLIF(driver_six_meter_rate, 'NaN')::numeric(12,2),
  ALTER COLUMN driver_twelve_meter_rate TYPE numeric(12,2) USING NULLIF(driver_twelve_meter_rate, 'NaN')::numeric(12,2);

ALTER TABLE public.m5_client_rate
  ALTER COLUMN "12m_rate"   TYPE numeric(12,2) USING NULLIF("12m_rate", 'NaN')::numeric(12,2),
  ALTER COLUMN "6m_rate"    TYPE numeric(12,2) USING NULLIF("6m_rate", 'NaN')::numeric(12,2),
  ALTER COLUMN hazardous    TYPE numeric(12,2) USING NULLIF(hazardous, 'NaN')::numeric(12,2),
  ALTER COLUMN set_rate     TYPE numeric(12,2) USING NULLIF(set_rate, 'NaN')::numeric(12,2),
  ALTER COLUMN surcharge12m TYPE numeric(12,2) USING NULLIF(surcharge12m, 'NaN')::numeric(12,2),
  ALTER COLUMN surcharges   TYPE numeric(12,2) USING NULLIF(surcharges, 'NaN')::numeric(12,2),
  -- The VGM fee charged to the client (money), unlike legs_m2.vgm (a weight).
  ALTER COLUMN vgm          TYPE numeric(12,2) USING NULLIF(vgm, 'NaN')::numeric(12,2);

ALTER TABLE public.rate_card_rate
  ALTER COLUMN "12m_rate"   TYPE numeric(12,2) USING NULLIF("12m_rate", 'NaN')::numeric(12,2),
  ALTER COLUMN "6m_rate"    TYPE numeric(12,2) USING NULLIF("6m_rate", 'NaN')::numeric(12,2),
  ALTER COLUMN hazardous    TYPE numeric(12,2) USING NULLIF(hazardous, 'NaN')::numeric(12,2),
  ALTER COLUMN set_rate     TYPE numeric(12,2) USING NULLIF(set_rate, 'NaN')::numeric(12,2),
  ALTER COLUMN surcharge12m TYPE numeric(12,2) USING NULLIF(surcharge12m, 'NaN')::numeric(12,2),
  ALTER COLUMN surcharges   TYPE numeric(12,2) USING NULLIF(surcharges, 'NaN')::numeric(12,2),
  ALTER COLUMN vgm          TYPE numeric(12,2) USING NULLIF(vgm, 'NaN')::numeric(12,2);

ALTER TABLE public.m5_driver_rate
  ALTER COLUMN driver_six_meter_rate    TYPE numeric(12,2) USING NULLIF(driver_six_meter_rate, 'NaN')::numeric(12,2),
  ALTER COLUMN driver_twelve_meter_rate TYPE numeric(12,2) USING NULLIF(driver_twelve_meter_rate, 'NaN')::numeric(12,2),
  ALTER COLUMN subie_rate               TYPE numeric(12,2) USING NULLIF(subie_rate, 'NaN')::numeric(12,2),
  ALTER COLUMN subie_six_meter_rate     TYPE numeric(12,2) USING NULLIF(subie_six_meter_rate, 'NaN')::numeric(12,2),
  ALTER COLUMN subie_twelve_meter_rate  TYPE numeric(12,2) USING NULLIF(subie_twelve_meter_rate, 'NaN')::numeric(12,2);

ALTER TABLE public.m5_employee
  ALTER COLUMN base_salary                TYPE numeric(12,2) USING NULLIF(base_salary, 'NaN')::numeric(12,2),
  ALTER COLUMN deduction_bonus            TYPE numeric(12,2) USING NULLIF(deduction_bonus, 'NaN')::numeric(12,2),
  ALTER COLUMN deduction_damage           TYPE numeric(12,2) USING NULLIF(deduction_damage, 'NaN')::numeric(12,2),
  ALTER COLUMN deduction_income_tax       TYPE numeric(12,2) USING NULLIF(deduction_income_tax, 'NaN')::numeric(12,2),
  ALTER COLUMN deduction_loan             TYPE numeric(12,2) USING NULLIF(deduction_loan, 'NaN')::numeric(12,2),
  ALTER COLUMN deduction_other_deductions TYPE numeric(12,2) USING NULLIF(deduction_other_deductions, 'NaN')::numeric(12,2),
  ALTER COLUMN deduction_savings          TYPE numeric(12,2) USING NULLIF(deduction_savings, 'NaN')::numeric(12,2),
  ALTER COLUMN deduction_uif              TYPE numeric(12,2) USING NULLIF(deduction_uif, 'NaN')::numeric(12,2),
  ALTER COLUMN loan_amount                TYPE numeric(12,2) USING NULLIF(loan_amount, 'NaN')::numeric(12,2),
  ALTER COLUMN income_tax_rate            TYPE numeric(7,4)  USING NULLIF(income_tax_rate, 'NaN')::numeric(7,4);

ALTER TABLE public.m5_trailers
  ALTER COLUMN purchase_price TYPE numeric(12,2) USING NULLIF(purchase_price, 'NaN')::numeric(12,2);

ALTER TABLE public.m5_trucks
  ALTER COLUMN purchase_price TYPE numeric(12,2) USING NULLIF(purchase_price, 'NaN')::numeric(12,2);

ALTER TABLE public.payment_m3
  ALTER COLUMN amount TYPE numeric(12,2) USING NULLIF(amount, 'NaN')::numeric(12,2);

ALTER TABLE public.purchase_orders
  ALTER COLUMN total      TYPE numeric(12,2) USING NULLIF(total, 'NaN')::numeric(12,2),
  ALTER COLUMN unit_price TYPE numeric(12,2) USING NULLIF(unit_price, 'NaN')::numeric(12,2),
  ALTER COLUMN vat        TYPE numeric(12,2) USING NULLIF(vat, 'NaN')::numeric(12,2);

ALTER TABLE public.tax_deductions
  ALTER COLUMN remuneration_lower TYPE numeric(12,2) USING NULLIF(remuneration_lower, 'NaN')::numeric(12,2),
  ALTER COLUMN remuneration_upper TYPE numeric(12,2) USING NULLIF(remuneration_upper, 'NaN')::numeric(12,2),
  ALTER COLUMN tax                TYPE numeric(12,2) USING NULLIF(tax, 'NaN')::numeric(12,2);

ALTER TABLE public.wages
  ALTER COLUMN salary_rate           TYPE numeric(12,2) USING NULLIF(salary_rate, 'NaN')::numeric(12,2),
  ALTER COLUMN salary_total          TYPE numeric(12,2) USING NULLIF(salary_total, 'NaN')::numeric(12,2),
  ALTER COLUMN overtime_rate         TYPE numeric(12,2) USING NULLIF(overtime_rate, 'NaN')::numeric(12,2),
  ALTER COLUMN overtime_total        TYPE numeric(12,2) USING NULLIF(overtime_total, 'NaN')::numeric(12,2),
  ALTER COLUMN public_holidays_rate  TYPE numeric(12,2) USING NULLIF(public_holidays_rate, 'NaN')::numeric(12,2),
  ALTER COLUMN public_holidays_total TYPE numeric(12,2) USING NULLIF(public_holidays_total, 'NaN')::numeric(12,2),
  ALTER COLUMN allowance_rate        TYPE numeric(12,2) USING NULLIF(allowance_rate, 'NaN')::numeric(12,2),
  ALTER COLUMN allowance_total       TYPE numeric(12,2) USING NULLIF(allowance_total, 'NaN')::numeric(12,2),
  ALTER COLUMN short_pay_rate        TYPE numeric(12,2) USING NULLIF(short_pay_rate, 'NaN')::numeric(12,2),
  ALTER COLUMN short_pay_total       TYPE numeric(12,2) USING NULLIF(short_pay_total, 'NaN')::numeric(12,2),
  ALTER COLUMN total_earnings        TYPE numeric(12,2) USING NULLIF(total_earnings, 'NaN')::numeric(12,2),
  ALTER COLUMN total_deductions      TYPE numeric(12,2) USING NULLIF(total_deductions, 'NaN')::numeric(12,2),
  ALTER COLUMN net_pay               TYPE numeric(12,2) USING NULLIF(net_pay, 'NaN')::numeric(12,2);

ALTER TABLE public.credit_notes
  ADD CONSTRAINT credit_notes_amount_array_check
  CHECK (array_length(amount, 1) IS NOT NULL AND array_position(amount, NULL::numeric) IS NULL);

CREATE VIEW public.client_effective_rate AS
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

-- Verify: should return only the four weight columns and credit_notes.vat.
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type IN ('double precision', 'real')
ORDER BY 1, 2;
