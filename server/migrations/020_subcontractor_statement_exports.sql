-- Migration 020 (ported from Whizz-Away migration 012, unchanged apart from
-- this note): subcontractor statements are derived from legs_m2 on demand
-- (server/models/subcontractors/statementDerivation.js); this table freezes
-- what an exported statement actually said.
--
-- Migration: snapshot a subcontractor statement at the moment it is exported.
--
-- Why: subcontractor_statements is a materialised view in all but name -- the
-- generator recomputes every amount from the CURRENT legs_m2.driverrate on each
-- run (see the comment in utils/subcontractorStatementGeneration.js), so a
-- statement silently changes whenever a leg is corrected. That is fine for a
-- working figure and useless as a record of what was actually handed to a
-- subcontractor.
--
-- This table records the other half: the frozen content of a statement at the
-- instant someone printed or exported it, plus the rendered document itself in
-- S3. Rows here are immutable history and are never regenerated.
--
-- Division of responsibility:
--   audit_log  -> WHO exported, WHEN, from where (one row per export action)
--   this table -> WHAT the document said (one row per distinct content version)
-- The two join on content_hash, which the audit row carries in its metadata.
-- The snapshot payload deliberately does NOT live in audit_log.metadata: the
-- audit middleware clips arrays at 20 entries and truncates at 8000 chars, so a
-- busy subbie's leg list would be silently cut in half.

CREATE TABLE IF NOT EXISTS subcontractor_statement_exports (
    export_id        BIGSERIAL PRIMARY KEY,

    -- Statement identity. `period` is the first day of the month the LEGS were
    -- driven -- not the legacy subcontractor_statements.date, which stores the
    -- 1st of the FOLLOWING month and forces every consumer to subtract a day.
    subbie_reg_num   TEXT          NOT NULL,
    period           DATE          NOT NULL,
    vat_status       TEXT          NOT NULL
                     CHECK (vat_status IN ('VAT', 'NON_VAT')),

    -- Frozen content, exactly as rendered into the document.
    amount           NUMERIC(12,2) NOT NULL,
    leg_count        INTEGER       NOT NULL,
    legs             JSONB         NOT NULL,

    -- sha256 over the canonical payload (see models/subcontractors/
    -- statementExportModel.js). A re-export whose hash matches the latest
    -- snapshot reuses that row instead of inserting a duplicate, so this table
    -- holds versions rather than one row per button press.
    content_hash     TEXT          NOT NULL,

    -- The rendered document in the operational S3 bucket. Nullable because the
    -- snapshot is written first and the client uploads the file it rendered
    -- immediately afterwards; a NULL key means that second step never landed.
    document_key     TEXT,
    document_format  TEXT          CHECK (document_format IN ('PDF', 'XLSX')),
    document_size    INTEGER,
    document_at      TIMESTAMPTZ,

    -- Actor, denormalised so the trail survives a user being renamed or
    -- deleted -- same convention as audit_log.actor_name (migration 010).
    exported_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    exported_by      INTEGER,
    exported_by_name VARCHAR(255)
);

-- The viewer's only query shape: "every export for this subbie/period/bucket,
-- newest first". One composite index serves the filter and the ordering.
CREATE INDEX IF NOT EXISTS idx_subbie_stmt_exports_lookup
    ON subcontractor_statement_exports
       (subbie_reg_num, period, vat_status, exported_at DESC);

-- Used on every export to compare against the latest stored version.
CREATE INDEX IF NOT EXISTS idx_subbie_stmt_exports_hash
    ON subcontractor_statement_exports (content_hash);

-- "what did this person export, and when" for the audit report.
CREATE INDEX IF NOT EXISTS idx_subbie_stmt_exports_actor
    ON subcontractor_statement_exports (exported_by, exported_at);

-- Verify
SELECT COUNT(*) AS existing_export_rows FROM subcontractor_statement_exports;
