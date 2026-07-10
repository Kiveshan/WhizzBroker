// READ-ONLY diagnostic for the Client Subbie Commission report.
// Re-derives April numbers straight from raw rows and compares them to the
// exact production report function, so we can prove what the DB actually holds.
//
// Usage:
//   node scripts/verifyClientSubbieCommission.js                 -> discovery (all clients, April, both years)
//   node scripts/verifyClientSubbieCommission.js <clientId> April 2025  -> deep verify one client
import { pool } from "../config/database.js"
import { getClientSubbieCommissionReport } from "../models/analytics/analyticsModel.js"

const fmt = (n) => "R " + (Number(n) || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const [, , argClientId, argMonth = "April", argYear] = process.argv

async function discovery(client, month) {
  // Which years actually have April invoice activity?
  const years = await client.query(
    `SELECT EXTRACT(YEAR FROM i.date)::int AS yr, COUNT(*) AS invoices, COUNT(DISTINCT i.clientid) AS clients
     FROM invoice i
     WHERE TRIM(TO_CHAR(i.date, 'Month')) = $1
     GROUP BY 1 ORDER BY 1`,
    [month]
  )
  console.log(`\n=== Years with ${month} invoice activity ===`)
  console.table(years.rows)

  for (const { yr } of years.rows) {
    const perClient = await client.query(
      `SELECT c.m5clientkey AS client_id, c.client,
              COUNT(*)                     AS invoice_rows,
              COUNT(DISTINCT i.m1key)      AS distinct_instructions
       FROM invoice i
       JOIN m5_client c ON i.clientid = c.m5clientkey
       WHERE TRIM(TO_CHAR(i.date, 'Month')) = $1
         AND EXTRACT(YEAR FROM i.date)::text = $2
       GROUP BY c.m5clientkey, c.client
       ORDER BY invoice_rows DESC`,
      [month, String(yr)]
    )
    console.log(`\n=== ${month} ${yr}: invoice rows vs distinct instructions per client ===`)
    console.log("(invoice_rows > distinct_instructions  =>  fan-out risk in subbie earnings join)")
    console.table(perClient.rows)
  }
}

async function deepVerify(client, clientId, month, year) {
  console.log(`\n############ DEEP VERIFY  client=${clientId}  ${month} ${year} ############`)

  // 1) The EXACT production output
  const report = await getClientSubbieCommissionReport(client, month, year, clientId)
  console.log("\n--- Production report totals ---")
  console.log(report.totals)
  console.log(`Subcontractor rows: ${report.subcontractors.length}, Invoice rows: ${report.invoices.length}`)

  // 2) Check fan-out: does any m1key appear on >1 invoice row for this client/month?
  const dupes = await client.query(
    `SELECT i.m1key, COUNT(*) AS invoice_rows
     FROM invoice i
     WHERE i.clientid = $1
       AND TRIM(TO_CHAR(i.date, 'Month')) = $2
       AND EXTRACT(YEAR FROM i.date)::text = $3
     GROUP BY i.m1key
     HAVING COUNT(*) > 1
     ORDER BY invoice_rows DESC`,
    [clientId, month.trim(), String(year)]
  )
  console.log(`\n--- Instructions (m1key) with multiple invoice rows: ${dupes.rows.length} ---`)
  if (dupes.rows.length) console.table(dupes.rows)

  // 3) Subbie earnings the PRODUCTION way (join legs -> filtered_invoices on m1key)
  const prodSubbie = await client.query(
    `WITH filtered_invoices AS (
       SELECT i.m1key FROM invoice i
       WHERE i.clientid = $1
         AND TRIM(TO_CHAR(i.date, 'Month')) = $2
         AND EXTRACT(YEAR FROM i.date)::text = $3
     )
     SELECT COALESCE(SUM(l.driverrate),0) AS total_earned,
            COUNT(*) AS leg_join_rows,
            COUNT(DISTINCT l.legkey) AS distinct_legs
     FROM legs_m2 l
     JOIN m5_employee e ON l.driverid = e.userid
     JOIN filtered_invoices fi ON l.m1key = fi.m1key
     WHERE e.roleid = 6`,
    [clientId, month.trim(), String(year)]
  )

  // 4) Subbie earnings the SAFE way (distinct instructions only -> no fan-out)
  const safeSubbie = await client.query(
    `WITH filtered_invoices AS (
       SELECT DISTINCT i.m1key FROM invoice i
       WHERE i.clientid = $1
         AND TRIM(TO_CHAR(i.date, 'Month')) = $2
         AND EXTRACT(YEAR FROM i.date)::text = $3
     )
     SELECT COALESCE(SUM(l.driverrate),0) AS total_earned,
            COUNT(*) AS leg_join_rows,
            COUNT(DISTINCT l.legkey) AS distinct_legs
     FROM legs_m2 l
     JOIN m5_employee e ON l.driverid = e.userid
     JOIN filtered_invoices fi ON l.m1key = fi.m1key
     WHERE e.roleid = 6`,
    [clientId, month.trim(), String(year)]
  )

  console.log("\n--- Subbie earnings: production join vs DISTINCT-instruction join ---")
  console.table({
    production: prodSubbie.rows[0],
    distinct_safe: safeSubbie.rows[0],
  })

  const prod = Number(prodSubbie.rows[0].total_earned)
  const safe = Number(safeSubbie.rows[0].total_earned)
  console.log(`\nProduction subbie total : ${fmt(prod)}`)
  console.log(`Distinct-safe subbie tot: ${fmt(safe)}`)
  console.log(`Difference (inflation)  : ${fmt(prod - safe)}  ${prod === safe ? "✅ no fan-out" : "⚠️  FAN-OUT INFLATION"}`)

  // 5) Invoice (income) side: raw sum of gross per invoice row, matches report.totals.invoiceAmount minus add-ons
  const invRaw = await client.query(
    `SELECT COUNT(*) AS invoice_rows,
            COUNT(DISTINCT i.m1key) AS distinct_instructions,
            COALESCE(SUM(m.total_cost + (m.total_cost * (COALESCE(m.vat,0)::numeric/100))),0) AS gross
     FROM invoice i
     JOIN m1_controller m ON i.m1key = m.m1key
     WHERE i.clientid = $1
       AND TRIM(TO_CHAR(i.date, 'Month')) = $2
       AND EXTRACT(YEAR FROM i.date)::text = $3`,
    [clientId, month.trim(), String(year)]
  )
  console.log("\n--- Instruction-invoice income (raw) ---")
  console.table(invRaw.rows)
}

async function main() {
  const client = await pool.connect()
  try {
    if (argClientId) {
      const year = argYear || String(new Date().getFullYear())
      await deepVerify(client, argClientId, argMonth, year)
    } else {
      await discovery(client, argMonth)
    }
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((e) => {
  console.error("Diagnostic failed:", e)
  process.exit(1)
})
