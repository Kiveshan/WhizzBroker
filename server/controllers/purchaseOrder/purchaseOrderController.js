import {
  getPurchaseOrders,
  getExpenseTypes,
  getStatements,
  getSupplierSummary,
  getSuppliersByExpenseType,
  calculatePurchaseOrder,
  createPurchaseOrder,
  createMultiplePurchaseOrders, // New function
  getPurchaseOrderList,
  getCompanyOwnedTrucks,
  getPurchaseOrderByPonum
} from "../../models/purchaseOrder/purchaseOrderModel.js"
import { s3, bucketName } from "../../utils/s3-config.js"
import path from "path"
import { v4 as uuidv4 } from "uuid"
import { pool } from "../../config/database.js"
import { getSignedUrl } from "../../utils/s3-config.js"

const safeDeleteS3Key = async (key) => {
  if (!key) return
  try {
    await s3
      .deleteObject({
        Bucket: bucketName,
        Key: key,
      })
      .promise()
  } catch (err) {
    console.error(`Failed to delete S3 object ${key}:`, err)
  }
}

const deleteS3Prefix = async (prefix) => {
  if (!prefix) return

  let continuationToken = undefined
  try {
    do {
      const listResp = await s3
        .listObjectsV2({
          Bucket: bucketName,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
        .promise()

      const keys = (listResp.Contents || []).map((o) => ({ Key: o.Key }))
      if (keys.length > 0) {
        await s3
          .deleteObjects({
            Bucket: bucketName,
            Delete: { Objects: keys, Quiet: true },
          })
          .promise()
      }

      continuationToken = listResp.IsTruncated ? listResp.NextContinuationToken : undefined
    } while (continuationToken)
  } catch (err) {
    console.error(`Failed to delete S3 prefix ${prefix}:`, err)
  }
}

export const getPurchaseOrdersHandler = async (req, res) => {
  try {
    const purchaseOrders = await getPurchaseOrders()
    res.json(purchaseOrders)
  } catch (error) {
    console.error("Error fetching purchase orders:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

export const deletePurchaseOrderByPonumHandler = async (req, res) => {
  const { ponum } = req.params
  if (!ponum) {
    return res.status(400).json({ error: "Missing purchase order number" })
  }

  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    const poRows = await client.query(
      `SELECT slip_s3key FROM purchase_orders WHERE ponum = $1`,
      [ponum],
    )

    if (poRows.rows.length === 0) {
      await client.query("ROLLBACK")
      return res.status(404).json({ error: "Purchase order not found" })
    }

    const slipKeys = [...new Set(poRows.rows.map((r) => r.slip_s3key).filter(Boolean))]

    const expenseRows = await client.query(
      `SELECT s3key FROM expenses_m2 WHERE orderno::text = $1`,
      [ponum],
    )
    const expenseSlipKeys = [...new Set(expenseRows.rows.map((r) => r.s3key).filter(Boolean))]

    await client.query(`DELETE FROM expenses_m2 WHERE orderno::text = $1`, [ponum])
    await client.query(`DELETE FROM purchase_orders WHERE ponum = $1`, [ponum])

    await client.query("COMMIT")

    await Promise.all(slipKeys.map((k) => safeDeleteS3Key(k)))
    await Promise.all(expenseSlipKeys.map((k) => safeDeleteS3Key(k)))
    await deleteS3Prefix(`purchaseOrders/${ponum}/`)

    res.json({ success: true, message: "Purchase order deleted" })
  } catch (error) {
    try {
      await client.query("ROLLBACK")
    } catch (rollbackErr) {
      console.error("Rollback failed:", rollbackErr)
    }

    console.error("Error deleting purchase order:", error)
    res.status(500).json({ error: "Failed to delete purchase order" })
  } finally {
    client.release()
  }
}

export const getPurchaseOrderByPonumHandler = async (req, res) => {
  try {
    const { ponum } = req.params;
    const purchaseOrder = await getPurchaseOrderByPonum(ponum);
    
    if (!purchaseOrder) {
      return res.status(404).json({ error: "Purchase order not found" });
    }
    
    res.json(purchaseOrder);
  } catch (error) {
    console.error("Error fetching purchase order:", error);
    res.status(500).json({ error: "Failed to fetch purchase order" });
  }
};
export const uploadPurchaseOrderSlipHandler = async (req, res) => {
  const { ponum, expenseCost, expenseType, truckRegNum, invoiceNumber, documentFrom, driverId, vat } = req.body
  const file = req.file

  if (!ponum || !expenseCost || !file || !invoiceNumber) {
    return res.status(400).json({ error: "Missing required fields" })
  }

  // Generate S3 key based on expense type
  let folderKey;
  let uniqueFileName;
  const fileExt = path.extname(file.originalname);

  if (expenseType === "5" || expenseType === 5) {
    // Fuel expenses go to trucks folder
    folderKey = `Trucks/${truckRegNum}`;
    uniqueFileName = `${truckRegNum}-${uuidv4()}${fileExt}`;
  } else {
    // Other purchase orders go to purchaseOrders folder
    folderKey = `purchaseOrders/${ponum}`;
    uniqueFileName = `${ponum}-${uuidv4()}${fileExt}`;
  }

  const s3Key = `${folderKey}/${uniqueFileName}`;

  try {
    // Upload to S3
    await s3
      .putObject({
        Bucket: bucketName,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
      .promise()
await pool.query(
  `UPDATE purchase_orders SET slip_s3key = $1, invoice_number = $2, vat = $3 WHERE ponum = $4`,
  [s3Key, invoiceNumber, vat ? parseFloat(vat) : null, ponum]
)

// Update total only for the first record of this PONUM
await pool.query(
  `UPDATE purchase_orders 
   SET total = $1 
   WHERE ponum = $2 AND po_id = (
     SELECT MIN(po_id) FROM purchase_orders WHERE ponum = $2
   )`,
  [parseFloat(expenseCost), ponum]
)

    // If this is a fuel expense (expenseType = 5), also save to expenses_m2 table
    if (expenseType === "5" || expenseType === 5) {
      const truckId = req.body.truckId;
      const uploadDate = new Date().toISOString().split("T")[0];
      
      // Get document source info
      let documentSource = documentFrom || "Controller";
      let userId = null;

      if (documentFrom === "Driver" && driverId) {
        try {
          const driverResult = await pool.query(
            "SELECT CONCAT(name, ' ', surname) as fullname FROM m5_employee WHERE userid = $1",
            [parseInt(driverId)]
          );
          if (driverResult.rows.length > 0) {
            documentSource = driverResult.rows[0].fullname;
            userId = parseInt(driverId);
          }
        } catch (driverErr) {
          console.error("Error fetching driver name:", driverErr);
        }
      } else if (documentFrom === "Manager") {
        try {
          const managerResult = await pool.query(
            "SELECT * FROM usertable WHERE roleid = 1 AND userid = 1"
          );
          if (managerResult.rows.length > 0) {
            documentSource = `${managerResult.rows[0].name} ${managerResult.rows[0].surname}`;
            userId = managerResult.rows[0].userid;
          }
        } catch (managerErr) {
          console.error("Error fetching manager name:", managerErr);
        }
      } else if (documentFrom === "Controller") {
        try {
          const controllerResult = await pool.query(
            "SELECT userid, CONCAT(name, ' ', surname) as fullname FROM m5_employee WHERE roleid = 2 LIMIT 1"
          );
          if (controllerResult.rows.length > 0) {
            documentSource = controllerResult.rows[0].fullname;
            userId = controllerResult.rows[0].userid;
          }
        } catch (controllerErr) {
          console.error("Error fetching controller name:", controllerErr);
        }
      }

      // Insert into expenses_m2 table
      try {
        const expenseQuery = `
          INSERT INTO expenses_m2 
          (type, documentfrom, expensecost, description, slipname, s3key, slipuploaddate, truckid, driverid, orderno)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (orderno)
          DO UPDATE SET
            type = EXCLUDED.type,
            documentfrom = EXCLUDED.documentfrom,
            expensecost = EXCLUDED.expensecost,
            description = EXCLUDED.description,
            slipname = EXCLUDED.slipname,
            s3key = EXCLUDED.s3key,
            slipuploaddate = EXCLUDED.slipuploaddate,
            truckid = EXCLUDED.truckid,
            driverid = EXCLUDED.driverid
          RETURNING ekey
        `;
        
        const expenseValues = [
          "fuel",
          documentSource,
          parseFloat(expenseCost),
          `Fuel expense for PO: ${ponum}`,
          file.originalname,
          s3Key,
          uploadDate,
          truckId ? parseInt(truckId) : null,
          userId,
          ponum
        ];

        const expenseResult = await pool.query(expenseQuery, expenseValues);
        console.log("Expense record upserted with ID:", expenseResult.rows[0].ekey);
        
      } catch (expenseError) {
        console.error("Error creating expense record:", expenseError);
      }
    }

    res.status(200).json({
      success: true,
      message: "PO document uploaded and purchase order updated",
      s3Key,
    })
  } catch (err) {
    console.error("Upload PO slip failed:", err)
    res.status(500).json({ error: "Failed to upload and update purchase order" })
  }
}
export const getCompanyOwnedTrucksHandler = async (req, res) => {
  try {
    const trucks = await getCompanyOwnedTrucks()
    res.json(trucks)
  } catch (error) {
    console.error("Error fetching company trucks:", error)
    res.status(500).json({ error: "Failed to fetch company trucks" })
  }
}

export const getExpenseTypesHandler = async (req, res) => {
  try {
    console.log("Fetching expense types from database...")
    const expenseTypes = await getExpenseTypes()
    console.log(`Found ${expenseTypes.length} expense types`)
    res.json(expenseTypes)
  } catch (error) {
    console.error("Error fetching expense types:", error)
    res.status(500).json({
      error: "Failed to fetch expense types",
      message: error.message,
    })
  }
}

export const getStatementsHandler = async (req, res) => {
  try {
    const { supplierId, fromDate, toDate } = req.query
    console.log("Received request for /api/statements with params:", {
      supplierId,
      fromDate,
      toDate,
    })

    const statements = await getStatements(supplierId, fromDate, toDate)
    console.log("Query result:", statements.length, "rows found")

    res.json(statements)
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch statement data: ${error.message}` })
  }
}

export const getSupplierSummaryHandler = async (req, res) => {
  try {
    const { year, month } = req.query
    console.log("Fetching supplier statements with params:", { year, month })

    const summary = await getSupplierSummary(year, month)
    console.log("Supplier summary result:", summary.length, "supplier-month combinations found")

    res.json(summary)
  } catch (error) {
    console.error("Error fetching supplier statements:", error)
    res.status(500).json({ error: `Failed to fetch supplier statements: ${error.message}` })
  }
}

export const getSuppliersByExpenseTypeHandler = async (req, res) => {
  try {
    const { expenseTypeId } = req.params
    const suppliers = await getSuppliersByExpenseType(expenseTypeId)
    res.json(suppliers)
  } catch (error) {
    console.error("Error fetching suppliers:", error)
    res.status(500).json({ error: "Failed to fetch suppliers" })
  }
}

export const calculatePurchaseOrderHandler = (req, res) => {
  try {
    const { quantity, unitPrice } = req.body
    const result = calculatePurchaseOrder(quantity, unitPrice)
    res.json(result)
  } catch (error) {
    console.error("Error calculating amounts:", error)
    res.status(500).json({ error: "Failed to calculate amounts" })
  }
}

export const createPurchaseOrderHandler = async (req, res) => {
  try {
    const {
      expenseTypeId,
      supplierId,
      regNo,
      attentionTo,
      receivedBy,
      quantity,
      unitPrice,
      description,
      subbie,
      date,
      total,
    } = req.body

    const result = await createPurchaseOrder({
      expenseTypeId,
      supplierId,
      regNo,
      attentionTo,
      receivedBy,
      quantity,
      unitPrice,
      description,
      subbie,
      date,
      total,
    })

    res.status(201).json({
      success: true,
      poId: result.poId,
      poNum: result.poNum,
    })
  } catch (error) {
    console.error("Error creating purchase order:", error)
    res.status(500).json({ error: "Failed to create purchase order" })
  }
}

// New handler for multiple line items
export const createMultiplePurchaseOrdersHandler = async (req, res) => {
  try {
    const { supplier, date, attentionTo, receivedBy, regNo, subbie, lineItems, totals } = req.body

    const result = await createMultiplePurchaseOrders({
      supplierId: supplier,
      date,
      attentionTo,
      receivedBy,
      regNo,
      subbie,
      lineItems,
      totals,
    })

    res.status(201).json({
      success: true,
      poNum: result.poNum,
      itemCount: result.itemCount,
    })
  } catch (error) {
    console.error("Error creating multiple purchase orders:", error)
    res.status(500).json({ error: "Failed to create purchase order" })
  }
}

export const getPurchaseOrderListHandler = async (req, res) => {
  try {
    const { supplierId, expenseTypeId, fromDate, toDate, poId, ponum } = req.query // ADD: ponum to query params

    const purchaseOrders = await getPurchaseOrderList(supplierId, expenseTypeId, fromDate, toDate, poId, ponum)

    res.json(purchaseOrders)
  } catch (error) {
    console.error("Error fetching purchase orders:", error)
    res.status(500).json({ error: "Failed to fetch purchase orders" })
  }
}
export const checkSlipStatusHandler = async (req, res) => {
  try {
    const { ponum } = req.params;
    const query = `
      SELECT slip_s3key, invoice_number 
      FROM purchase_orders 
      WHERE ponum = $1
    `;
    const result = await pool.query(query, [ponum]);
    
    if (result.rows.length === 0) {
      return res.json({ hasSlip: false });
    }
    
    const slip = result.rows[0];
    res.json({ 
      hasSlip: !!slip.slip_s3key,
      s3Key: slip.slip_s3key,
      invoiceNumber: slip.invoice_number
    });
  } catch (error) {
    console.error('Error checking slip status:', error);
    res.status(500).json({ error: 'Failed to check slip status' });
  }
};

export const viewSlipHandler = async (req, res) => {
  try {
    const { ponum } = req.params;
    const query = `
      SELECT slip_s3key 
      FROM purchase_orders 
      WHERE ponum = $1 AND slip_s3key IS NOT NULL
    `;
    const result = await pool.query(query, [ponum]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No slip found for this PO' });
    }
    
    const s3Key = result.rows[0].slip_s3key;
    const signedUrl = getSignedUrl(s3Key, 3600); // 1 hour expiry
    
    res.json({ 
      success: true, 
      url: signedUrl,
      s3Key: s3Key
    });
  } catch (error) {
    console.error('Error getting slip URL:', error);
    res.status(500).json({ error: 'Failed to get slip URL' });
  }
};