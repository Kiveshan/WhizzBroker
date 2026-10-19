-- Migration: widen audit_log so it can record EVERY state-changing request,
-- not just the handful of hand-instrumented business events.
--
-- Migration 006 added entity_type. This one adds the request-level context the
-- automatic audit middleware (server/middleware/auditTrail.js) captures:
-- who (actor name/role), what (method + path + status), and the redacted
-- request payload (metadata).

-- Request context ----------------------------------------------------------
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS http_method   VARCHAR(10);
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS request_path  TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS status_code   INTEGER;
-- SUCCESS | FAILURE | DENIED — derived from the response status.
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS outcome       VARCHAR(20);
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS duration_ms   INTEGER;

-- Actor context. admin_id already holds the acting user's id; these denormalise
-- the name/role at the time of the action so the trail survives user renames
-- and deletions.
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS actor_name    VARCHAR(255);
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS actor_role    INTEGER;

-- Redacted request payload (body/params/query with secrets stripped) plus any
-- extra structured context an explicit call site chooses to attach.
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS metadata      JSONB;

-- Indexes ------------------------------------------------------------------
-- Every viewer query has the same shape: an optional equality filter, a
-- timestamp window, and ORDER BY timestamp DESC LIMIT n. Composite
-- (filter, timestamp) indexes serve the filter and the ordering in one scan;
-- single-column filter indexes would force a bitmap heap scan plus a sort.
-- Column direction is not specified because a btree can be scanned backwards,
-- so these serve DESC ordering as well as ASC.
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_time ON audit_log (entity_type, "timestamp");
CREATE INDEX IF NOT EXISTS idx_audit_log_action_time ON audit_log (action_type, "timestamp");
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_time  ON audit_log (admin_id, "timestamp");

-- "everything that happened to invoice 123"
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_target
  ON audit_log (entity_type, target_employee_id);

-- idx_audit_log_action_type (migration 006) is a strict prefix of
-- idx_audit_log_action_time, so it only costs write throughput now.
-- idx_audit_log_timestamp (006) stays: it drives the unfiltered default view.
DROP INDEX IF EXISTS idx_audit_log_action_type;

-- Deliberately NOT indexed: outcome (three distinct values — too low
-- selectivity for the planner to choose) and details/request_path (the ILIKE
-- search needs pg_trgm to be indexable; the viewer's date window keeps it
-- bounded instead).

-- Existing rows pre-date outcome tracking; they were only ever written on a
-- successful operation, so backfill them as such.
UPDATE audit_log SET outcome = 'SUCCESS' WHERE outcome IS NULL;

-- Verify
SELECT COUNT(*) AS total_rows,
       COUNT(*) FILTER (WHERE outcome = 'SUCCESS') AS success_rows
FROM audit_log;
