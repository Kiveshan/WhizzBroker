import { pool } from "../../config/database.js"

// Define monthNames for numeric-to-name conversion
const monthNames = {
  1: "January",
  2: "February",
  3: "March",
  4: "April",
  5: "May",
  6: "June",
  7: "July",
  8: "August",
  9: "September",
  10: "October",
  11: "November",
  12: "December",
}

// Shared helper — converts a month name + year into a UTC date range
const getDateRange = (month, year) => {
  const monthNum = new Date(`${month.trim()} 1, ${year}`).getMonth() + 1
  const paddedMonth = String(monthNum).padStart(2, '0')
  const dateFrom = `${year}-${paddedMonth}-01`
  const nextMonth = monthNum === 12 ? 1 : monthNum + 1
  const nextYear = monthNum === 12 ? parseInt(year) + 1 : parseInt(year)
  const dateTo = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
  return { dateFrom, dateTo }
}

const getFuelExpenses = async (client, month, year) => {
  const query = `
    SELECT t.truckregnum, 
           SUM(e.expensecost) as total_cost, 
           to_char(e.slipuploaddate, 'Month') as month_name,
           EXTRACT(YEAR FROM e.slipuploaddate) as year
    FROM expenses_m2 e
    JOIN m5_trucks t ON e.truckid = t.m5truckskey
    WHERE e.type = 'fuel'
    AND TRIM(to_char(e.slipuploaddate, 'Month')) = $1
    AND EXTRACT(YEAR FROM e.slipuploaddate)::text = $2
    AND t.is_subcontractor = false
    AND t.status = true
    GROUP BY t.truckregnum, to_char(e.slipuploaddate, 'Month'), EXTRACT(YEAR FROM e.slipuploaddate)
    ORDER BY total_cost DESC
  `
  const result = await client.query(query, [month, year])
  console.log("Raw query result:", result.rows)
  console.log(`Query returned ${result.rows.length} rows`)

  const totalFuelExpense = result.rows.reduce((sum, row) => sum + Number.parseFloat(row.total_cost), 0)
  console.log(`Total fuel expense for ${month} ${year} (non-subcontractors): ${totalFuelExpense}`)

  const truckData = result.rows.map((row) => ({
    truckregnum: row.truckregnum,
    total_cost: Number.parseFloat(row.total_cost),
    month_name: row.month_name,
    year: row.year,
  }))

  return truckData.map((row) => {
    const cost = Number.parseFloat(row.total_cost)
    const percentage = totalFuelExpense > 0 ? ((cost / totalFuelExpense) * 100).toFixed(2) : 0
    return {
      ...row,
      percentage: Number.parseFloat(percentage),
    }
  })
}

const calculateMonthlyTurnover = async (client, dateFrom, dateTo, clientId = null) => {
  // --- Invoice portion (VAT-inclusive per instruction) ---
  const invoiceParams = [dateFrom, dateTo]
  let invoiceFilter = ''
  if (clientId) {
    invoiceFilter = 'AND i.clientid = $3'
    invoiceParams.push(clientId)
  }

  const invoiceQuery = `
    SELECT
      COALESCE(
        SUM(m.total_cost + (m.total_cost * (COALESCE(m.vat, 0)::numeric / 100))),
        0
      ) AS invoice_turnover
    FROM invoice i
    JOIN m1_controller m ON i.m1key = m.m1key
    WHERE i.date >= $1
      AND i.date < $2
      ${invoiceFilter}
  `

  // --- Add-ons portion ---
  const addOnParams = [dateFrom, dateTo]
  let addOnFilter = ''
  if (clientId) {
    addOnFilter = 'AND a.client_id = $3'
    addOnParams.push(clientId)
  }

  const addOnQuery = `
    SELECT COALESCE(SUM(a.amount), 0) AS addon_turnover
    FROM add_ons a
    WHERE a.date >= $1
      AND a.date < $2
      ${addOnFilter}
  `

  const [invoiceResult, addOnResult] = await Promise.all([
    client.query(invoiceQuery, invoiceParams),
    client.query(addOnQuery, addOnParams),
  ])

  const invoiceTurnover = Number(invoiceResult.rows[0]?.invoice_turnover || 0)
  const addonTurnover = Number(addOnResult.rows[0]?.addon_turnover || 0)

  return invoiceTurnover + addonTurnover
}

const getTurnoverPerMonth = async (client, month, year, clientId = null) => {
  const { dateFrom, dateTo } = getDateRange(month, year)
  console.log(`Date range: ${dateFrom} to ${dateTo}`)

  // Total turnover across all clients via the shared helper
  const totalTurnover = await calculateMonthlyTurnover(client, dateFrom, dateTo)
  console.log(`Total turnover (invoices + add-ons) for ${month} ${year}: ${totalTurnover}`)

  let turnoverData = [
    {
      client: "Total Turnover",
      turnover: totalTurnover,
      month_name: month.trim(),
      year: year.toString(),
      percentage: 100,
    },
  ]

  if (clientId) {
    // Client-scoped turnover via the shared helper
    const clientTurnover = await calculateMonthlyTurnover(client, dateFrom, dateTo, clientId)
    console.log(`Client ${clientId} turnover for ${month} ${year}: ${clientTurnover}`)

    if (clientTurnover > 0) {
      // Fetch the client name
      const nameResult = await client.query(
        `SELECT client FROM m5_client WHERE m5clientkey = $1`,
        [clientId]
      )
      const clientName = nameResult.rows[0]?.client || ''
      const percentage = totalTurnover > 0
        ? Number(((clientTurnover / totalTurnover) * 100).toFixed(2))
        : 0

      turnoverData = [
        {
          client: clientName,
          turnover: clientTurnover,
          month_name: month.trim(),
          year: year.toString(),
          percentage,
        },
        ...turnoverData,
      ]
      console.log(`Added turnover entry for client: ${clientName}`)
    } else {
      // No activity at all — still show a zero entry with the client name
      const nameResult = await client.query(
        `SELECT client FROM m5_client WHERE m5clientkey = $1`,
        [clientId]
      )
      const clientName = nameResult.rows[0]?.client || ''
      if (clientName) {
        turnoverData = [
          {
            client: clientName,
            turnover: 0,
            month_name: month.trim(),
            year: year.toString(),
            percentage: 0,
          },
          ...turnoverData,
        ]
        console.log(`Added zero-turnover entry for selected client: ${clientName}`)
      }
    }
  }

  console.log("Processed turnover data:", turnoverData)
  return turnoverData
}

