// Re-derive the correct driverrate for every leg on instructions CREATED in
// April 2026 and report (and optionally fix) legs whose stored rate is wrong.
//
// Why: after a lot of back-and-forth instruction editing — and the addition of
// effective-dated driver rates — many legs_m2 rows ended up with the wrong
// driverrate (e.g. a driver rate saved on a leg a subbie actually did, or a
// stale rate version saved before effective_from/effective_to existed).
//
// This reuses the SAME rate-resolution logic the app uses (getRateForLegDate),
// so the "correct" rate here is exactly what the app would assign: the right
// m5_driver_rate VERSION for the leg's date, and the right field (subbie vs
// driver) × (6m vs 12m) for the leg's driver role and container.
//
// SAFETY:
//   - Dry-run by default: it only writes when you pass --apply.
//   - Legs whose route/rate-period no longer covers the leg date are reported
//     as ROUTE_MISSING and NEVER overwritten.
//   - Only MISMATCH legs are updated, inside a single transaction.
//
// Usage:
//   node scripts/fixAprilDriverRates.js            -> dry-run report (no writes)
//   node scripts/fixAprilDriverRates.js --apply     -> apply the fixes
import { pool } from "../config/database.js"
import { getRateForLegDate } from "../models/manage/driverRatesModel.js"

const APPLY = process.argv.includes("--apply")

// getRateForLegDate logs verbosely per leg; mute just those lines so the report
// is readable. Pass --verbose to see them.
if (!process.argv.includes("--verbose")) {
  const realLog = console.log.bind(console)
  console.log = (...args) => {
    if (typeof args[0] === "string" && args[0].includes("[getRateForLegDate]")) return
    realLog(...args)
  }
}

// Scope: tweak these if the dry-run shows the created_at basis is off.
const YEAR = 2026
const MONTH = 4 // April

