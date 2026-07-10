import "dotenv/config";
import { pool, query } from "../config/database.js";

/**
 * Backfill: link existing add-on instructions (m1_controller, shipment_type 5)
 * to existing add-on invoices (add_ons) that are not yet linked.
 *
 * Matching strategy (per instruction, scoped to the same client_id):
 *   1. Match on booking_ref AND client_ref (case-insensitive, trimmed).
 *   2. Fall back to booking_ref only, then client_ref only.
 *   For each tier, candidates already linked to another instruction are excluded.
 *   If exactly ONE candidate remains -> link it. Otherwise leave it for manual
 *   review and record it in the report.
 *
 * Usage:
 *   node scripts/backfillAddonInstructionLinks.js            (apply changes)
 *   node scripts/backfillAddonInstructionLinks.js --dry-run  (preview only)
 */

const DRY_RUN = process.argv.includes("--dry-run");

const norm = (v) => (v == null ? "" : String(v).trim().toLowerCase());

async function main() {
  console.log(
    `\nAdd-on instruction → invoice backfill ${DRY_RUN ? "(DRY RUN)" : "(APPLYING CHANGES)"}\n`
  );

  // 1. Unlinked add-on instructions (shipment type 5, no addon_id yet).
  const instructionsRes = await query(`
    SELECT m1key, client, booking_ref, "clientFileRef" AS client_ref
    FROM public.m1_controller
    WHERE shipment_type::text = '5'
      AND addon_id IS NULL
    ORDER BY m1key
  `);
  const instructions = instructionsRes.rows;

  // 2. Add-on invoices not yet linked to any instruction.
  const addonsRes = await query(`
    SELECT a.addon_id, a.client_id, a.booking_ref, a.client_ref, a.date, a.amount
    FROM public.add_ons a
    WHERE NOT EXISTS (
      SELECT 1 FROM public.m1_controller m WHERE m.addon_id = a.addon_id
    )
  `);
  const addons = addonsRes.rows;

  const report = { matched: [], ambiguous: [], unmatched: [] };
  // Track invoices claimed during this run so we never double-link in one pass.
  const claimed = new Set();

  for (const inst of instructions) {
    const pool_ = addons.filter(
      (a) => String(a.client_id) === String(inst.client) && !claimed.has(a.addon_id)
    );

    const tiers = [
      // booking_ref + client_ref
      (a) =>
        norm(a.booking_ref) === norm(inst.booking_ref) &&
        norm(inst.booking_ref) !== "" &&
        norm(a.client_ref) === norm(inst.client_ref) &&
        norm(inst.client_ref) !== "",
      // booking_ref only
      (a) =>
        norm(a.booking_ref) === norm(inst.booking_ref) &&
        norm(inst.booking_ref) !== "",
      // client_ref only
      (a) =>
        norm(a.client_ref) === norm(inst.client_ref) &&
        norm(inst.client_ref) !== "",
    ];

    let candidates = [];
    for (const predicate of tiers) {
      candidates = pool_.filter(predicate);
      if (candidates.length > 0) break;
    }

    if (candidates.length === 1) {
      const addon = candidates[0];
      claimed.add(addon.addon_id);
      report.matched.push({
        m1key: inst.m1key,
        addon_id: addon.addon_id,
        booking_ref: inst.booking_ref,
        client_ref: inst.client_ref,
      });
      if (!DRY_RUN) {
        await query(
          `UPDATE public.m1_controller SET addon_id = $1 WHERE m1key = $2`,
          [addon.addon_id, inst.m1key]
        );
      }
    } else if (candidates.length > 1) {
      report.ambiguous.push({
        m1key: inst.m1key,
        booking_ref: inst.booking_ref,
        client_ref: inst.client_ref,
        candidate_addon_ids: candidates.map((c) => c.addon_id),
      });
    } else {
      report.unmatched.push({
        m1key: inst.m1key,
        client_id: inst.client,
        booking_ref: inst.booking_ref,
        client_ref: inst.client_ref,
      });
    }
  }

  // --- report ---
  console.log(`Add-on instructions scanned : ${instructions.length}`);
  console.log(`Unlinked add-on invoices     : ${addons.length}`);
  console.log(`Auto-linked                  : ${report.matched.length}`);
  console.log(`Ambiguous (manual review)    : ${report.ambiguous.length}`);
  console.log(`Unmatched (manual review)    : ${report.unmatched.length}\n`);

  if (report.ambiguous.length > 0) {
    console.log("--- AMBIGUOUS (multiple candidate invoices) ---");
    for (const r of report.ambiguous) {
      console.log(
        `  m1key=${r.m1key} booking_ref="${r.booking_ref}" client_ref="${r.client_ref}" -> candidates [${r.candidate_addon_ids.join(", ")}]`
      );
    }
    console.log("");
  }

  if (report.unmatched.length > 0) {
    console.log("--- UNMATCHED (no candidate invoice) ---");
    for (const r of report.unmatched) {
      console.log(
        `  m1key=${r.m1key} client_id=${r.client_id} booking_ref="${r.booking_ref}" client_ref="${r.client_ref}"`
      );
    }
    console.log("");
  }

  console.log(
    DRY_RUN
      ? "Dry run complete — no changes written."
      : "Backfill complete — links written."
  );
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