// Payments Received per Month (analytics)
const getPaymentsReceivedPerMonth = async (client, month, year, clientId = null) => {
  // Total payments for the month
  const totalQuery = `
    SELECT COALESCE(SUM((li.item->>'this_payment')::numeric), 0) AS total_payments
    FROM payment_m3 p
    CROSS JOIN LATERAL jsonb_array_elements(p.line_items) AS li(item)
    WHERE TRIM(TO_CHAR((li.item->>'line_date')::date, 'Month')) = $1
      AND EXTRACT(YEAR FROM (li.item->>'line_date')::date)::TEXT = $2
  `

  const totalRes = await client.query(totalQuery, [month, year])
  const totalPayments = Number.parseFloat(totalRes.rows[0]?.total_payments || 0)

  const data = [
    {
      name: "Total Payments",
      amount: totalPayments,
      month: month.trim(),
      year: year.toString(),
      type: "total",
      percentage: 100,
    },
  ]

  if (clientId) {
    const perClientQuery = `
      SELECT COALESCE(SUM((li.item->>'this_payment')::numeric), 0) AS client_payments, c.client
      FROM payment_m3 p
      JOIN m5_client c ON p.clientid = c.m5clientkey
      CROSS JOIN LATERAL jsonb_array_elements(p.line_items) AS li(item)
      WHERE TRIM(TO_CHAR((li.item->>'line_date')::date, 'Month')) = $1
        AND EXTRACT(YEAR FROM (li.item->>'line_date')::date)::TEXT = $2
        AND p.clientid = $3
      GROUP BY c.client
    `
    const perClientRes = await client.query(perClientQuery, [month, year, clientId])
    const clientPayments = Number.parseFloat(perClientRes.rows[0]?.client_payments || 0)
    const clientName = perClientRes.rows[0]?.client
    if (clientName) {
      const percentage = totalPayments > 0 ? Number(((clientPayments / totalPayments) * 100).toFixed(2)) : 0
      data.push({
        name: clientName,
        amount: clientPayments,
        month: month.trim(),
        year: year.toString(),
        type: "client",
        percentage,
      })
    } else {
      // If no payments for selected client, still include zero entry with client name
      const nameQuery = `SELECT client FROM m5_client WHERE m5clientkey = $1`
      const nameRes = await client.query(nameQuery, [clientId])
      const fallbackName = nameRes.rows[0]?.client
      if (fallbackName) {
        data.push({
          name: fallbackName,
          amount: 0,
          month: month.trim(),
          year: year.toString(),
          type: "client",
          percentage: 0,
        })
      }
    }
  }

  return data
}

// List distinct clients that have payments for the given month/year
const getPaymentClients = async (client, month, year) => {
  const query = `
    SELECT DISTINCT c.m5clientkey, c.client
    FROM payment_m3 p
    JOIN m5_client c ON p.clientid = c.m5clientkey
    CROSS JOIN LATERAL jsonb_array_elements(p.line_items) AS li(item)
    WHERE TRIM(TO_CHAR((li.item->>'line_date')::date, 'Month')) = $1
      AND EXTRACT(YEAR FROM (li.item->>'line_date')::date)::TEXT = $2
    ORDER BY c.client
  `
  const res = await client.query(query, [month, year])
  return res.rows.map((row) => ({ m5clientkey: row.m5clientkey, client: row.client }))
}

const getAllClients = async (client) => {
  const query = `
    SELECT m5clientkey, client
    FROM m5_client
    WHERE status = true
    ORDER BY client
  `
  const result = await client.query(query)
  console.log("Clients query result:", result.rows)
  console.log(`Query returned ${result.rows.length} rows`)
  return result.rows.map((row) => ({
    m5clientkey: row.m5clientkey,
    client: row.client,
  }))
}

const getAllSubcontractors = async (client) => {
  const query = `
    SELECT 
      MIN(userid) AS userid,
      companyname,
      subei_reg_num
    FROM m5_employee
    WHERE roleid = 6
    GROUP BY companyname, subei_reg_num
    ORDER BY companyname
  `
  const result = await client.query(query)
  console.log("Subcontractors query result:", result.rows)
  console.log(`Query returned ${result.rows.length} rows`)
  return result.rows.map((row) => ({
    userid: row.userid,
    companyname: row.companyname,
    subei_reg_num: row.subei_reg_num,
  }))
}

const getAllTrucks = async (client) => {
  const query = `
    SELECT m5truckskey, truckregnum
    FROM m5_trucks
    WHERE is_subcontractor = false AND status = true
    ORDER BY truckregnum
  `
  const result = await client.query(query)
  console.log("Trucks query result:", result.rows)
  console.log(`Query returned ${result.rows.length} rows`)
  return result.rows.map((row) => ({
    m5truckskey: row.m5truckskey,
    truckregnum: row.truckregnum,
  }))
}

const getAgingAnalysis = async (client, month, year, clientId = null) => {
  const params = [month, year]
  let query = `
    SELECT 
      ${clientId ? "c.client" : "'Total Aging' as client"}, 
      SUM(a.current) as current_amount,
      SUM(a."30days") as thirty_days,
      SUM(a."60days") as sixty_days,
      SUM(a."90days") as ninety_days,
      to_char(s.generation_date, 'Month') as month_name,
      EXTRACT(YEAR FROM s.generation_date) as year
    FROM aging_analysis a
    JOIN statements s ON a.aging_key = s.agingid
    JOIN m5_client c ON a.clientid = c.m5clientkey
    WHERE TRIM(to_char(s.generation_date, 'Month')) = $1
    AND EXTRACT(YEAR FROM s.generation_date)::text = $2
  `
  if (clientId) {
    query += ` AND a.clientid = $3`
    params.push(clientId)
  }
  query += `
    GROUP BY ${clientId ? "c.client," : ""} to_char(s.generation_date, 'Month'), EXTRACT(YEAR FROM s.generation_date)
  `
  const result = await client.query(query, params)
  console.log("Raw query result:", result.rows)
  console.log(`Query returned ${result.rows.length} rows`)

  return result.rows.map((row) => ({
    client: row.client,
    current: Number.parseFloat(row.current_amount) || 0,
    thirtyDays: Number.parseFloat(row.thirty_days) || 0,
    sixtyDays: Number.parseFloat(row.sixty_days) || 0,
    ninetyDays: Number.parseFloat(row.ninety_days) || 0,
    month: row.month_name.trim(),
    year: row.year.toString(),
  }))
}

const getDebtorAgeAnalysisPerClient = async (client, month, year) => {
  const query = `
    SELECT
      c.m5clientkey  AS client_id,
      c.client       AS client_name,
      SUM(a.current)    AS current_amount,
      SUM(a."30days")   AS thirty_days,
      SUM(a."60days")   AS sixty_days,
      SUM(a."90days")   AS ninety_days
    FROM aging_analysis a
    JOIN statements s ON a.aging_key = s.agingid
    JOIN m5_client  c ON a.clientid  = c.m5clientkey
    WHERE TRIM(to_char(s.generation_date, 'Month')) = $1
      AND EXTRACT(YEAR FROM s.generation_date)::text = $2
    GROUP BY c.m5clientkey, c.client
    ORDER BY c.client
  `
  const result = await client.query(query, [month, year])
  return result.rows.map((row) => ({
    clientId: row.client_id,
    client: row.client_name,
    current: parseFloat(row.current_amount) || 0,
    thirtyDays: parseFloat(row.thirty_days) || 0,
    sixtyDays: parseFloat(row.sixty_days) || 0,
    ninetyDays: parseFloat(row.ninety_days) || 0,
  }))
}

