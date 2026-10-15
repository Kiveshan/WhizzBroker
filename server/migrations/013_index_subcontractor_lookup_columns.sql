-- Migration: Index the columns the subcontractor ("transporter") list query
-- filters and groups on.
--
-- getAllSubcontractors() (server/models/manage/subbieModel.js) runs on every
-- page load AND is awaited synchronously after every add/edit in
-- saveSubcontractor (client/src/pages/manage/hooks/useApi.js) before the UI
-- reports success. It does WHERE roleid = 6 + GROUP BY subei_reg_num over
-- m5_employee (which also holds every non-subcontractor employee row), plus
-- a LEFT JOIN to a subei_reg_num aggregate over m5_trucks. Neither column
-- was indexed, so both queries sequential-scan the full tables, and that
-- scan time is what the client feels as the "Add" button hanging before the
-- confirmation shows.

CREATE INDEX IF NOT EXISTS idx_m5_employee_roleid_subei_reg_num
    ON public.m5_employee (roleid, subei_reg_num);

CREATE INDEX IF NOT EXISTS idx_m5_trucks_subei_reg_num
    ON public.m5_trucks (subei_reg_num)
    WHERE is_subcontractor = true;
