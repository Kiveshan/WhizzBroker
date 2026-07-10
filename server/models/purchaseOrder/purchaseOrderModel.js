import { pool } from "../../config/database.js"
export const getPurchaseOrders = async () => {
  const query = `
SELECT 
  po.ponum,
  MIN(po.date) AS date,
  et.expense AS expense_type,
  s.supplier AS supplier_name,
  SUM(po.total) AS total,
  JSON_AGG(
    JSON_BUILD_OBJECT(
      'po_id', po.po_id,
      'description', po.description,
      'quantity', po.quantity,
      'truckid', po.truckid
    )
  ) AS line_items,
      CASE 
        WHEN COUNT(po.slip_s3key) FILTER (WHERE po.slip_s3key IS NOT NULL) = COUNT(*) 
        THEN 'Submitted'
        ELSE 'Pending'
      END AS status
    FROM purchase_orders po
    JOIN expense_types et ON po.expense_type_id = et.id
    JOIN suppliers s ON po.supplier_id = s.supplier_id
    GROUP BY po.ponum, et.expense, s.supplier
    ORDER BY
      CASE
        WHEN COUNT(po.slip_s3key) FILTER (WHERE po.slip_s3key IS NOT NULL) = COUNT(*) THEN 1
        ELSE 0
      END ASC,
      MIN(po.date) DESC
  `
  try {
    const result = await pool.query(query)
    return result.rows
  } catch (error) {
    throw error
  }
}

export const getPurchaseOrderByPonum = async (ponum) => {
  const query = `
    SELECT 
      po.*,
      s.supplier,
      e.expense,
      t.truckregnum,
      t.m5truckskey as truckid
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.supplier_id
    JOIN expense_types e ON po.expense_type_id = e.id
    LEFT JOIN m5_trucks t ON po.truckid = t.m5truckskey
    WHERE po.ponum = $1
  `;

  try {
    const result = await pool.query(query, [ponum]);
    if (result.rows.length === 0) {
      return null;
    }

    // Group line items for this PO
    const poData = result.rows[0];
    const lineItemsQuery = `
      SELECT 
        po_id,
        description,
        quantity,
        truckid,
        t.truckregnum
      FROM purchase_orders po
      LEFT JOIN m5_trucks t ON po.truckid = t.m5truckskey
      WHERE ponum = $1
    `;

    const lineItemsResult = await pool.query(lineItemsQuery, [ponum]);

    return {
      ...poData,
      line_items: lineItemsResult.rows
    };
  } catch (error) {
    throw error;
  }
};

export const getExpenseTypes = async () => {
  const query = `
    SELECT id, expense 
    FROM expense_types
    ORDER BY expense
  `

  try {
    const result = await pool.query(query)
    return result.rows
  } catch (error) {
    throw error
  }
}

export const getStatements = async (supplierId, fromDate, toDate) => {
  let query = `
  SELECT 
    po.ponum,
    MIN(po.date) AS date,
    s.supplier,
    s.supplier_id,
    STRING_AGG(DISTINCT e.expense, ', ') AS expense_type,
    SUM(po.total) AS total,
    MAX(po.vat) AS vat,
    MIN(po.received_by) AS received_by,
    MIN(po.invoice_number) AS invoice_number,
    STRING_AGG(DISTINCT po.description, ', ') AS description,
    STRING_AGG(DISTINCT t.truckregnum, ', ') AS truckregnum
  FROM purchase_orders po
  JOIN suppliers s ON po.supplier_id = s.supplier_id
  LEFT JOIN expense_types e ON po.expense_type_id = e.id
  LEFT JOIN m5_trucks t ON po.truckid = t.m5truckskey
  WHERE 1=1
`

  const values = []
  let paramIndex = 1

  if (supplierId) {
    query += ` AND po.supplier_id = $${paramIndex++}`
    values.push(supplierId)
  }

  if (fromDate) {
    query += ` AND po.date::date >= $${paramIndex++}::date`
    values.push(fromDate)
  }

  if (toDate) {
    query += ` AND po.date::date <= $${paramIndex++}::date`
    values.push(toDate)
  }

  query += ` GROUP BY po.ponum, s.supplier, s.supplier_id ORDER BY MIN(po.date) DESC`

  try {
    const result = await pool.query(query, values)
    return result.rows
  } catch (error) {
    throw error
  }
}