const getTurnoverVsDieselCost = async (numericMonth, year) => {
  const month = monthNames[numericMonth]
  const { dateFrom, dateTo } = getDateRange(month, year)
  const [totalTurnover, dieselResult] = await Promise.all([
    calculateMonthlyTurnover(pool, dateFrom, dateTo),
    pool.query(
      `SELECT COALESCE(SUM(expensecost), 0) AS total_diesel_cost
       FROM expenses_m2
       WHERE slipuploaddate >= $1
         AND slipuploaddate < $2
         AND type = 'fuel'`,
      [dateFrom, dateTo]
    ),
  ])

  const totalDieselCost = Number(dieselResult.rows[0]?.total_diesel_cost || 0)

  console.log(`Total turnover (invoices + add-ons) for ${month} ${year}: ${totalTurnover}`)
  console.log(`Total diesel cost for ${month} ${year}: ${totalDieselCost}`)

  const total = totalTurnover + totalDieselCost
  let turnoverPercentage = 0
  let dieselCostPercentage = 0

  if (total > 0) {
    turnoverPercentage = Number(((totalTurnover / total) * 100).toFixed(2))
    dieselCostPercentage = Number(((totalDieselCost / total) * 100).toFixed(2))
  }

  if (isNaN(turnoverPercentage)) turnoverPercentage = 0
  if (isNaN(dieselCostPercentage)) dieselCostPercentage = 0

  return [
    {
      month: monthNames[numericMonth],
      year,
      totalTurnover,
      dieselCost: totalDieselCost,
      turnoverPercentage,
      dieselCostPercentage,
    },
  ]
}

const getTurnoverPerTruck = async (client, month, year) => {
  const params = [month, year]
  const query = `
    WITH DeduplicatedLegs AS (
      SELECT DISTINCT m1key, legnumber, truckregnumber
      FROM legs_m2
    ),
    DistinctLegs AS (
      SELECT
        m1key,
        COUNT(DISTINCT legnumber) AS num_legs
      FROM DeduplicatedLegs
      GROUP BY m1key
    ),
    TruckCountsPerLeg AS (
      SELECT
        m1key,
        legnumber,
        COUNT(DISTINCT truckregnumber) AS trucks_per_leg
      FROM DeduplicatedLegs
      GROUP BY m1key, legnumber
    ),
    TurnoverPerTruck AS (
      SELECT
        l.truckregnumber,
        -- For add-on instructions (shipment type 5) total_cost is 0; use the
        -- linked add-on invoice amount instead, then split per leg/truck as usual.
        SUM(
          (CASE WHEN m.shipment_type = 5 THEN COALESCE(ao.amount, 0) ELSE m.total_cost END)
          / dl.num_legs / tcpl.trucks_per_leg
        ) AS total_turnover,
        TO_CHAR(m.created_at, 'Month') AS month_name,
        EXTRACT(YEAR FROM m.created_at)::TEXT AS year
      FROM DeduplicatedLegs l
      JOIN m1_controller m ON l.m1key = m.m1key
      LEFT JOIN add_ons ao ON m.addon_id = ao.addon_id
      JOIN DistinctLegs dl ON l.m1key = dl.m1key
      JOIN TruckCountsPerLeg tcpl ON l.m1key = tcpl.m1key AND l.legnumber = tcpl.legnumber
      JOIN m5_trucks t ON l.truckregnumber = t.truckregnum
      WHERE t.is_subcontractor = false
        AND TRIM(TO_CHAR(m.created_at, 'Month')) = $1
        AND EXTRACT(YEAR FROM m.created_at)::TEXT = $2
        AND t.status = true
      GROUP BY l.truckregnumber, TO_CHAR(m.created_at, 'Month'), EXTRACT(YEAR FROM m.created_at)
    )
    SELECT 
      truckregnumber,
      COALESCE(total_turnover, 0) AS total_turnover,
      month_name,
      year
    FROM TurnoverPerTruck
    ORDER BY total_turnover DESC
  `

  try {
    const result = await client.query(query, params)
    console.log("Turnover per Truck query result:", result.rows)
    console.log(`Query returned ${result.rows.length} rows`)

    if (!result.rows || result.rows.length === 0) {
      console.log(`No rows returned for ${month} ${year}. Check query or data.`)
      return []
    }

    const totalTurnover = result.rows.reduce((sum, row) => sum + Number.parseFloat(row.total_turnover || 0), 0)
    console.log(`Total turnover for ${month} ${year}: ${totalTurnover}`)

    const data = result.rows.map((row) => {
      const turnover = Number.parseFloat(row.total_turnover || 0)
      const percentage = totalTurnover > 0 ? ((turnover / totalTurnover) * 100).toFixed(2) : 0
      return {
        truckregnumber: row.truckregnumber,
        total_turnover: turnover,
        month_name: row.month_name.trim(),
        year: row.year,
        percentage: Number.parseFloat(percentage),
      }
    })

    console.log("Processed turnover per truck data:", data)
    return data
  } catch (err) {
    console.error("Error executing turnover per truck query:", err)
    throw new Error(`Database query failed: ${err.message}`)
  }
}

const getSubcontractorTurnoverPerMonth = async (client, month, year) => {
  const { dateFrom, dateTo } = getDateRange(month, year)

  // Fetch total turnover and subcontractor portion in parallel
  const subbieQuery = `
    WITH DistinctLegs AS (
      SELECT
        m1key,
        COUNT(DISTINCT legnumber) AS num_legs
      FROM legs_m2
      GROUP BY m1key
    ),
    DriverCountsPerLeg AS (
      SELECT
        m1key,
        legnumber,
        COUNT(DISTINCT driverid) AS drivers_per_leg
      FROM legs_m2
      GROUP BY m1key, legnumber
    ),
    LegDriverContributions AS (
      SELECT
        l.m1key,
        SUM(m.total_cost / dl.num_legs / dcpl.drivers_per_leg) AS subcontractor_turnover
      FROM legs_m2 l
      JOIN m1_controller m ON l.m1key = m.m1key
      JOIN DistinctLegs dl ON l.m1key = dl.m1key
      JOIN DriverCountsPerLeg dcpl ON l.m1key = dcpl.m1key AND l.legnumber = dcpl.legnumber
      JOIN m5_employee e ON l.driverid = e.userid
      WHERE e.roleid = 6
        AND m.created_at >= $1
        AND m.created_at < $2
      GROUP BY l.m1key
    )
    SELECT COALESCE(SUM(subcontractor_turnover), 0) AS total_subcontractor_turnover
    FROM LegDriverContributions
  `

  const [totalTurnover, subbieResult] = await Promise.all([
    calculateMonthlyTurnover(client, dateFrom, dateTo),
    client.query(subbieQuery, [dateFrom, dateTo]),
  ])

  const totalSubcontractorTurnover = Number.parseFloat(
    subbieResult.rows[0]?.total_subcontractor_turnover || 0
  )

  console.log(`Total turnover (invoices + add-ons) for ${month} ${year}: ${totalTurnover}`)

  const subbiePercentage = totalTurnover > 0
    ? Number(((totalSubcontractorTurnover / totalTurnover) * 100).toFixed(2))
    : 0

  const turnoverData = [
    {
      name: "Total Turnover",
      value: totalTurnover,
      type: "total",
      percentage: 100,
      month: month.trim(),
      year: year.toString(),
    },
    {
      name: "Total Subcontractor Turnover",
      value: totalSubcontractorTurnover,
      type: "subcontractor",
      percentage: subbiePercentage,
      month: month.trim(),
      year: year.toString(),
    },
  ].sort((a, b) => b.value - a.value)

  console.log("Processed turnover vs total subcontractor data:", turnoverData)
  return turnoverData
}

