import express from "express";
import { getDriversHandler } from "../../controllers/drivers/driverController.js";

const router = express.Router();

router.get("/employees/drivers", getDriversHandler);

export default router;
