import express from "express";
import {
  getExpensesByTruckHandler,
  uploadFuelExpenseHandler,
  getExpenseDocumentHandler,
} from "../../controllers/fuel/expenseController.js";
import { uploadFuelExpense } from "../../utils/s3-config.js";

const router = express.Router();

// Middleware to handle multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError || err) {
    console.error("Error in multer upload:", err);
    console.error("Error stack:", err.stack);
    console.error("Error code:", err.code);
    console.error("Error name:", err.name);

    return res.status(400).json({
      success: false,
      message: "File upload error",
      error: err.message,
      code: err.code || "unknown",
      name: err.name || "unknown",
    });
  }
  next();
};

router.get("/truck/:truckId", getExpensesByTruckHandler);
router.post(
  "/",
  uploadFuelExpense.single("slip"),
  handleMulterError,
  uploadFuelExpenseHandler
);
router.get("/document/:id", getExpenseDocumentHandler);

export default router;