const getSubcontractorVsTurnover = async (client, month, year, subcontractorId = null) => {
  const { dateFrom, dateTo } = getDateRange(month, year)
  const params = [dateFrom, dateTo]

  let subcontractorQuery = `
    WITH DistinctLegs AS (
      SELECT 
        m1key,
        COUNT(DISTINCT legnumber) AS num_legs
      FROM legs_m2
      GROUP BY m1key
    ),
    DriverCountsPerLeg AS (
      SELECT 
        m1key,
        legnumber,
        COUNT(DISTINCT driverid) AS drivers_per_leg
      FROM legs_m2
      GROUP BY m1key, legnumber
    ),
    LegDriverContributions AS (
      SELECT 
        l.m1key,
        l.driverid,
        m.total_cost,
        dl.num_legs,
        dcpl.drivers_per_leg,
        (m.total_cost / dl.num_legs / dcpl.drivers_per_leg) AS turnover_contribution,
        m.created_at
      FROM legs_m2 l
      JOIN m1_controller m ON l.m1key = m.m1key
      JOIN DistinctLegs dl ON l.m1key = dl.m1key
      JOIN DriverCountsPerLeg dcpl ON l.m1key = dcpl.m1key AND l.legnumber = dcpl.legnumber
      JOIN m5_employee e ON l.driverid = e.userid
      WHERE e.roleid = 6
        AND m.created_at IS NOT NULL
        AND m.created_at >= $1
        AND m.created_at < $2
  `
  if (subcontractorId) {
    subcontractorQuery += ` AND e.subei_reg_num = $3`
    params.push(subcontractorId)
  }
  subcontractorQuery += `
    ),
    SubcontractorTurnover AS (
      SELECT 
        COALESCE(e.companyname, 'Unknown') AS companyname,
        e.subei_reg_num,
        SUM(ltc.turnover_contribution) AS subcontractor_turnover,
        TO_CHAR(ltc.created_at, 'Month') AS month_name,
        EXTRACT(YEAR FROM ltc.created_at)::TEXT AS year
      FROM LegDriverContributions ltc
      JOIN m5_employee e ON ltc.driverid = e.userid
      GROUP BY e.companyname, e.subei_reg_num, TO_CHAR(ltc.created_at, 'Month'), EXTRACT(YEAR FROM ltc.created_at)
    )
    SELECT 
      companyname AS name,
      subcontractor_turnover AS value,
      'subcontractor' AS type,
      month_name AS month,
      year
    FROM SubcontractorTurnover
    ORDER BY value DESC
  `

  const [subcontractorResult, totalTurnover] = await Promise.all([
    subcontractorId ? client.query(subcontractorQuery, params) : Promise.resolve({ rows: [] }),
    calculateMonthlyTurnover(client, dateFrom, dateTo),
  ])

  console.log("Subcontractor turnover query result:", subcontractorResult.rows)
  console.log(`Total turnover (invoices + add-ons) for ${month} ${year}: ${totalTurnover}`)

  const turnoverData = [
    {
      name: "Total Turnover",
      value: totalTurnover,
      type: "total",
      percentage: 100,
      month: month.trim(),
      year: year.toString(),
    },
  ]

  if (subcontractorId && subcontractorResult.rows.length > 0) {
    const row = subcontractorResult.rows[0]
    const subcontractorTurnover = Number.parseFloat(row.value || 0)
    const percentage = totalTurnover > 0 ? ((subcontractorTurnover / totalTurnover) * 100).toFixed(2) : 0
    turnoverData.push({
      name: row.name,
      value: subcontractorTurnover,
      type: "subcontractor",
      percentage: Number.parseFloat(percentage),
      month: row.month.trim(),
      year: row.year,
    })
  }

  console.log("Processed subcontractor vs turnover data:", turnoverData)
  return turnoverData
}

const getTurnoverVsSubbieExpense = async (client, month, year, subcontractorId = null) => {
  const { dateFrom, dateTo } = getDateRange(month, year)
  const params = [dateFrom, dateTo]

  let subcontractorQuery = `
    SELECT 
      e.companyname,
      COALESCE(SUM(l.driverrate), 0) as subcontractor_expense,
      TO_CHAR(l.date, 'Month') as month_name,
      EXTRACT(YEAR FROM l.date) as year
    FROM legs_m2 l
    JOIN m5_employee e ON l.driverid = e.userid
    WHERE e.roleid = 6
      AND l.date >= $1
      AND l.date < $2
  `
  if (subcontractorId) {
    subcontractorQuery += ` AND e.subei_reg_num = $3`
    params.push(subcontractorId)
  }
  subcontractorQuery += `
    GROUP BY e.companyname, TO_CHAR(l.date, 'Month'), EXTRACT(YEAR FROM l.date)
  `

  const [subcontractorResult, totalTurnover] = await Promise.all([
    subcontractorId ? client.query(subcontractorQuery, params) : Promise.resolve({ rows: [] }),
    calculateMonthlyTurnover(client, dateFrom, dateTo),
  ])

  console.log("Subcontractor expense query result:", subcontractorResult.rows)
  console.log(`Total turnover (invoices + add-ons) for ${month} ${year}: ${totalTurnover}`)

  const turnoverData = []

  turnoverData.push({
    name: "Total Turnover",
    value: totalTurnover,
    type: "total",
    percentage: 100,
    month: month.trim(),
    year: year.toString(),
  })

  if (subcontractorId && subcontractorResult.rows.length > 0) {
    const row = subcontractorResult.rows[0]
    const subcontractorExpense = Number.parseFloat(row.subcontractor_expense || 0)
    const percentage = totalTurnover > 0 ? ((subcontractorExpense / totalTurnover) * 100).toFixed(2) : 0
    turnoverData.push({
      name: row.companyname,
      value: subcontractorExpense,
      type: "subcontractor",
      percentage: Number.parseFloat(percentage),
      month: row.month_name.trim(),
      year: row.year.toString(),
    })
  }

  console.log("Processed turnover vs subbie expense data:", turnoverData)
  return turnoverData
}

