import { pool } from "../../config/database.js";
import { s3, getSignedUrl } from "../../utils/s3-config.js";
import { uploadFuelSlipToS3 } from "../../utils/dbUtils.js";
import {
  getExpensesByTruckId,
  insertFuelExpense,
  insertFuelExpenseWithoutS3Key,
  getExpenseDocumentById,
  getPOExpensesByTruckId
} from "../../models/fuel/expenseModel.js";

const getExpensesByTruckHandler = async (req, res) => {
  try {
    const { truckId } = req.params;
    console.log(`Getting expenses for truck ID: ${truckId}`);
    
    // Use the new function that includes PO data
    const expenses = await getPOExpensesByTruckId(truckId);
    
    console.log(`Found ${expenses.length} expenses for truck ID: ${truckId}`);
    res.json(expenses);
  } catch (error) {
    console.error("Error fetching expenses for truck:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch expenses",
      error: error.message,
    });
  }
};

const uploadFuelExpenseHandler = async (req, res) => {
  console.log("S3 expense upload route accessed");
  console.log("Request body:", req.body);
  console.log("File:", req.file);

  try {
    const { documentFrom, expenseCost, orderno, driverId, truckId } = req.body;
    const uploadDate = new Date().toISOString().split("T")[0];

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    if (!orderno) {
      return res.status(400).json({
        success: false,
        message: "Order number is required",
      });
    }

    const parsedOrderNo = Number.parseInt(orderno);
    if (isNaN(parsedOrderNo)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order number format",
      });
    }

    const s3Key = await uploadFuelSlipToS3(s3, req.file, truckId);
    const slipName = req.file.originalname;
    console.log("S3 Upload successful:", { slipName, s3Key });

    const cost = Number.parseFloat(expenseCost.trim());
    if (isNaN(cost)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense cost format",
      });
    }

    const parsedTruckId = truckId ? Number.parseInt(truckId) : null;
    if (truckId && isNaN(parsedTruckId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid truck ID format",
      });
    }

    const parsedDriverId = driverId ? Number.parseInt(driverId) : null;
    if (driverId && isNaN(parsedDriverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID format",
      });
    }

    let documentSource = documentFrom;
    let userId = null;

    if (documentFrom === "Driver" && driverId) {
      try {
        const driverResult = await pool.query(
          "SELECT CONCAT(name, ' ', surname) as fullname FROM m5_employee WHERE userid = $1",
          [parsedDriverId]
        );

        if (driverResult.rows.length > 0) {
          documentSource = driverResult.rows[0].fullname;
          userId = parsedDriverId;
        }
      } catch (driverErr) {
        console.error("Error fetching driver name:", driverErr);
      }
    } else if (documentFrom === "Manager") {
      try {
        console.log("Manager selected, querying usertable for manager");

        const managerResult = await pool.query(
          "SELECT * FROM usertable WHERE roleid = 1 AND userid = 1"
        );

        console.log("Manager query result:", managerResult.rows);

        if (managerResult.rows.length > 0) {
          documentSource = `${managerResult.rows[0].name} ${managerResult.rows[0].surname}`;
          userId = managerResult.rows[0].userid;
          console.log("Manager found:", documentSource, "userId:", userId);
        } else {
          console.error("No manager found in usertable with roleid = 1");
          documentSource = "Manager";
          userId = null;
        }
      } catch (managerErr) {
        console.error("Error fetching manager name:", managerErr);
        documentSource = "Manager";
        userId = null;
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

    try {
      const result = await insertFuelExpense({
        type: "fuel",
        documentFrom: documentSource,
        expenseCost: cost,
        slipName,
        s3Key,
        slipUploadDate: uploadDate,
        truckId: parsedTruckId,
        driverId: userId,
        orderno: parsedOrderNo,
      });
      console.log("Expense created successfully with ID:", result.ekey);

      res.status(201).json({
        success: true,
        message: "Expense created successfully",
        data: {
          ekey: result.ekey,
          slipName,
          s3Key,
        },
      });
    } catch (error) {
      if (
        error.message.includes(
          'column "s3key" of relation "expenses_m2" does not exist'
        )
      ) {
        console.error("s3key column does not exist. Trying without s3key.");

        try {
          const fallbackResult = await insertFuelExpenseWithoutS3Key({
            type: "fuel",
            documentFrom: documentSource,
            expenseCost: cost,
            slipName,
            slipUploadDate: uploadDate,
            truckId: parsedTruckId,
            driverId: userId,
            orderno: parsedOrderNo,
          });
          console.log(
            "Expense created successfully with ID (without s3key):",
            fallbackResult.ekey
          );

          res.status(201).json({
            success: true,
            message: "Expense created successfully",
            data: {
              ekey: fallbackResult.ekey,
              slipName,
              warning:
                "S3 key not stored in database. Consider adding s3key column to expenses_m2 table for better URL management.",
            },
          });
        } catch (innerError) {
          if (
            innerError.message.includes(
              'column "slipurl" of relation "expenses_m2" does not exist'
            )
          ) {
            console.error(
              "slipurl column does not exist. Inserting without slipurl and s3key."
            );

            const basicResult = await insertFuelExpenseWithoutS3Key({
              type: "fuel",
              documentFrom: documentSource,
              expenseCost: cost,
              slipName,
              slipUploadDate: uploadDate,
              truckId: parsedTruckId,
              driverId: userId,
              orderno: parsedOrderNo,
            });
            console.log(
              "Expense created successfully with ID (basic):",
              basicResult.ekey
            );

            res.status(201).json({
              success: true,
              message: "Expense created successfully (without S3 URL storage)",
              data: {
                ekey: basicResult.ekey,
                slipName,
                warning:
                  "S3 URL and key not stored in database. Please add s3key columns to expenses_m2 table.",
              },
            });
          } else {
            throw innerError;
          }
        }
      } else if (
        error.message.includes(
          'column "slipurl" of relation "expenses_m2" does not exist'
        )
      ) {
        console.error(
          "slipurl column does not exist. Inserting without slipurl."
        );

        const fallbackResult = await insertFuelExpenseWithoutS3Key({
          type: "fuel",
          documentFrom: documentSource,
          expenseCost: cost,
          slipName,
          slipUploadDate: uploadDate,
          truckId: parsedTruckId,
          driverId: userId,
          orderno: parsedOrderNo,
        });

        res.status(201).json({
          success: true,
          message: "Expense created successfully (without S3 URL storage)",
          data: {
            ekey: fallbackResult.ekey,
            slipName,
            warning:
              "S3 URL not stored in database. Please add slipurl column to expenses_m2 table.",
          },
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error("Error creating expense:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create expense",
      error: error.message,
    });
  }
};

const getExpenseDocumentHandler = async (req, res) => {
  try {
    const { id } = req.params;
    
    // First try to get from expenses_m2 table
    const document = await getExpenseDocumentById(id);
    
    if (document.success && document.data.s3key) {
      const { slipname, s3key } = document.data;
      const url = getSignedUrl(s3key, 3600);
      
      let fileType = "image";
      if (slipname) {
        const extension = slipname.split(".").pop().toLowerCase();
        if (["pdf"].includes(extension)) {
          fileType = "pdf";
        }
      }
      
      return res.json({
        success: true,
        url,
        name: slipname,
        fileType,
      });
    }
    
    // If not found in expenses_m2, try to find PO slip
    try {
      const poQuery = `
        SELECT po.slip_s3key, po.ponum 
        FROM purchase_orders po
        JOIN expenses_m2 e ON e.orderno = po.ponum::text
        WHERE e.ekey = $1 AND po.slip_s3key IS NOT NULL
      `;
      const poResult = await pool.query(poQuery, [id]);
      
      if (poResult.rows.length > 0) {
        const s3key = poResult.rows[0].slip_s3key;
        const url = getSignedUrl(s3key, 3600);
        
        return res.json({
          success: true,
          url,
          name: `PO-${poResult.rows[0].ponum}-slip`,
          fileType: "pdf",
        });
      }
    } catch (poError) {
      console.log("No PO slip found for this expense");
    }
    
    // If neither found, return error
    return res.status(404).json({
      success: false,
      message: "Document not found",
    });
    
  } catch (error) {
    console.error("Error fetching document:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch document",
      error: error.message,
    });
  }
};

export {
  getExpensesByTruckHandler,
  uploadFuelExpenseHandler,
  getExpenseDocumentHandler,
};