export const getSupplierSummary = async (year, month) => {
  let query = `
SELECT 
  s.supplier_id,
  s.supplier,
  EXTRACT(YEAR FROM po.date) as year,
  EXTRACT(MONTH FROM po.date) as month,
  TO_CHAR(po.date, 'Month') as month_name,
  COUNT(po.po_id) as order_count,
  MIN(po.date) as first_order_date,
  MAX(po.date) as last_order_date,
  SUM(po.total) as total_amount
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.supplier_id
    WHERE 1=1
  `

  const values = []
  let paramIndex = 1

  if (year && year !== "All") {
    query += ` AND EXTRACT(YEAR FROM po.date) = $${paramIndex++}`
    values.push(year)
  }

  if (month && month !== "All") {
    const monthIndex =
      [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ].indexOf(month) + 1

    query += ` AND EXTRACT(MONTH FROM po.date) = $${paramIndex++}`
    values.push(monthIndex)
  }

  query += `
    GROUP BY s.supplier_id, s.supplier, EXTRACT(YEAR FROM po.date), EXTRACT(MONTH FROM po.date), TO_CHAR(po.date, 'Month')
    ORDER BY year DESC, month DESC, s.supplier
  `

  try {
    const result = await pool.query(query, values)
    return result.rows
  } catch (error) {
    throw error
  }
}

export const getSuppliersByExpenseType = async (expenseTypeId) => {
  const query = `
    SELECT s.supplier_id, s.supplier, s.representative, s.email, s.cellnum
    FROM suppliers s
    JOIN supplier_expense_types set ON s.supplier_id = set.se_id
    WHERE set.expense_type_id = $1 AND s.status = true
    ORDER BY s.supplier
  `

  try {
    const result = await pool.query(query, [expenseTypeId])
    return result.rows
  } catch (error) {
    throw error
  }
}

export const calculatePurchaseOrder = (quantity, unitPrice) => {
  const qty = Number(quantity) || 0
  const price = Number(unitPrice) || 0

  const amount = qty * price
  const subtotal = amount
  const vat = subtotal * 0.15
  const total = subtotal + vat

  return {
    amount: amount.toFixed(2),
    subtotal: subtotal.toFixed(2),
    vat: vat.toFixed(2),
    total: total.toFixed(2),
  }
}

export const createPurchaseOrder = async ({
  expenseTypeId,
  supplierId,
  regNo,
  attentionTo,
  receivedBy,
  quantity,
  description,
  subbie,
  date,
  truckid,
}) => {
  const currentDate = new Date()
  const datePrefix = `PO-${currentDate.getFullYear()}${(currentDate.getMonth() + 1)
    .toString()
    .padStart(2, "0")}${currentDate.getDate().toString().padStart(2, "0")}`

  const latestPoQuery = `
    SELECT ponum 
    FROM purchase_orders 
    WHERE ponum LIKE $1 
    ORDER BY ponum DESC 
    LIMIT 1
  `

  const latestPoResult = await pool.query(latestPoQuery, [`${datePrefix}%`])

  let sequenceNumber = 1
  if (latestPoResult.rows.length > 0) {
    const latestPoNum = latestPoResult.rows[0].ponum
    const latestSequence = Number.parseInt(latestPoNum.split("-")[2], 10)
    sequenceNumber = latestSequence + 1
  }

  const poNum = `${datePrefix}-${sequenceNumber.toString().padStart(3, "0")}`

  const query = `
    INSERT INTO purchase_orders (
      expense_type_id, supplier_id, reg_no, attention_to, received_by,
      quantity, unit_price, description, subbie, date, ponum, total, truckid
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING po_id, truckid
  `

  const values = [
    expenseTypeId,
    supplierId,
    regNo,
    attentionTo,
    receivedBy,
    expenseTypeId === 5 ? 0 : quantity,
    0,
    description,
    subbie,
    date || new Date().toISOString().split("T")[0],
    poNum,
    0,
    expenseTypeId === 5 ? truckid : null,
  ]

  try {
    console.log("Inserting purchase order with values:", values)
    const result = await pool.query(query, values)
    return { poId: result.rows[0].po_id, poNum, truckid: result.rows[0].truckid }
  } catch (error) {
    console.error("Error in createPurchaseOrder:", error)
    throw error
  }
}