const getTurnoverVsFuelPerTruck = async (client, month, year, truckId = null) => {
  const params = [month, year]
  let query

  if (!truckId) {
    // Aggregate totals when no truckId is provided
    query = `
      WITH DistinctLegs AS (
        SELECT 
          m1key,
          COUNT(DISTINCT legnumber) AS num_legs
        FROM legs_m2
        GROUP BY m1key
      ),
      TruckCountsPerLeg AS (
        SELECT 
          m1key,
          legnumber,
          COUNT(DISTINCT truckregnumber) AS trucks_per_leg
        FROM legs_m2
        GROUP BY m1key, legnumber
      ),
      TurnoverPerTruck AS (
        SELECT 
          SUM(m.total_cost / dl.num_legs / tcpl.trucks_per_leg) AS total_turnover,
          TO_CHAR(m.created_at, 'Month') AS month_name,
          EXTRACT(YEAR FROM m.created_at)::TEXT AS year
        FROM legs_m2 l
        JOIN m1_controller m ON l.m1key = m.m1key
        JOIN DistinctLegs dl ON l.m1key = dl.m1key
        JOIN TruckCountsPerLeg tcpl ON l.m1key = tcpl.m1key AND l.legnumber = tcpl.legnumber
        JOIN m5_trucks t ON l.truckregnumber = t.truckregnum
        WHERE t.is_subcontractor = false
          AND TRIM(TO_CHAR(m.created_at, 'Month')) = $1
          AND EXTRACT(YEAR FROM m.created_at)::TEXT = $2
          AND t.status = true
        GROUP BY TO_CHAR(m.created_at, 'Month'), EXTRACT(YEAR FROM m.created_at)
      ),
      FuelPerTruck AS (
        SELECT 
          COALESCE(SUM(e.expensecost), 0) AS total_fuel_cost,
          to_char(e.slipuploaddate, 'Month') AS month_name,
          EXTRACT(YEAR FROM e.slipuploaddate)::TEXT AS year
        FROM expenses_m2 e
        JOIN m5_trucks t ON e.truckid = t.m5truckskey
        WHERE e.type = 'fuel'
          AND t.is_subcontractor = false
          AND TRIM(to_char(e.slipuploaddate, 'Month')) = $1
          AND EXTRACT(YEAR FROM e.slipuploaddate)::text = $2
          AND t.status = true
        GROUP BY to_char(e.slipuploaddate, 'Month'), EXTRACT(YEAR FROM e.slipuploaddate)
      )
      SELECT 
        'Total' AS truckregnumber,
        COALESCE(tp.total_turnover, 0) AS total_turnover,
        COALESCE(fp.total_fuel_cost, 0) AS total_fuel_cost,
        COALESCE(tp.month_name, fp.month_name) AS month_name,
        COALESCE(tp.year, fp.year) AS year
      FROM TurnoverPerTruck tp
      FULL OUTER JOIN FuelPerTruck fp ON tp.month_name = fp.month_name AND tp.year = fp.year
    `
  } else {
    // Existing query for specific truckId
    query = `
      WITH DistinctLegs AS (
        SELECT 
          m1key,
          COUNT(DISTINCT legnumber) AS num_legs
        FROM legs_m2
        GROUP BY m1key
      ),
      TruckCountsPerLeg AS (
        SELECT 
          m1key,
          legnumber,
          COUNT(DISTINCT truckregnumber) AS trucks_per_leg
        FROM legs_m2
        GROUP BY m1key, legnumber
      ),
      TurnoverPerTruck AS (
        SELECT 
          l.truckregnumber,
          SUM(m.total_cost / dl.num_legs / tcpl.trucks_per_leg) AS total_turnover,
          TO_CHAR(m.created_at, 'Month') AS month_name,
          EXTRACT(YEAR FROM m.created_at)::TEXT AS year
        FROM legs_m2 l
        JOIN m1_controller m ON l.m1key = m.m1key
        JOIN DistinctLegs dl ON l.m1key = dl.m1key
        JOIN TruckCountsPerLeg tcpl ON l.m1key = tcpl.m1key AND l.legnumber = tcpl.legnumber
        JOIN m5_trucks t ON l.truckregnumber = t.truckregnum
        WHERE t.is_subcontractor = false
          AND TRIM(TO_CHAR(m.created_at, 'Month')) = $1
          AND EXTRACT(YEAR FROM m.created_at)::TEXT = $2
          AND t.m5truckskey = $3
          AND t.status = true
        GROUP BY l.truckregnumber, TO_CHAR(m.created_at, 'Month'), EXTRACT(YEAR FROM m.created_at)
      ),
      FuelPerTruck AS (
        SELECT 
          t.truckregnum,
          COALESCE(SUM(e.expensecost), 0) AS total_fuel_cost,
          to_char(e.slipuploaddate, 'Month') AS month_name,
          EXTRACT(YEAR FROM e.slipuploaddate)::TEXT AS year
        FROM expenses_m2 e
        JOIN m5_trucks t ON e.truckid = t.m5truckskey
        WHERE e.type = 'fuel'
          AND t.is_subcontractor = false
          AND TRIM(to_char(e.slipuploaddate, 'Month')) = $1
          AND EXTRACT(YEAR FROM e.slipuploaddate)::text = $2
          AND t.m5truckskey = $3
          AND t.status = true
        GROUP BY t.truckregnum, to_char(e.slipuploaddate, 'Month'), EXTRACT(YEAR FROM e.slipuploaddate)
      )
      SELECT 
        COALESCE(tp.truckregnumber, fp.truckregnum) AS truckregnumber,
        COALESCE(tp.total_turnover, 0) AS total_turnover,
        COALESCE(fp.total_fuel_cost, 0) AS total_fuel_cost,
        COALESCE(tp.month_name, fp.month_name) AS month_name,
        COALESCE(tp.year, fp.year) AS year
      FROM TurnoverPerTruck tp
      FULL OUTER JOIN FuelPerTruck fp ON tp.truckregnumber = fp.truckregnum
      ORDER BY COALESCE(tp.total_turnover, 0) DESC, COALESCE(fp.total_fuel_cost, 0) DESC
    `
    params.push(truckId)
  }

  const result = await client.query(query, params)
  console.log("Turnover vs Fuel per Truck query result:", result.rows)
  console.log(`Query returned ${result.rows.length} rows`)

  if (!result.rows || result.rows.length === 0) {
    console.log(`No rows returned for ${month} ${year}. Check query or data.`)
    return []
  }

  const totalTurnover = result.rows.reduce((sum, row) => sum + Number.parseFloat(row.total_turnover || 0), 0)
  const totalFuelCost = result.rows.reduce((sum, row) => sum + Number.parseFloat(row.total_fuel_cost || 0), 0)
  console.log(`Total turnover for ${month} ${year}: ${totalTurnover}`)
  console.log(`Total fuel cost for ${month} ${year}: ${totalFuelCost}`)

  const data = result.rows.map((row) => {
    const turnover = Number.parseFloat(row.total_turnover || 0)
    const fuelCost = Number.parseFloat(row.total_fuel_cost || 0)
    const turnoverPercentage = totalTurnover > 0 ? ((turnover / totalTurnover) * 100).toFixed(2) : 0
    const fuelCostPercentage = totalFuelCost > 0 ? ((fuelCost / totalFuelCost) * 100).toFixed(2) : 0
    return {
      truckregnumber: row.truckregnumber,
      total_turnover: turnover,
      total_fuel_cost: fuelCost,
      month_name: row.month_name.trim(),
      year: row.year,
      turnoverPercentage: Number.parseFloat(turnoverPercentage),
      fuelCostPercentage: Number.parseFloat(fuelCostPercentage),
    }
  })

  console.log("Processed turnover vs fuel per truck data:", data)
  return data
}

