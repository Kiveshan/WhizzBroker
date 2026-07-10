import "dotenv/config";
import { generateStatementsForMonth } from "../utils/subcontractorStatementGeneration.js";
import { pool } from "../config/database.js";

const args = process.argv.slice(2);

// --- build list of months to process ---
let months = [];

if (args[0] === "--all") {
  // Reprocess every month that already has statements, so stale stored rates are
  // recomputed from the current legs_m2.driverrate + instruction VAT.
  // Each statement's `date` is the generation date (1st of its month).
  const { rows } = await pool.query(`
    SELECT DISTINCT
      EXTRACT(YEAR FROM date)::int  AS year,
      EXTRACT(MONTH FROM date)::int AS month
    FROM subcontractor_statements
    ORDER BY year, month
  `);
  months = rows.map((r) => ({ year: r.year, month: r.month }));

  if (months.length === 0) {
    console.log("No existing statements found; nothing to backfill.");
    await pool.end();
    process.exit(0);
  }
  console.log(
    `Found ${months.length} month(s) with statements to reprocess:`,
    months.map((m) => `${m.year}-${String(m.month).padStart(2, "0")}`).join(", ")
  );
} else if (args[0] === "--range") {
  // --range 2026-01 2026-06
  const [fromYear, fromMonth] = args[1].split("-").map(Number);
  const [toYear, toMonth] = args[2].split("-").map(Number);

  let y = fromYear, m = fromMonth;
  while (y < toYear || (y === toYear && m <= toMonth)) {
    months.push({ year: y, month: m });
    m++;
    if (m > 12) { m = 1; y++; }
  }
} else {
  // single month: <year> <month> [subei_reg_num]
  const year = parseInt(args[0]);
  const month = parseInt(args[1]);
  if (!year || !month || month < 1 || month > 12) {
    console.error("Usage:");
    console.error("  Single month : node scripts/backfillSubcontractorStatements.js <year> <month> [subei_reg_num]");
    console.error("  Date range   : node scripts/backfillSubcontractorStatements.js --range <YYYY-MM> <YYYY-MM>");
    console.error("  All existing : node scripts/backfillSubcontractorStatements.js --all");
    console.error("");
    console.error("Examples:");
    console.error("  node scripts/backfillSubcontractorStatements.js 2025 3");
    console.error("  node scripts/backfillSubcontractorStatements.js 2025 3 SC001");
    console.error("  node scripts/backfillSubcontractorStatements.js --range 2026-01 2026-06");
    console.error("  node scripts/backfillSubcontractorStatements.js --all");
    process.exit(1);
  }
  months.push({ year, month, subeiRegNum: args[2] || null });
}

// A specific subcontractor filter only applies to the single-month form.
const subeiRegNum =
  args[0] !== "--range" && args[0] !== "--all" ? args[2] || null : null;

for (const { year, month } of months) {
  const label = `${year}-${String(month).padStart(2, "0")}${subeiRegNum ? ` (${subeiRegNum})` : ""}`;
  console.log(`\nProcessing ${label}...`);
  try {
    const result = await generateStatementsForMonth(year, month, subeiRegNum);
    console.log(`  Done: ${result.message}`);
    console.log(`  Stats:`, result.stats);
  } catch (err) {
    console.error(`  Failed for ${label}:`, err.message);
  }
}

console.log("\nBackfill complete.");
await pool.end();
process.exit(0);
