import express from "express";
import { getAllClientsHandler } from "../../controllers/clients/clientController.js";

const router = express.Router();

router.get("/api/clients", getAllClientsHandler);

export default router;