const getAllExpenses = async (client, month, year) => {
  const fuelQuery = `
    SELECT 
      COALESCE(SUM(e.expensecost), 0) as total_fuel_cost,
      to_char(e.slipuploaddate, 'Month') as month_name,
      EXTRACT(YEAR FROM e.slipuploaddate) as year
    FROM expenses_m2 e
    WHERE e.type = 'fuel'
      AND TRIM(to_char(e.slipuploaddate, 'Month')) = $1
      AND EXTRACT(YEAR FROM e.slipuploaddate)::text = $2
    GROUP BY to_char(e.slipuploaddate, 'Month'), EXTRACT(YEAR FROM e.slipuploaddate)
  `

  const purchaseOrderQuery = `
    SELECT 
      COALESCE(SUM(p.total), 0) as total_po_cost,
      to_char(p.date, 'Month') as month_name,
      EXTRACT(YEAR FROM p.date) as year
    FROM purchase_orders p
    WHERE TRIM(to_char(p.date, 'Month')) = $1
      AND EXTRACT(YEAR FROM p.date)::text = $2
    GROUP BY to_char(p.date, 'Month'), EXTRACT(YEAR FROM p.date)
  `

  const subcontractorQuery = `
    SELECT 
      COALESCE(SUM(l.driverrate), 0) as total_subcontractor_expense,
      TO_CHAR(l.date, 'Month') as month_name,
      EXTRACT(YEAR FROM l.date) as year
    FROM legs_m2 l
    JOIN m5_employee e ON l.driverid = e.userid
    WHERE e.roleid = 6
      AND TRIM(TO_CHAR(l.date, 'Month')) = $1
      AND EXTRACT(YEAR FROM l.date)::text = $2
    GROUP BY TO_CHAR(l.date, 'Month'), EXTRACT(YEAR FROM l.date)
  `

  const incomeQuery = `
    SELECT 
      COALESCE(SUM(m.total_cost), 0) as total_income,
      to_char(i.date, 'Month') as month_name,
      EXTRACT(YEAR FROM i.date) as year
    FROM invoice i
    JOIN m1_controller m ON i.m1key = m.m1key
    WHERE TRIM(to_char(i.date, 'Month')) = $1
    AND EXTRACT(YEAR FROM i.date)::text = $2
    GROUP BY to_char(i.date, 'Month'), EXTRACT(YEAR FROM i.date)
  `

  const creditNotesQuery = `
    SELECT 
      COALESCE(SUM(amount_value), 0) as total_credit_notes,
      month_name,
      year
    FROM (
      SELECT 
        unnest(cn.amount) as amount_value,
        to_char(cn.creditnote_date, 'Month') as month_name,
        EXTRACT(YEAR FROM cn.creditnote_date) as year
      FROM credit_notes cn
      WHERE TRIM(to_char(cn.creditnote_date, 'Month')) = $1
      AND EXTRACT(YEAR FROM cn.creditnote_date)::text = $2
    ) subquery
    GROUP BY month_name, year
  `

  const [fuelResult, purchaseOrderResult, subcontractorResult, incomeResult, creditNotesResult] =
    await Promise.all([
      client.query(fuelQuery, [month, year]),
      client.query(purchaseOrderQuery, [month, year]),
      client.query(subcontractorQuery, [month, year]),
      client.query(incomeQuery, [month, year]),
      client.query(creditNotesQuery, [month, year]),
    ])

  console.log("Fuel query result:", fuelResult.rows)
  console.log("Purchase order query result:", purchaseOrderResult.rows)
  console.log("Subcontractor expense query result:", subcontractorResult.rows)
  console.log("Income query result:", incomeResult.rows)
  console.log("Credit notes query result:", creditNotesResult.rows)

  const totalFuelCost = Number.parseFloat(fuelResult.rows[0]?.total_fuel_cost || 0)
  const totalPurchaseOrderCost = Number.parseFloat(purchaseOrderResult.rows[0]?.total_po_cost || 0)
  const totalSubcontractorExpense = Number.parseFloat(subcontractorResult.rows[0]?.total_subcontractor_expense || 0)
  const totalWages = await getTotalWagesForMonth(client, month, year)
  const totalIncome = Number.parseFloat(incomeResult.rows[0]?.total_income || 0)
  const totalCreditNotes = Number.parseFloat(creditNotesResult.rows[0]?.total_credit_notes || 0)

  const totalExpenses =
    totalFuelCost + totalPurchaseOrderCost + totalSubcontractorExpense + totalWages + totalCreditNotes

  console.log(`Total fuel cost for ${month} ${year}: ${totalFuelCost}`)
  console.log(`Total purchase order cost for ${month} ${year}: ${totalPurchaseOrderCost}`)
  console.log(`Total subcontractor expense for ${month} ${year}: ${totalSubcontractorExpense}`)
  console.log(`Total wages for ${month} ${year}: ${totalWages}`)
  console.log(`Total credit notes for ${month} ${year}: ${totalCreditNotes}`)
  console.log(`Total expenses for ${month} ${year}: ${totalExpenses}`)
  console.log(`Total income for ${month} ${year}: ${totalIncome}`)

  const expensesData = [
    {
      expensedesc: "All Expenses",
      total_cost: totalExpenses,
      month_name: month.trim(),
      year: year.toString(),
    },
  ]

  return {
    expenses: expensesData,
    income: totalIncome,
    month: month.trim(),
    year: year.toString(),
  }
}

const getWagesVsExpenses = async (client, month, year) => {
  const fuelQuery = `
    SELECT 
      COALESCE(SUM(e.expensecost), 0) as total_fuel_cost,
      to_char(e.slipuploaddate, 'Month') as month_name,
      EXTRACT(YEAR FROM e.slipuploaddate) as year
    FROM expenses_m2 e
    WHERE e.type = 'fuel'
      AND TRIM(to_char(e.slipuploaddate, 'Month')) = $1
      AND EXTRACT(YEAR FROM e.slipuploaddate)::text = $2
    GROUP BY to_char(e.slipuploaddate, 'Month'), EXTRACT(YEAR FROM e.slipuploaddate)
  `

  const purchaseOrderQuery = `
    SELECT 
      COALESCE(SUM(p.total), 0) as total_po_cost,
      to_char(p.date, 'Month') as month_name,
      EXTRACT(YEAR FROM p.date) as year
    FROM purchase_orders p
    WHERE TRIM(to_char(p.date, 'Month')) = $1
      AND EXTRACT(YEAR FROM p.date)::text = $2
    GROUP BY to_char(p.date, 'Month'), EXTRACT(YEAR FROM p.date)
  `

  const subcontractorQuery = `
    SELECT 
      COALESCE(SUM(l.driverrate), 0) as total_subcontractor_expense,
      TO_CHAR(l.date, 'Month') as month_name,
      EXTRACT(YEAR FROM l.date) as year
    FROM legs_m2 l
    JOIN m5_employee e ON l.driverid = e.userid
    WHERE e.roleid = 6
      AND TRIM(TO_CHAR(l.date, 'Month')) = $1
      AND EXTRACT(YEAR FROM l.date)::text = $2
    GROUP BY TO_CHAR(l.date, 'Month'), EXTRACT(YEAR FROM l.date)
  `

  const creditNotesQuery = `
    SELECT 
      COALESCE(SUM(amount_value), 0) as total_credit_notes,
      month_name,
      year
    FROM (
      SELECT 
        unnest(cn.amount) as amount_value,
        to_char(cn.creditnote_date, 'Month') as month_name,
        EXTRACT(YEAR FROM cn.creditnote_date) as year
      FROM credit_notes cn
      WHERE TRIM(to_char(cn.creditnote_date, 'Month')) = $1
      AND EXTRACT(YEAR FROM cn.creditnote_date)::text = $2
    ) subquery
    GROUP BY month_name, year
  `

  const [fuelResult, purchaseOrderResult, subcontractorResult, creditNotesResult] = await Promise.all([
    client.query(fuelQuery, [month, year]),
    client.query(purchaseOrderQuery, [month, year]),
    client.query(subcontractorQuery, [month, year]),
    client.query(creditNotesQuery, [month, year]),
  ])

  console.log("Fuel query result:", fuelResult.rows)
  console.log("Purchase order query result:", purchaseOrderResult.rows)
  console.log("Subcontractor expense query result:", subcontractorResult.rows)
  console.log("Credit notes query result:", creditNotesResult.rows)

  const totalWages = await getTotalWagesForMonth(client, month, year)
  const totalFuelCost = Number.parseFloat(fuelResult.rows[0]?.total_fuel_cost || 0)
  const totalPurchaseOrderCost = Number.parseFloat(purchaseOrderResult.rows[0]?.total_po_cost || 0)
  const totalSubcontractorExpense = Number.parseFloat(subcontractorResult.rows[0]?.total_subcontractor_expense || 0)
  const totalCreditNotes = Number.parseFloat(creditNotesResult.rows[0]?.total_credit_notes || 0)

  const totalExpenses = totalFuelCost + totalPurchaseOrderCost + totalSubcontractorExpense + totalCreditNotes
  const total = totalWages + totalExpenses

  console.log(`Total wages for ${month} ${year}: ${totalWages}`)
  console.log(`Total fuel cost for ${month} ${year}: ${totalFuelCost}`)
  console.log(`Total purchase order cost for ${month} ${year}: ${totalPurchaseOrderCost}`)
  console.log(`Total subcontractor expense for ${month} ${year}: ${totalSubcontractorExpense}`)
  console.log(`Total credit notes for ${month} ${year}: ${totalCreditNotes}`)
  console.log(`Total expenses for ${month} ${year}: ${totalExpenses}`)

  const wagesVsExpensesData = [
    {
      name: "Wages",
      value: totalWages,
      type: "wages",
      percentage: total > 0 ? ((totalWages / total) * 100).toFixed(2) : 0,
      month: month.trim(),
      year: year.toString(),
    },
    {
      name: "Expenses",
      value: totalExpenses,
      type: "expenses",
      percentage: total > 0 ? ((totalExpenses / total) * 100).toFixed(2) : 0,
      month: month.trim(),
      year: year.toString(),
    },
  ]

  console.log("Processed wages vs expenses data:", wagesVsExpensesData)
  return wagesVsExpensesData
}

