import "dotenv/config";
import { pool } from "../config/database.js";

/**
 * Audit-log retention.
 *
 * The audit trail records every state-changing request, so it grows steadily —
 * roughly 350–400 MB per million rows once metadata is included. This trims
 * entries older than a retention horizon.
 *
 * Dry run by default: it reports what would go and changes nothing. Deleting
 * audit history is irreversible and may have compliance implications, so
 * --apply is deliberately explicit.
 *
 *   node scripts/pruneAuditLog.js                     # dry run, 24-month horizon
 *   node scripts/pruneAuditLog.js --months 12         # dry run, 12-month horizon
 *   node scripts/pruneAuditLog.js --months 24 --apply # actually delete
 *
 * Login failures and denials are kept regardless of age unless --include-security
 * is passed — those are the entries most likely to be wanted years later.
 */

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const includeSecurity = args.includes("--include-security");
const monthsArg = args.indexOf("--months");
const months = monthsArg !== -1 ? Number(args[monthsArg + 1]) : 24;

if (!Number.isInteger(months) || months < 1) {
  console.error("--months must be a positive whole number of months.");
  process.exit(1);
}

const SECURITY_ACTIONS = ["LOGIN_FAILED", "LOGIN_DENIED", "LOGIN_ERROR", "PASSWORD_CHANGE"];

const conditions = [`timestamp < NOW() - ($1 || ' months')::interval`];
const params = [String(months)];
if (!includeSecurity) {
  params.push(SECURITY_ACTIONS);
  conditions.push(`action_type <> ALL($2)`);
}
const where = `WHERE ${conditions.join(" AND ")}`;

const { rows: preview } = await pool.query(
  `SELECT COUNT(*)::int AS doomed,
          MIN(timestamp) AS oldest,
          MAX(timestamp) AS newest
     FROM audit_log ${where}`,
  params
);
const { doomed, oldest, newest } = preview[0];

const { rows: sizeRows } = await pool.query(
  `SELECT COUNT(*)::int AS total,
          pg_size_pretty(pg_total_relation_size('audit_log')) AS size
     FROM audit_log`
);

console.log(`audit_log: ${sizeRows[0].total} rows, ${sizeRows[0].size} on disk`);
console.log(
  `Retention horizon: ${months} months` +
    (includeSecurity ? " (including security events)" : " (security events kept)")
);

if (doomed === 0) {
  console.log("Nothing older than the horizon — nothing to do.");
  await pool.end();
  process.exit(0);
}

console.log(
  `${doomed} row(s) eligible, spanning ${new Date(oldest).toISOString().slice(0, 10)} ` +
    `to ${new Date(newest).toISOString().slice(0, 10)}.`
);

if (!apply) {
  console.log("\nDry run — nothing deleted. Re-run with --apply to delete these rows.");
  await pool.end();
  process.exit(0);
}

const { rowCount } = await pool.query(`DELETE FROM audit_log ${where}`, params);
console.log(`Deleted ${rowCount} row(s).`);
console.log("Run VACUUM (ANALYZE) audit_log to return the space to the table.");

await pool.end();