export const createMultiplePurchaseOrders = async ({
  supplierId,
  date,
  attentionTo,
  receivedBy,
  regNo,
  subbie,
  lineItems,
}) => {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const currentDate = new Date()
    const datePrefix = `PO-${currentDate.getFullYear()}${(currentDate.getMonth() + 1)
      .toString()
      .padStart(2, "0")}${currentDate.getDate().toString().padStart(2, "0")}`

    const latestPoQuery = `
      SELECT ponum 
      FROM purchase_orders 
      WHERE ponum LIKE $1 
      ORDER BY ponum DESC 
      LIMIT 1
    `

    const latestPoResult = await client.query(latestPoQuery, [`${datePrefix}%`])

    let sequenceNumber = 1
    if (latestPoResult.rows.length > 0) {
      const latestPoNum = latestPoResult.rows[0].ponum
      const latestSequence = Number.parseInt(latestPoNum.split("-")[2], 10)
      sequenceNumber = latestSequence + 1
    }

    const poNum = `${datePrefix}-${sequenceNumber.toString().padStart(3, "0")}`

    const insertQuery = `
      INSERT INTO purchase_orders (
        expense_type_id, supplier_id, reg_no, attention_to, received_by,
        quantity, unit_price, description, subbie, date, ponum, total, truckid
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING po_id, truckid
    `

    const insertedIds = []

    for (const item of lineItems) {
      console.log(`Raw line item: ${JSON.stringify(item)}`) // Log raw item
      const expenseTypeId = Number(item.expenseTypeId)
      const truckId = expenseTypeId === 5 && item.truckid ? Number(item.truckid) : null
      if (item.expenseTypeId === "5" && !truckId) {
        console.error(`Missing or invalid truckid for fuel expense line item: ${JSON.stringify(item)}`)
        throw new Error("truckid is required for fuel expense purchase orders")
      }
      // Calculate total only once for the entire PO
      const isFirstItem = lineItems.indexOf(item) === 0;
      const totalAmount = 0;

      const values = [
        expenseTypeId,
        supplierId,
        regNo,
        attentionTo,
        receivedBy,
        expenseTypeId === 5 ? 0 : item.quantity,
        0,
        item.description,
        subbie,
        date || new Date().toISOString().split("T")[0],
        poNum,
        totalAmount,  // Only set total for first item
        expenseTypeId === 5 ? truckId : null,
      ]


      console.log("Inserting line item with values:", values)
      const result = await client.query(insertQuery, values)
      insertedIds.push(result.rows[0].po_id)
      console.log("Inserted purchase order, returned truckid:", result.rows[0].truckid)
    }

    await client.query("COMMIT")

    return {
      poNum,
      itemCount: lineItems.length,
      insertedIds,
    }
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Error in createMultiplePurchaseOrders:", error)
    throw error
  } finally {
    client.release()
  }
}

export const getCompanyOwnedTrucks = async () => {
  const query = `
    SELECT 
      m5truckskey AS truckid, 
      truckregnum 
    FROM m5_trucks
    WHERE is_subcontractor IS DISTINCT FROM TRUE AND status= true
    ORDER BY truckregnum
  `
  const result = await pool.query(query)
  return result.rows
}

export const getPurchaseOrderList = async (supplierId, expenseTypeId, fromDate, toDate, poId, ponum) => {
  let query = `
    SELECT 
      po.ponum,
      po.date,
      s.supplier,
      s.supplier_id,
      e.expense,
      po.subbie,
      po.attention_to,
      po.received_by,
      po.reg_no,
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'po_id', po.po_id,
          'description', po.description,
          'quantity', po.quantity,
          'truckid', po.truckid,
'truckregnum', t.truckregnum
        )
      ) AS line_items
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.supplier_id
    JOIN expense_types e ON po.expense_type_id = e.id
    LEFT JOIN m5_trucks t ON po.truckid = t.m5truckskey
    WHERE 1=1
  `

  const values = []
  let paramIndex = 1

  if (poId) {
    query += ` AND po.po_id = $${paramIndex++}`
    values.push(poId)
  }

  if (ponum) {
    query += ` AND po.ponum = $${paramIndex++}`
    values.push(ponum)
  }

  if (supplierId) {
    query += ` AND po.supplier_id = $${paramIndex++}`
    values.push(supplierId)
  }

  if (expenseTypeId) {
    query += ` AND po.expense_type_id = $${paramIndex++}`
    values.push(expenseTypeId)
  }

  if (fromDate) {
    query += ` AND po.date >= $${paramIndex++}`
    values.push(fromDate)
  }

  if (toDate) {
    query += ` AND po.date <= $${paramIndex++}`
    values.push(toDate)
  }

  query += ` 
GROUP BY 
  po.ponum, po.date, s.supplier, s.supplier_id, e.expense,
  po.subbie, po.attention_to, po.received_by, po.reg_no

    ORDER BY po.date DESC`

  try {
    const result = await pool.query(query, values)
    return result.rows
  } catch (error) {
    throw error
  }
}