const getClientSubbieCommissionReport = async (client, month, year, clientId) => {
  if (!clientId) {
    throw new Error("clientId is required")
  }

  const trimmedMonth = month?.trim()
  const yearText = year?.toString()

  if (!trimmedMonth || !yearText) {
    throw new Error("Both month and year are required")
  }

  const clientInfoQuery = `
    SELECT m5clientkey, client
    FROM m5_client
    WHERE m5clientkey = $1
  `

  const clientInfoResult = await client.query(clientInfoQuery, [clientId])
  const clientInfo = clientInfoResult.rows[0] || null

  const invoicesQuery = `
    WITH filtered_invoices AS (
      SELECT 
        i.ikey,
        i.invoice_num,
        i.doc_num,
        i.date,
        i.m1key,
        m.total_cost,
        m.vat,
        m.description
      FROM invoice i
      JOIN m1_controller m ON i.m1key = m.m1key
      WHERE i.clientid = $1
        AND TRIM(TO_CHAR(i.date, 'Month')) = $2
        AND EXTRACT(YEAR FROM i.date)::text = $3
    )
    SELECT 
      fi.ikey,
      fi.invoice_num,
      fi.doc_num,
      fi.date,
      fi.m1key,
      fi.total_cost,
      fi.vat,
      fi.description
    FROM filtered_invoices fi
    ORDER BY fi.date ASC
  `

  const addOnsQuery = `
    SELECT 
      ao.addon_id,
      ao.invoice_number,
      ao.date,
      ao.amount,
      ao.booking_ref,
      ao.client_ref
    FROM add_ons ao
    WHERE ao.client_id = $1
      AND TRIM(TO_CHAR(ao.date, 'Month')) = $2
      AND EXTRACT(YEAR FROM ao.date)::text = $3
  `

  // Subbie earnings are bucketed by LEG date (when the trip was driven), the same
  // basis the subcontractor statements use, and scoped to the client via the
  // instruction (m1_controller.client). Amounts are VAT-inclusive (driverrate +
  // instruction VAT) so this total reconciles to the subbie statements rather than
  // the invoice-date / ex-VAT figure that previously under-reported earnings.
  const subcontractorQuery = `
    SELECT
      MIN(e.userid) AS subcontractor_id,
      COALESCE(e.companyname, 'Unknown') AS companyname,
      e.subei_reg_num,
      COUNT(DISTINCT l.legkey) AS leg_count,
      COALESCE(SUM(l.driverrate * (1 + COALESCE(m.vat, 0)::numeric / 100)), 0) AS total_earned
    FROM legs_m2 l
    JOIN m1_controller m ON l.m1key = m.m1key
    JOIN m5_employee e ON l.driverid = e.userid
    WHERE m.client = $1
      AND TRIM(TO_CHAR(l.date, 'Month')) = $2
      AND EXTRACT(YEAR FROM l.date)::text = $3
      AND e.roleid = 6
    GROUP BY e.companyname, e.subei_reg_num
    ORDER BY total_earned DESC
  `

  const params = [clientId, trimmedMonth, yearText]
  const [invoiceResults, subcontractorResults, addOnResults] = await Promise.all([
    client.query(invoicesQuery, params),
    client.query(subcontractorQuery, params),
    client.query(addOnsQuery, params),
  ])

  const instructionInvoiceDetails = invoiceResults.rows.map((row) => {
    const baseAmount = Number.parseFloat(row.total_cost || 0)
    const vatRate = Number.parseFloat(row.vat ?? 0) || 0
    const vatAmount = Number.isFinite(vatRate) ? (baseAmount * vatRate) / 100 : 0
    const grossAmount = baseAmount + vatAmount

    return {
      invoiceId: row.ikey,
      invoiceNumber: row.invoice_num,
      documentNumber: row.doc_num,
      invoiceDate: row.date instanceof Date ? row.date.toISOString() : row.date,
      instructionId: row.m1key,
      description: row.description,
      amount: Number(grossAmount.toFixed(2)),
      amountExVat: Number(baseAmount.toFixed(2)),
      vatRate: Number(vatRate.toFixed(2)),
      vatAmount: Number(vatAmount.toFixed(2)),
      source: "instruction",
    }
  })

  const addOnDetails = addOnResults.rows.map((row) => {
    const amount = Number.parseFloat(row.amount || 0)

    return {
      invoiceId: `addon-${row.addon_id}`,
      invoiceNumber: row.invoice_number || "Add-On Invoice",
      documentNumber: row.booking_ref || null,
      invoiceDate: row.date instanceof Date ? row.date.toISOString() : row.date,
      instructionId: row.client_ref || null,
      description: "Add-On invoice",
      amount: Number(amount.toFixed(2)),
      amountExVat: Number(amount.toFixed(2)),
      vatRate: null,
      vatAmount: null,
      source: "addOn",
    }
  })

  const invoiceDetails = [...instructionInvoiceDetails, ...addOnDetails].sort((a, b) => {
    const numA = a.invoiceNumber || ""
    const numB = b.invoiceNumber || ""
    return numA.localeCompare(numB, undefined, { numeric: true, sensitivity: "base" })
  })

  const totalInvoiceAmount = invoiceDetails.reduce(
    (sum, detail) => sum + (Number.isFinite(detail.amount) ? detail.amount : 0),
    0
  )

  const totalAddOnAmount = addOnDetails.reduce(
    (sum, detail) => sum + (Number.isFinite(detail.amount) ? detail.amount : 0),
    0
  )

  const totalSubbieAmount = subcontractorResults.rows.reduce(
    (sum, row) => sum + Number.parseFloat(row.total_earned || 0),
    0
  )

  const subcontractorBreakdown = subcontractorResults.rows.map((row) => {
    const totalEarned = Number.parseFloat(row.total_earned || 0)
    const percentage = totalSubbieAmount > 0 ? totalEarned / totalSubbieAmount : 0
    return {
      subcontractorId: row.subcontractor_id,
      companyName: row.companyname,
      registrationNumber: row.subei_reg_num,
      legCount: Number.parseInt(row.leg_count, 10) || 0,
      totalEarned,
      percentage,
    }
  })

  const commission = Math.max(totalInvoiceAmount - totalSubbieAmount, 0)

  return {
    client: clientInfo
      ? {
        id: clientInfo.m5clientkey,
        name: clientInfo.client,
      }
      : null,
    period: {
      month: trimmedMonth,
      year: yearText,
    },
    totals: {
      invoiceAmount: Number(totalInvoiceAmount.toFixed(2)),
      subcontractorAmount: Number(totalSubbieAmount.toFixed(2)),
      commission: Number(commission.toFixed(2)),
      addOnAmount: Number(totalAddOnAmount.toFixed(2)),
    },
    invoices: invoiceDetails,
    subcontractors: subcontractorBreakdown,
    addOns: addOnDetails,
  }
}