const fmt = (n) =>
  "R " + (Number(n) || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const toDateStr = (d) => (d instanceof Date ? d.toISOString().split("T")[0] : d)

const ratesClose = (a, b) => {
  if (a === null || a === undefined || b === null || b === undefined) return false
  const na = Number(a)
  const nb = Number(b)
  if (Number.isNaN(na) || Number.isNaN(nb)) return false
  return Math.abs(na - nb) < 0.005
}

// Every leg on instructions CREATED in the target month. No status filter on
// purpose: these instructions are in the past and likely Completed/Invoiced.
const LEGS_QUERY = `
  SELECT
    l.legkey,
    l.m1key,
    l.driverid,
    l.startingpoint,
    l.destination,
    l.date,
    l.containernumber,
    l.driverrate                                  AS stored_rate,
    COALESCE(e.roleid, 5)                         AS roleid,
    LOWER(TRIM(COALESCE(c.container_type, '6m'))) AS container_type
  FROM legs_m2 l
  JOIN m1_controller mc ON mc.m1key = l.m1key
  LEFT JOIN shipment sh ON sh.shipkey = mc.shipment_type
  LEFT JOIN m5_employee e ON e.userid = l.driverid
  LEFT JOIN container c
    ON LOWER(TRIM(COALESCE(c.containernum::text, ''))) = LOWER(TRIM(COALESCE(l.containernumber, '')))
   AND c.m1key = l.m1key
  WHERE EXTRACT(YEAR  FROM mc.created_at) = $1
    AND EXTRACT(MONTH FROM mc.created_at) = $2
    -- Breakbulk instructions are rated per-unit (weight), not via the route
    -- driver-rate table, so they are excluded from this audit.
    AND COALESCE(sh.shipmenttype, '') NOT ILIKE '%break%bulk%'
  ORDER BY l.m1key, l.legkey
`

async function main() {
  const client = await pool.connect()
  try {
    console.log(`\n=== Fix April driver rates — ${MONTH}/${YEAR} — mode: ${APPLY ? "APPLY (writing)" : "DRY-RUN (no writes)"} ===\n`)

    const { rows: legs } = await client.query(LEGS_QUERY, [YEAR, MONTH])
    console.log(`Legs on instructions created in ${MONTH}/${YEAR}: ${legs.length}`)

    const buckets = {
      MISMATCH: [],
      MATCH: [],
      ROUTE_MISSING: [],
      NO_FIELD_RATE: [],
      SKIPPED: [], // no date / no driver
    }

    for (const leg of legs) {
      const route = `${leg.startingpoint} -> ${leg.destination}`
      const legDate = toDateStr(leg.date)

      if (!legDate || leg.driverid == null) {
        buckets.SKIPPED.push({
          legkey: leg.legkey,
          m1key: leg.m1key,
          route,
          date: legDate || "(none)",
          reason: !legDate ? "no leg date" : "no driver assigned",
          stored_rate: leg.stored_rate,
        })
        continue
      }

      const isSubbie = Number(leg.roleid) === 6
      const container = leg.container_type || "6m"

      let result
      try {
        result = await getRateForLegDate(leg.startingpoint, leg.destination, legDate, isSubbie, container)
      } catch (err) {
        buckets.ROUTE_MISSING.push({
          legkey: leg.legkey,
          m1key: leg.m1key,
          route,
          date: legDate,
          reason: `lookup error: ${err.message}`,
          stored_rate: leg.stored_rate,
        })
        continue
      }

      if (!result.success) {
        buckets.ROUTE_MISSING.push({
          legkey: leg.legkey,
          m1key: leg.m1key,
          route,
          date: legDate,
          role: isSubbie ? "subbie" : "driver",
          stored_rate: leg.stored_rate,
        })
        continue
      }

      const expected = result.data?.applicable_rate
      if (expected == null) {
        buckets.NO_FIELD_RATE.push({
          legkey: leg.legkey,
          m1key: leg.m1key,
          route,
          date: legDate,
          role: isSubbie ? "subbie" : "driver",
          container,
          field: result.data?.rate_field,
          stored_rate: leg.stored_rate,
        })
        continue
      }

      const row = {
        legkey: leg.legkey,
        m1key: leg.m1key,
        route,
        date: legDate,
        role: isSubbie ? "subbie" : "driver",
        container,
        stored_rate: leg.stored_rate,
        expected_rate: expected,
        delta: Number(expected) - Number(leg.stored_rate || 0),
      }

      if (ratesClose(expected, leg.stored_rate)) {
        buckets.MATCH.push(row)
      } else {
        buckets.MISMATCH.push(row)
      }
    }

    // ---- Report ----
    console.log(
      `\nSummary:  MISMATCH=${buckets.MISMATCH.length}  MATCH=${buckets.MATCH.length}` +
        `  ROUTE_MISSING=${buckets.ROUTE_MISSING.length}  NO_FIELD_RATE=${buckets.NO_FIELD_RATE.length}` +
        `  SKIPPED=${buckets.SKIPPED.length}`,
    )

    if (buckets.MISMATCH.length) {
      console.log(`\n--- MISMATCH (will be fixed${APPLY ? "" : " when run with --apply"}) ---`)
      console.table(
        buckets.MISMATCH.map((r) => ({
          legkey: r.legkey,
          m1key: r.m1key,
          route: r.route,
          date: r.date,
          role: r.role,
          container: r.container,
          stored: fmt(r.stored_rate),
          expected: fmt(r.expected_rate),
          delta: fmt(r.delta),
        })),
      )
      const totalDelta = buckets.MISMATCH.reduce((s, r) => s + r.delta, 0)
      console.log(`Total Rand delta if applied: ${fmt(totalDelta)}`)
    }

    if (buckets.ROUTE_MISSING.length) {
      console.log(`\n--- ROUTE_MISSING (no rate period covers route/date — NOT touched) ---`)
      console.table(buckets.ROUTE_MISSING.map((r) => ({ ...r, stored_rate: fmt(r.stored_rate) })))
    }

    if (buckets.NO_FIELD_RATE.length) {
      console.log(`\n--- NO_FIELD_RATE (period exists but needed field is blank — NOT touched) ---`)
      console.table(buckets.NO_FIELD_RATE.map((r) => ({ ...r, stored_rate: fmt(r.stored_rate) })))
    }

    if (buckets.SKIPPED.length) {
      console.log(`\n--- SKIPPED (no date / no driver — NOT touched) ---`)
      console.table(buckets.SKIPPED.map((r) => ({ ...r, stored_rate: fmt(r.stored_rate) })))
    }

    // ---- Apply ----
    if (!APPLY) {
      console.log(`\nDry-run only. No rows changed. Re-run with --apply to write the ${buckets.MISMATCH.length} fix(es).\n`)
      return
    }

    if (!buckets.MISMATCH.length) {
      console.log(`\nNothing to apply — no mismatches.\n`)
      return
    }

    await client.query("BEGIN")
    let updated = 0
    for (const r of buckets.MISMATCH) {
      const res = await client.query("UPDATE legs_m2 SET driverrate = $1 WHERE legkey = $2", [r.expected_rate, r.legkey])
      updated += res.rowCount
    }
    await client.query("COMMIT")
    console.log(`\n✅ Applied. Updated ${updated} leg(s). Re-run without --apply to confirm MISMATCH = 0.\n`)
  } catch (err) {
    try {
      await client.query("ROLLBACK")
    } catch {}
    console.error("fixAprilDriverRates failed:", err)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

main()