async function calculateTotalPayable(client, employeeId, month, year) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthIndex = monthNames.indexOf(month);
  if (monthIndex === -1) throw new Error('Invalid month');
  const monthNumber = monthIndex + 1;
  const lastDayOfMonth = new Date(parseInt(year), monthNumber, 0).toISOString().split('T')[0];

  // Get base salary
  let baseSalary = 0;
  const historyBaseQuery = `
    SELECT base
    FROM base_salary_history 
    WHERE userid = $1 AND date <= $2 
    ORDER BY date DESC 
    LIMIT 1
  `;
  const historyBaseRes = await client.query(historyBaseQuery, [employeeId, lastDayOfMonth]);
  if (historyBaseRes.rows.length > 0) {
    baseSalary = parseFloat(historyBaseRes.rows[0].base) || 0;
  } else {
    const currentBaseQuery = `
      SELECT base_salary 
      FROM m5_employee 
      WHERE userid = $1
    `;
    const currentBaseRes = await client.query(currentBaseQuery, [employeeId]);
    if (currentBaseRes.rows.length > 0) {
      baseSalary = parseFloat(currentBaseRes.rows[0].base_salary) || 0;
    }
  }

  // Get legs total
  const legsQuery = `
    SELECT COALESCE(SUM(l.driverrate), 0) as total_legs
    FROM legs_m2 l
    JOIN m1_controller i ON l.m1key = i.m1key
    WHERE l.driverid = $1
      AND EXTRACT(MONTH FROM l.date) = $2
      AND EXTRACT(YEAR FROM l.date) = $3
  `;
  const legsRes = await client.query(legsQuery, [employeeId, monthNumber, year]);
  const totalLegsAmount = parseFloat(legsRes.rows[0].total_legs) || 0;

  let totalEarnings = baseSalary + totalLegsAmount;
  if (totalEarnings === 0) return 0;

  // Get loan deduction
  let loanDeduction = 0;
  const historyDedQuery = `
    SELECT deduction_loan
    FROM employee_deduction_history 
    WHERE employeeid = $1 AND effective_date <= $2 
    ORDER BY effective_date DESC 
    LIMIT 1
  `;
  const historyDedRes = await client.query(historyDedQuery, [employeeId, lastDayOfMonth]);
  if (historyDedRes.rows.length > 0) {
    loanDeduction = parseFloat(historyDedRes.rows[0].deduction_loan) || 0;
  } else {
    const currentDedQuery = `
      SELECT deduction_loan 
      FROM m5_employee 
      WHERE userid = $1
    `;
    const currentDedRes = await client.query(currentDedQuery, [employeeId]);
    if (currentDedRes.rows.length > 0) {
      loanDeduction = parseFloat(currentDedRes.rows[0].deduction_loan) || 0;
    }
  }

  const totalEarningsAfterLoan = totalEarnings - loanDeduction;
  const uifAmount = totalEarningsAfterLoan * 0.01;
  const sdlAmount = totalEarningsAfterLoan * 0.01;
  const coidAmount = totalEarningsAfterLoan * 0.0248;
  const totalAdditions = uifAmount + sdlAmount + coidAmount;
  const totalPayable = totalEarningsAfterLoan + totalAdditions;
  return totalPayable;
}

async function getTotalWagesForMonth(client, month, year) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthIndex = monthNames.indexOf(month);
  if (monthIndex === -1) throw new Error('Invalid month');
  const monthNumber = monthIndex + 1;

  // Get employees excluding roleid 6
  const employeesQuery = `
    SELECT userid
    FROM m5_employee
    WHERE roleid != 6
  `;
  const empRes = await client.query(employeesQuery);
  const employees = empRes.rows;

  let totalSum = 0;
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const reportMonth = monthNumber;
  const reportYear = parseInt(year);
  const isPastMonth = (reportYear < currentYear) ||
    (reportYear === currentYear && reportMonth < currentMonth);

  for (const emp of employees) {
    const employeeId = emp.userid;

    // Check stored wage data
    const storedQuery = `
      SELECT net_pay as total_payable
      FROM wages 
      WHERE employeeid = $1 
        AND EXTRACT(MONTH FROM employee_date) = $2 
        AND EXTRACT(YEAR FROM employee_date) = $3
    `;
    const storedRes = await client.query(storedQuery, [employeeId, monthNumber, year]);
    let totalPayable = 0;
    const exists = storedRes.rows.length > 0;

    if (exists) {
      const storedPayable = parseFloat(storedRes.rows[0].total_payable) || 0;
      if (isPastMonth) {
        totalPayable = storedPayable;
      } else {
        totalPayable = await calculateTotalPayable(client, employeeId, month, year);
      }
    } else {
      totalPayable = await calculateTotalPayable(client, employeeId, month, year);
    }

    if (totalPayable > 0) {
      totalSum += totalPayable;
    }
  }

  return totalSum;
}

export {
  calculateMonthlyTurnover,
  getFuelExpenses,
  getTurnoverPerMonth,
  getAllClients,
  getAllSubcontractors,
  getAllTrucks,
  getAgingAnalysis,
  getDebtorAgeAnalysisPerClient,
  getTurnoverVsDieselCost,
  getAllExpenses,
  getTurnoverPerTruck,
  getSubcontractorTurnoverPerMonth,
  getSubcontractorVsTurnover,
  getWagesVsExpenses,
  getTurnoverVsSubbieExpense,
  getTurnoverVsFuelPerTruck,
  getPaymentsReceivedPerMonth,
  getPaymentClients,
  getClientSubbieCommissionReport,
}